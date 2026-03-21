const { Server } = require('@modelcontextprotocol/sdk/server/index.js')
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js')
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// .env.local をロード
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim()
    }
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const server = new Server(
  { name: 'jva-crm', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_companies',
      description: '企業一覧を取得する（status・nameでフィルタ可）',
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'フィルタするステータス（untouched/step1/approved/step2/followup/negotiating/listed/closed）' },
          name: { type: 'string', description: '会社名の部分一致検索' },
          limit: { type: 'number', description: '取得件数（デフォルト50）' },
        },
      },
    },
    {
      name: 'get_company',
      description: '企業の詳細情報とアウトリーチ履歴を取得する',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '企業のUUID' },
          name: { type: 'string', description: '会社名（完全一致）' },
        },
      },
    },
    {
      name: 'add_company',
      description: '企業を新規追加する',
      inputSchema: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          linkedin_url: { type: 'string' },
          contact_name: { type: 'string' },
          email: { type: 'string' },
          contact_status: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
    {
      name: 'update_company',
      description: '企業情報・ステータスを更新する',
      inputSchema: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: '企業のUUID' },
          name: { type: 'string' },
          linkedin_url: { type: 'string' },
          contact_name: { type: 'string' },
          email: { type: 'string' },
          contact_status: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
    {
      name: 'queue_outreach',
      description: 'アウトリーチをキューに登録する',
      inputSchema: {
        type: 'object',
        required: ['company_id', 'type', 'message'],
        properties: {
          company_id: { type: 'string' },
          type: { type: 'string', enum: ['email', 'linkedin_dm', 'form'] },
          message: { type: 'string' },
        },
      },
    },
    {
      name: 'sync_markdown',
      description: 'outreach-tracker.md と Supabase を双方向同期する',
      inputSchema: {
        type: 'object',
        properties: {
          direction: { type: 'string', enum: ['md_to_db', 'db_to_md', 'both'], default: 'both' },
        },
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'list_companies': {
        let query = supabase.from('companies').select('*')
        if (args.status) query = query.eq('contact_status', args.status)
        if (args.name) query = query.ilike('name', `%${args.name}%`)
        query = query.order('created_at', { ascending: false }).limit(args.limit ?? 50)
        const { data, error } = await query
        if (error) throw error
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
      }

      case 'get_company': {
        let query = supabase.from('companies').select('*, outreach_history(*)')
        if (args.id) query = query.eq('id', args.id)
        else if (args.name) query = query.eq('name', args.name)
        const { data, error } = await query.single()
        if (error) throw error
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
      }

      case 'add_company': {
        const { data, error } = await supabase.from('companies').insert(args).select().single()
        if (error) throw error
        return { content: [{ type: 'text', text: `Added: ${JSON.stringify(data, null, 2)}` }] }
      }

      case 'update_company': {
        const { id, ...updates } = args
        const { data, error } = await supabase.from('companies').update(updates).eq('id', id).select().single()
        if (error) throw error
        return { content: [{ type: 'text', text: `Updated: ${JSON.stringify(data, null, 2)}` }] }
      }

      case 'queue_outreach': {
        const { data, error } = await supabase.from('outreach_history').insert({
          company_id: args.company_id,
          type: args.type,
          message: args.message,
          status: 'queued',
        }).select().single()
        if (error) throw error
        return { content: [{ type: 'text', text: `Queued: ${JSON.stringify(data, null, 2)}` }] }
      }

      case 'sync_markdown': {
        const direction = args.direction ?? 'both'
        const workspacePath = process.env.WORKSPACE_PATH ?? '/Users/sorasasaki/claude-workspace'
        const trackerPath = path.join(workspacePath, 'company_jva/dep_IB/sales/outreach-tracker.md')

        const STATUS_MAP = {
          '未着手': 'untouched', 'Step1': 'step1', '承認済': 'approved',
          'Step2': 'step2', 'FU1': 'followup', 'FU2': 'followup',
          '返信あり': 'negotiating', '商談中': 'negotiating',
          '掲載完了': 'listed', 'クローズ': 'closed',
        }

        let results = []

        if (direction === 'md_to_db' || direction === 'both') {
          const content = fs.readFileSync(trackerPath, 'utf-8')
          const lines = content.split('\n')
          let count = 0
          for (const line of lines) {
            if (!line.startsWith('|')) continue
            const cells = line.split('|').map(c => c.trim()).filter(Boolean)
            if (cells[0] === '#' || cells[0].startsWith('-') || !/^\d+$/.test(cells[0])) continue
            const name = cells[1]?.replace(/\*\*/g, '') ?? ''
            const step = (cells[4] ?? cells[3] ?? '未着手').replace(/\*\*/g, '')
            const status = STATUS_MAP[step] ?? 'untouched'
            const notes = cells[cells.length - 1] ?? ''
            const emailMatch = notes.match(/[\w.-]+@[\w.-]+\.\w+/)
            await supabase.from('companies').upsert(
              { name, contact_status: status, notes: notes || null, email: emailMatch?.[0] ?? null },
              { onConflict: 'name' }
            )
            count++
          }
          results.push(`md_to_db: ${count} companies synced`)
        }

        if (direction === 'db_to_md' || direction === 'both') {
          results.push('db_to_md: CRM is source of truth — use sync API for full sync')
        }

        return { content: [{ type: 'text', text: results.join('\n') }] }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (err) {
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true }
  }
})

const transport = new StdioServerTransport()
server.connect(transport).then(() => {
  process.stderr.write('JVA CRM MCP Server started\n')
})
