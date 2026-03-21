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

const emailWorker = require('./workers/email')
const formWorker = require('./workers/form')
const linkedinWorker = require('./workers/linkedin')

let processing = false

async function processQueue() {
  if (processing) return
  processing = true

  try {
    const { data: items } = await supabase
      .from('outreach_history')
      .select('*, companies(*)')
      .eq('status', 'queued')
      .limit(5)

    for (const item of (items ?? [])) {
      console.log(`Processing ${item.type} for ${item.companies?.name}`)

      let success = false
      try {
        switch (item.type) {
          case 'email':
            success = await emailWorker.send(item)
            break
          case 'form':
            success = await formWorker.send(item)
            break
          case 'linkedin_dm':
            success = await linkedinWorker.send(item)
            break
        }
      } catch (err) {
        console.error(`Worker error for ${item.id}:`, err.message)
      }

      await supabase
        .from('outreach_history')
        .update({
          status: success ? 'sent' : 'failed',
          sent_at: success ? new Date().toISOString() : null
        })
        .eq('id', item.id)
    }
  } finally {
    processing = false
  }
}

console.log('JVA CRM Daemon started (5s polling)')
setInterval(processQueue, 5000)
processQueue()
