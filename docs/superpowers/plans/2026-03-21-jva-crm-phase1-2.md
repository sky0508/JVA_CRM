# JVA CRM Phase 1-2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supabase + Next.js で企業 CRM を構築し、MCP サーバー経由で Claude Code から CRUD 操作できる状態にする。

**Architecture:** バックエンドファースト。DB スキーマ → インポート → MCP → UI の順で実装し、MCP が動いた時点で中間ゴール達成とする。UI は MCP 動作確認後に実装する。

**Tech Stack:** Next.js 15 (App Router, TypeScript, Tailwind CSS), Supabase JS (PostgreSQL), @modelcontextprotocol/sdk, Node.js 22+, Vitest

---

## スコープ

このプランは **Phase 1（基盤）+ Phase 2（MCP連携）** をカバーする。
Phase 3（自動化デーモン）は別プランで扱う。

---

## ファイル構成

```
~/jva-crm/
├── app/
│   ├── (dashboard)/
│   │   ├── page.tsx              # 企業テーブルページ
│   │   └── layout.tsx            # ダッシュボードレイアウト
│   ├── api/
│   │   └── companies/
│   │       ├── route.ts          # GET(一覧), POST(追加)
│   │       └── [id]/
│   │           └── route.ts      # GET, PATCH, DELETE
│   ├── components/
│   │   ├── CompanyTable.tsx      # テーブル（ソート・検索・フィルター）
│   │   ├── CompanyDrawer.tsx     # サイドドロワー（詳細・編集）
│   │   └── StatusBadge.tsx       # ステータスバッジ
│   └── layout.tsx                # ルートレイアウト
├── lib/
│   ├── supabase.ts               # クライアントサイド Supabase クライアント
│   ├── supabase-server.ts        # サーバーサイド Supabase クライアント
│   └── types.ts                  # TypeScript 型定義
├── mcp-server/
│   ├── package.json
│   ├── index.js                  # MCP サーバーエントリーポイント
│   └── tools/
│       ├── companies.js          # CRUD ツール
│       └── sync.js               # sync_markdown ツール
├── scripts/
│   └── import-tracker.ts         # outreach-tracker.md → Supabase インポート
├── supabase/
│   └── schema.sql                # DB スキーマ定義
├── __tests__/
│   ├── import-tracker.test.ts    # インポートスクリプトのユニットテスト
│   └── mcp-tools.test.js         # MCP ツールのユニットテスト
├── .env.local.example            # 環境変数テンプレート
└── vitest.config.ts              # テスト設定
```

---

## Task 0: 環境確認

**Files:** なし（確認のみ）

- [ ] **Step 1: Node.js バージョン確認**

```bash
node --version
npm --version
```

Expected: `v20.x.x` 以上。なければ:

```bash
# Homebrew がある場合
brew install node

# または nvm を使う場合
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install --lts
nvm use --lts
```

---

## Task 1: Next.js プロジェクト初期化

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`
- Create: `app/layout.tsx`, `app/globals.css`

- [ ] **Step 1: create-next-app で初期化**

`~/jva-crm/` には `DESIGN.md` と `docs/` だけが存在する。`--yes` でデフォルト設定を使いつつ既存ディレクトリに展開する。

```bash
cd /Users/sorasasaki/jva-crm
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --src-dir=false \
  --import-alias="@/*" \
  --eslint
```

プロンプトが出た場合は全てデフォルト（Enter）でOK。

- [ ] **Step 2: 追加パッケージをインストール**

```bash
npm install @supabase/supabase-js lucide-react
npm install --save-dev vitest @vitest/ui
```

- [ ] **Step 3: vitest 設定ファイルを作成**

`vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

`package.json` の `scripts` に追加:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: .env.local.example を作成**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
WORKSPACE_PATH=/Users/sorasasaki/claude-workspace
```

- [ ] **Step 5: 開発サーバーが起動することを確認**

```bash
npm run dev
```

Expected: `localhost:3000` が開き、Next.js のデフォルト画面が表示される。確認したら Ctrl+C で停止。

- [ ] **Step 6: コミット**

```bash
git init
git add .
git commit -m "chore: initialize Next.js project with TypeScript + Tailwind"
```

---

## Task 2: Supabase プロジェクト作成（ユーザー手動）

**Files:**
- Create: `supabase/schema.sql`
- Create: `.env.local`

- [ ] **Step 1: Supabase プロジェクトを作成（ブラウザ操作）**

1. `https://supabase.com` にログイン
2. "New Project" → プロジェクト名: `jva-crm`、リージョン: `Northeast Asia (Tokyo)` を選択
3. パスワードを設定（メモしておく）
4. "Create new project" をクリック → 2〜3分待つ

- [ ] **Step 2: API Keys を取得**

1. 左サイドバー → `Settings` → `API`
2. 以下をコピー:
   - `Project URL`（例: `https://xxxx.supabase.co`）
   - `anon / public` キー
   - `service_role` キー（"Reveal" をクリック）

- [ ] **Step 3: .env.local を作成**

```bash
cp .env.local.example .env.local
```

`.env.local` に先ほどコピーした値を貼り付ける:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=eyJhbGci...
WORKSPACE_PATH=/Users/sorasasaki/claude-workspace
```

- [ ] **Step 4: schema.sql を作成**

`supabase/schema.sql`:
```sql
-- companies テーブル
CREATE TABLE companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  linkedin_url    text,
  contact_name    text,
  email           text,
  phone           text,
  contact_status  text NOT NULL DEFAULT 'untouched'
    CHECK (contact_status IN (
      'untouched', 'step1', 'approved', 'step2',
      'followup', 'negotiating', 'listed', 'closed'
    )),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- outreach_history テーブル
CREATE TABLE outreach_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('email', 'linkedin_dm', 'form')),
  message     text,
  status      text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'failed', 'replied')),
  sent_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- templates テーブル
CREATE TABLE templates (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type     text NOT NULL CHECK (type IN ('email', 'linkedin_dm', 'form')),
  name     text NOT NULL,
  content  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- インデックス
CREATE INDEX idx_companies_contact_status ON companies(contact_status);
CREATE INDEX idx_outreach_history_company_id ON outreach_history(company_id);
CREATE INDEX idx_outreach_history_status ON outreach_history(status);
```

- [ ] **Step 5: Supabase SQL Editor でスキーマを適用**

1. Supabase ダッシュボード → `SQL Editor` → `New query`
2. `supabase/schema.sql` の内容を貼り付けて実行
3. 左サイドバー → `Table Editor` で3テーブルが作成されていることを確認

- [ ] **Step 6: コミット**

```bash
git add supabase/schema.sql .env.local.example
git commit -m "feat: add Supabase schema (companies, outreach_history, templates)"
```

---

## Task 3: TypeScript 型定義 + Supabase クライアント

**Files:**
- Create: `lib/types.ts`
- Create: `lib/supabase.ts`
- Create: `lib/supabase-server.ts`

- [ ] **Step 1: 型定義を作成**

`lib/types.ts`:
```typescript
export type ContactStatus =
  | 'untouched'
  | 'step1'
  | 'approved'
  | 'step2'
  | 'followup'
  | 'negotiating'
  | 'listed'
  | 'closed'

export type OutreachType = 'email' | 'linkedin_dm' | 'form'
export type OutreachStatus = 'queued' | 'sent' | 'failed' | 'replied'
export type TemplateType = 'email' | 'linkedin_dm' | 'form'

export interface Company {
  id: string
  name: string
  linkedin_url: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  contact_status: ContactStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OutreachHistory {
  id: string
  company_id: string
  type: OutreachType
  message: string | null
  status: OutreachStatus
  sent_at: string | null
  created_at: string
}

export interface Template {
  id: string
  type: TemplateType
  name: string
  content: string
  created_at: string
}

export const STATUS_LABELS: Record<ContactStatus, string> = {
  untouched: '未着手',
  step1: 'Step1',
  approved: '承認済',
  step2: 'Step2',
  followup: 'FU',
  negotiating: '商談中',
  listed: '掲載完了',
  closed: 'クローズ',
}

export const STATUS_COLORS: Record<ContactStatus, string> = {
  untouched: 'bg-gray-100 text-gray-600',
  step1: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  step2: 'bg-indigo-100 text-indigo-700',
  followup: 'bg-yellow-100 text-yellow-700',
  negotiating: 'bg-orange-100 text-orange-700',
  listed: 'bg-purple-100 text-purple-700',
  closed: 'bg-red-100 text-red-600',
}
```

- [ ] **Step 2: クライアントサイド Supabase クライアントを作成**

`lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 3: サーバーサイド Supabase クライアントを作成**

`lib/supabase-server.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}
```

- [ ] **Step 4: コミット**

```bash
git add lib/
git commit -m "feat: add TypeScript types and Supabase clients"
```

---

## Task 4: データインポートスクリプト

既存の `outreach-tracker.md` を Supabase に取り込む。

**Files:**
- Create: `scripts/import-tracker.ts`
- Create: `__tests__/import-tracker.test.ts`

テーブル形式（既存データ）:
```
| # | 会社 | 担当者 | Lang | Step | 承認日 | 1通目 | メモ |
| 1 | ArkEdge Space | 黒田賢太 | JA | Step1 | — | — | Forbes... |
```

ステータスマッピング:
```
未着手 → untouched
Step1  → step1
承認済 → approved  (**承認済** の太字も対応)
Step2  → step2
FU1    → followup
FU2    → followup
返信あり → negotiating
商談中 → negotiating
掲載完了 → listed
クローズ → closed
```

- [ ] **Step 1: パースロジックのテストを書く（失敗することを確認）**

`__tests__/import-tracker.test.ts`:
```typescript
import { parseTrackerRow, mapStatus } from '../scripts/import-tracker'

describe('mapStatus', () => {
  it('Step1 → step1', () => {
    expect(mapStatus('Step1')).toBe('step1')
  })
  it('**承認済** → approved', () => {
    expect(mapStatus('**承認済**')).toBe('approved')
  })
  it('承認済 → approved', () => {
    expect(mapStatus('承認済')).toBe('approved')
  })
  it('FU1 → followup', () => {
    expect(mapStatus('FU1')).toBe('followup')
  })
  it('FU2 → followup', () => {
    expect(mapStatus('FU2')).toBe('followup')
  })
  it('未着手 → untouched', () => {
    expect(mapStatus('未着手')).toBe('untouched')
  })
  it('returns untouched for unknown', () => {
    expect(mapStatus('unknown')).toBe('untouched')
  })
})

describe('parseTrackerRow', () => {
  it('parses a Step1 row', () => {
    const row = '| 1 | ArkEdge Space | 黒田賢太 | JA | Step1 | — | — | Forbes Startup |'
    const result = parseTrackerRow(row)
    expect(result).toEqual({
      name: 'ArkEdge Space',
      contact_name: '黒田賢太',
      contact_status: 'step1',
      notes: 'Forbes Startup',
    })
  })

  it('parses an approved row with bold marker', () => {
    const row = '| 10 | センシンロボティクス | 塚本照明 | JA | **承認済** | 2026-03-16 | — | 中部電力 |'
    const result = parseTrackerRow(row)
    expect(result?.contact_status).toBe('approved')
  })

  it('returns null for non-data rows', () => {
    const row = '| # | 会社 | 担当者 | Lang | Step | 承認日 | 1通目 | メモ |'
    expect(parseTrackerRow(row)).toBeNull()
  })

  it('returns null for separator rows', () => {
    const row = '|---|------|--------|------|------|--------|-------|------|'
    expect(parseTrackerRow(row)).toBeNull()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npm test
```

Expected: `Cannot find module '../scripts/import-tracker'` のようなエラー

- [ ] **Step 3: インポートスクリプトを実装**

`scripts/import-tracker.ts`:
```typescript
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import type { ContactStatus } from '../lib/types'

// --- パース関数（テスト可能なピュア関数として export） ---

const STATUS_MAP: Record<string, ContactStatus> = {
  '未着手': 'untouched',
  'step1': 'step1',
  '承認済': 'approved',
  'step2': 'step2',
  'fu1': 'followup',
  'fu2': 'followup',
  '返信あり': 'negotiating',
  '商談中': 'negotiating',
  '掲載完了': 'listed',
  'クローズ': 'closed',
}

export function mapStatus(raw: string): ContactStatus {
  const cleaned = raw.replace(/\*\*/g, '').trim().toLowerCase()
  return STATUS_MAP[cleaned] ?? STATUS_MAP[raw.replace(/\*\*/g, '').trim()] ?? 'untouched'
}

export function parseTrackerRow(line: string): {
  name: string
  contact_name: string | null
  contact_status: ContactStatus
  notes: string | null
} | null {
  if (!line.startsWith('|')) return null

  const cols = line.split('|').map(c => c.trim()).filter(Boolean)
  if (cols.length < 5) return null

  // ヘッダー行・セパレータ行をスキップ
  if (cols[0] === '#' || cols[0].startsWith('-')) return null
  if (isNaN(Number(cols[0]))) return null

  const name = cols[1]
  const contactName = cols[2] === '—' || cols[2].startsWith('(') ? null : cols[2]
  const statusRaw = cols[4]
  const notes = cols[cols.length - 1] === '—' ? null : cols[cols.length - 1]

  return {
    name,
    contact_name: contactName,
    contact_status: mapStatus(statusRaw),
    notes,
  }
}

// --- メイン実行（直接実行時のみ） ---

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
  const workspacePath = process.env.WORKSPACE_PATH

  if (!supabaseUrl || !supabaseServiceKey || !workspacePath) {
    console.error('Missing env vars. Check .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const trackerPath = path.join(
    workspacePath,
    'company_jva/dep_IB/sales/outreach-tracker.md'
  )

  const content = fs.readFileSync(trackerPath, 'utf-8')
  const lines = content.split('\n')

  const companies = lines
    .map(parseTrackerRow)
    .filter((c): c is NonNullable<typeof c> => c !== null)

  console.log(`Found ${companies.length} companies to import`)

  // 既存データをクリアして再インポート
  const { error: deleteError } = await supabase
    .from('companies')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // 全件削除

  if (deleteError) {
    console.error('Delete error:', deleteError)
    process.exit(1)
  }

  const { error: insertError, data } = await supabase
    .from('companies')
    .insert(companies)
    .select()

  if (insertError) {
    console.error('Insert error:', insertError)
    process.exit(1)
  }

  console.log(`✅ Imported ${data?.length ?? 0} companies`)
}

// node / ts-node で直接実行されたときのみ main() を呼ぶ
if (require.main === module) {
  // .env.local を読み込む
  const dotenv = require('dotenv')
  dotenv.config({ path: '.env.local' })
  main().catch(console.error)
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
npm test
```

Expected: 全テスト PASS

- [ ] **Step 5: 実際にインポートを実行**

```bash
# ts-node がなければインストール
npm install --save-dev ts-node dotenv

npx ts-node -e "
require('dotenv').config({ path: '.env.local' })
" scripts/import-tracker.ts
```

または:
```bash
npm install --save-dev tsx
npx tsx scripts/import-tracker.ts
```

Expected: `✅ Imported XX companies`

- [ ] **Step 6: Supabase コンソールでデータを確認**

Supabase ダッシュボード → `Table Editor` → `companies` → 企業データが入っていることを確認

- [ ] **Step 7: コミット**

```bash
git add scripts/ __tests__/import-tracker.test.ts
git commit -m "feat: add outreach-tracker.md import script with tests"
```

---

## Task 5: CRUD API ルート

**Files:**
- Create: `app/api/companies/route.ts`
- Create: `app/api/companies/[id]/route.ts`

- [ ] **Step 1: 企業一覧・追加 API を作成**

`app/api/companies/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { ContactStatus } from '@/lib/types'

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { searchParams } = new URL(request.url)

  let query = supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false })

  const status = searchParams.get('status') as ContactStatus | null
  if (status) {
    query = query.eq('contact_status', status)
  }

  const search = searchParams.get('search')
  if (search) {
    query = query.or(`name.ilike.%${search}%,contact_name.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('companies')
    .insert(body)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: 企業詳細・更新・削除 API を作成**

`app/api/companies/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

type Params = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('companies')
    .select('*, outreach_history(*)')
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = createServerSupabaseClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('companies')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: API 動作確認**

```bash
npm run dev
```

別ターミナルで:
```bash
# 一覧取得
curl http://localhost:3000/api/companies | jq '. | length'

# ステータスフィルター
curl "http://localhost:3000/api/companies?status=approved" | jq '.[].name'
```

Expected: 企業数が返り、approved フィルターで承認済み企業のみ表示

- [ ] **Step 4: コミット**

```bash
git add app/api/
git commit -m "feat: add companies CRUD API routes"
```

---

## Task 6: MCP サーバー

**Files:**
- Create: `mcp-server/package.json`
- Create: `mcp-server/index.js`
- Create: `mcp-server/tools/companies.js`
- Create: `mcp-server/tools/sync.js`
- Create: `__tests__/mcp-tools.test.js`
- Modify: `~/.claude/settings.json`

- [ ] **Step 1: MCP サーバーの依存パッケージをセットアップ**

```bash
mkdir -p mcp-server/tools
cd mcp-server
npm init -y
npm install @modelcontextprotocol/sdk @supabase/supabase-js dotenv
cd ..
```

- [ ] **Step 2: CRUD ツール関数のテストを書く（失敗確認）**

`__tests__/mcp-tools.test.js`:
```javascript
const { buildListQuery, parseCompanyInput } = require('../mcp-server/tools/companies')

describe('buildListQuery', () => {
  it('no filters → empty object', () => {
    expect(buildListQuery({})).toEqual({ status: null, search: null })
  })

  it('status filter', () => {
    expect(buildListQuery({ status: 'approved' })).toEqual({
      status: 'approved',
      search: null,
    })
  })

  it('search filter', () => {
    expect(buildListQuery({ search: 'ArkEdge' })).toEqual({
      status: null,
      search: 'ArkEdge',
    })
  })
})

describe('parseCompanyInput', () => {
  it('requires name', () => {
    expect(() => parseCompanyInput({})).toThrow('name is required')
  })

  it('returns valid input', () => {
    const result = parseCompanyInput({ name: 'Test Co', contact_status: 'step1' })
    expect(result.name).toBe('Test Co')
    expect(result.contact_status).toBe('step1')
  })

  it('defaults contact_status to untouched', () => {
    const result = parseCompanyInput({ name: 'Test Co' })
    expect(result.contact_status).toBe('untouched')
  })
})
```

- [ ] **Step 3: テストが失敗することを確認**

```bash
npm test
```

Expected: `Cannot find module '../mcp-server/tools/companies'`

- [ ] **Step 4: companies.js（ツール関数）を実装**

`mcp-server/tools/companies.js`:
```javascript
// ピュア関数（テスト可能）
function buildListQuery(args) {
  return {
    status: args.status ?? null,
    search: args.search ?? null,
  }
}

function parseCompanyInput(args) {
  if (!args.name) throw new Error('name is required')
  return {
    name: args.name,
    linkedin_url: args.linkedin_url ?? null,
    contact_name: args.contact_name ?? null,
    email: args.email ?? null,
    phone: args.phone ?? null,
    contact_status: args.contact_status ?? 'untouched',
    notes: args.notes ?? null,
  }
}

// Supabase を使うツールハンドラー（DI でテスト可能）
async function listCompanies(supabase, args) {
  const { status, search } = buildListQuery(args)

  let query = supabase
    .from('companies')
    .select('id, name, contact_name, contact_status, notes, email, linkedin_url')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('contact_status', status)
  if (search) query = query.or(`name.ilike.%${search}%,contact_name.ilike.%${search}%`)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

async function addCompany(supabase, args) {
  const input = parseCompanyInput(args)
  const { data, error } = await supabase
    .from('companies')
    .insert(input)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

async function updateCompany(supabase, args) {
  const { id, ...updates } = args
  if (!id) throw new Error('id is required')
  const { data, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

async function getCompany(supabase, args) {
  if (!args.id) throw new Error('id is required')
  const { data, error } = await supabase
    .from('companies')
    .select('*, outreach_history(*)')
    .eq('id', args.id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

async function queueOutreach(supabase, args) {
  const { company_id, type, message } = args
  if (!company_id || !type) throw new Error('company_id and type are required')
  const { data, error } = await supabase
    .from('outreach_history')
    .insert({ company_id, type, message: message ?? null, status: 'queued' })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

module.exports = {
  buildListQuery,
  parseCompanyInput,
  listCompanies,
  addCompany,
  updateCompany,
  getCompany,
  queueOutreach,
}
```

- [ ] **Step 5: テストが通ることを確認**

```bash
npm test
```

Expected: 全テスト PASS

- [ ] **Step 6: sync.js を実装**

`mcp-server/tools/sync.js`:
```javascript
const fs = require('fs')
const path = require('path')

const STATUS_TO_MD = {
  untouched: '未着手',
  step1: 'Step1',
  approved: '**承認済**',
  step2: 'Step2',
  followup: 'FU',
  negotiating: '商談中',
  listed: '掲載完了',
  closed: 'クローズ',
}

async function syncMarkdown(supabase, args) {
  const workspacePath = process.env.WORKSPACE_PATH
  if (!workspacePath) throw new Error('WORKSPACE_PATH not set')

  const trackerPath = path.join(
    workspacePath,
    'company_jva/dep_IB/sales/outreach-tracker.md'
  )

  const { direction = 'db_to_md' } = args ?? {}

  if (direction === 'db_to_md') {
    // Supabase → .md 書き出し（ステータスのみ更新）
    const { data: companies, error } = await supabase
      .from('companies')
      .select('name, contact_name, contact_status, notes')
      .order('created_at')

    if (error) throw new Error(error.message)

    const header = `# JVA IB — Outreach Tracker\n\n> 最終同期: ${new Date().toISOString()}\n\n---\n\n## 企業一覧\n\n| 会社 | 担当者 | ステータス | メモ |\n|------|--------|-----------|------|\n`
    const rows = companies
      .map(c =>
        `| ${c.name} | ${c.contact_name ?? '—'} | ${STATUS_TO_MD[c.contact_status] ?? c.contact_status} | ${c.notes ?? '—'} |`
      )
      .join('\n')

    fs.writeFileSync(trackerPath, header + rows + '\n', 'utf-8')
    return { synced: companies.length, direction: 'db_to_md' }
  }

  throw new Error(`Unknown direction: ${direction}`)
}

module.exports = { syncMarkdown }
```

- [ ] **Step 7: MCP サーバーエントリーポイントを実装**

`mcp-server/index.js`:
```javascript
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
const { Server } = require('@modelcontextprotocol/sdk/server/index.js')
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js')
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js')
const { createClient } = require('@supabase/supabase-js')
const companies = require('./tools/companies')
const { syncMarkdown } = require('./tools/sync')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const server = new Server(
  { name: 'jva-crm', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_companies',
      description: '企業一覧を取得する（status/name でフィルタ可）',
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['untouched','step1','approved','step2','followup','negotiating','listed','closed'] },
          search: { type: 'string', description: '会社名または担当者名で検索' },
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
          phone: { type: 'string' },
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
          id: { type: 'string' },
          contact_status: { type: 'string' },
          contact_name: { type: 'string' },
          email: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
    {
      name: 'get_company',
      description: '企業の詳細情報とアウトリーチ履歴を取得する',
      inputSchema: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
    },
    {
      name: 'queue_outreach',
      description: 'アウトリーチ（メール/LinkedIn/フォーム）をキューに登録する',
      inputSchema: {
        type: 'object',
        required: ['company_id', 'type'],
        properties: {
          company_id: { type: 'string' },
          type: { type: 'string', enum: ['email', 'linkedin_dm', 'form'] },
          message: { type: 'string' },
        },
      },
    },
    {
      name: 'sync_markdown',
      description: 'Supabase の内容を outreach-tracker.md に書き出す',
      inputSchema: {
        type: 'object',
        properties: {
          direction: { type: 'string', enum: ['db_to_md'], default: 'db_to_md' },
        },
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    let result
    switch (name) {
      case 'list_companies':
        result = await companies.listCompanies(supabase, args ?? {})
        break
      case 'add_company':
        result = await companies.addCompany(supabase, args)
        break
      case 'update_company':
        result = await companies.updateCompany(supabase, args)
        break
      case 'get_company':
        result = await companies.getCompany(supabase, args)
        break
      case 'queue_outreach':
        result = await companies.queueOutreach(supabase, args)
        break
      case 'sync_markdown':
        result = await syncMarkdown(supabase, args ?? {})
        break
      default:
        throw new Error(`Unknown tool: ${name}`)
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true,
    }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('JVA CRM MCP server running')
}

main().catch(console.error)
```

- [ ] **Step 8: MCP サーバーを ~/.claude/settings.json に登録**

```bash
# settings.json の現在の内容を確認
cat ~/.claude/settings.json
```

`mcpServers` セクションに以下を追加（既存の設定は保持）:
```json
{
  "mcpServers": {
    "jva-crm": {
      "command": "node",
      "args": ["/Users/sorasasaki/jva-crm/mcp-server/index.js"]
    }
  }
}
```

- [ ] **Step 9: Claude Code を再起動して MCP を確認**

1. Claude Code を完全に終了（`/exit` またはウィンドウを閉じる）
2. 再起動
3. `/mcp` コマンドで `jva-crm` が表示されることを確認
4. `list_companies` ツールを呼び出し → 企業データが返ることを確認

- [ ] **Step 10: コミット**

```bash
git add mcp-server/ __tests__/mcp-tools.test.js
git commit -m "feat: implement MCP server with 6 tools (list/add/update/get/queue/sync)"
```

---

## Task 7: StatusBadge コンポーネント

**Files:**
- Create: `app/components/StatusBadge.tsx`

- [ ] **Step 1: StatusBadge を実装**

`app/components/StatusBadge.tsx`:
```typescript
import { STATUS_LABELS, STATUS_COLORS, type ContactStatus } from '@/lib/types'

interface StatusBadgeProps {
  status: ContactStatus
  onClick?: () => void
}

export function StatusBadge({ status, onClick }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status]} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      onClick={onClick}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add app/components/StatusBadge.tsx
git commit -m "feat: add StatusBadge component"
```

---

## Task 8: CompanyTable コンポーネント

**Files:**
- Create: `app/components/CompanyTable.tsx`

- [ ] **Step 1: CompanyTable を実装**

`app/components/CompanyTable.tsx`:
```typescript
'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import type { Company, ContactStatus } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/types'
import { StatusBadge } from './StatusBadge'

interface CompanyTableProps {
  companies: Company[]
  onSelect: (company: Company) => void
}

const ALL_STATUSES: ContactStatus[] = [
  'untouched', 'step1', 'approved', 'step2',
  'followup', 'negotiating', 'listed', 'closed',
]

export function CompanyTable({ companies, onSelect }: CompanyTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ContactStatus | ''>('')
  const [sortKey, setSortKey] = useState<keyof Company>('created_at')
  const [sortAsc, setSortAsc] = useState(false)

  const filtered = useMemo(() => {
    return companies
      .filter(c => {
        const matchesSearch =
          !search ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.contact_name ?? '').toLowerCase().includes(search.toLowerCase())
        const matchesStatus = !statusFilter || c.contact_status === statusFilter
        return matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        const av = a[sortKey] ?? ''
        const bv = b[sortKey] ?? ''
        return sortAsc
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av))
      })
  }, [companies, search, statusFilter, sortKey, sortAsc])

  function toggleSort(key: keyof Company) {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  return (
    <div className="space-y-3">
      {/* ツールバー */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="会社名・担当者で検索"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 w-full border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as ContactStatus | '')}
          className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全ステータス</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500">{filtered.length} 件</span>
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {[
                { key: 'name' as const, label: '会社名' },
                { key: 'contact_name' as const, label: '担当者' },
                { key: 'contact_status' as const, label: 'ステータス' },
                { key: 'notes' as const, label: 'メモ' },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:text-gray-900 select-none"
                  onClick={() => toggleSort(key)}
                >
                  {label}
                  {sortKey === key && (sortAsc ? ' ↑' : ' ↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(company => (
              <tr
                key={company.id}
                className="hover:bg-blue-50 cursor-pointer transition-colors"
                onClick={() => onSelect(company)}
              >
                <td className="px-4 py-3 font-medium">{company.name}</td>
                <td className="px-4 py-3 text-gray-600">{company.contact_name ?? '—'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={company.contact_status} />
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                  {company.notes ?? '—'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  該当する企業がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add app/components/CompanyTable.tsx
git commit -m "feat: add CompanyTable component with sort/filter/search"
```

---

## Task 9: CompanyDrawer コンポーネント

**Files:**
- Create: `app/components/CompanyDrawer.tsx`

- [ ] **Step 1: CompanyDrawer を実装**

`app/components/CompanyDrawer.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { X, ExternalLink, Mail, Linkedin, Globe } from 'lucide-react'
import type { Company, ContactStatus } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/types'
import { StatusBadge } from './StatusBadge'

interface CompanyDrawerProps {
  company: Company | null
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Company>) => Promise<void>
}

const ALL_STATUSES: ContactStatus[] = [
  'untouched', 'step1', 'approved', 'step2',
  'followup', 'negotiating', 'listed', 'closed',
]

export function CompanyDrawer({ company, onClose, onUpdate }: CompanyDrawerProps) {
  const [editing, setEditing] = useState<Partial<Company>>({})
  const [saving, setSaving] = useState(false)

  if (!company) return null

  const current = { ...company, ...editing }

  async function handleSave() {
    if (Object.keys(editing).length === 0) return
    setSaving(true)
    try {
      await onUpdate(company.id, editing)
      setEditing({})
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      {/* ドロワー */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold truncate">{current.name}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* ステータス */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">ステータス</label>
            <select
              value={current.contact_status}
              onChange={e => setEditing(prev => ({
                ...prev,
                contact_status: e.target.value as ContactStatus,
              }))}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* 担当者 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">担当者</label>
            <input
              type="text"
              value={current.contact_name ?? ''}
              onChange={e => setEditing(prev => ({ ...prev, contact_name: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="担当者名"
            />
          </div>

          {/* メールアドレス */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">メール</label>
            <input
              type="email"
              value={current.email ?? ''}
              onChange={e => setEditing(prev => ({ ...prev, email: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="email@company.com"
            />
          </div>

          {/* LinkedIn URL */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">LinkedIn URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={current.linkedin_url ?? ''}
                onChange={e => setEditing(prev => ({ ...prev, linkedin_url: e.target.value }))}
                className="flex-1 border rounded-md px-3 py-2 text-sm"
                placeholder="https://linkedin.com/in/..."
              />
              {current.linkedin_url && (
                <a
                  href={current.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 border rounded-md hover:bg-gray-50"
                >
                  <ExternalLink className="h-4 w-4 text-gray-500" />
                </a>
              )}
            </div>
          </div>

          {/* メモ */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">メモ</label>
            <textarea
              value={current.notes ?? ''}
              onChange={e => setEditing(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              className="w-full border rounded-md px-3 py-2 text-sm resize-none"
              placeholder="メモを入力..."
            />
          </div>

          {/* アウトリーチボタン（Phase 3 デーモン実装後に有効化） */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">
              アウトリーチ
              <span className="ml-2 text-yellow-600 font-normal">（Phase 3 で有効化）</span>
            </label>
            <div className="flex gap-2">
              {current.email && (
                <button
                  disabled
                  className="flex items-center gap-1.5 px-3 py-2 text-xs border rounded-md opacity-40 cursor-not-allowed"
                  title="Phase 3（デーモン実装）後に有効化"
                >
                  <Mail className="h-3.5 w-3.5" /> メール
                </button>
              )}
              {current.linkedin_url && (
                <button
                  disabled
                  className="flex items-center gap-1.5 px-3 py-2 text-xs border rounded-md opacity-40 cursor-not-allowed"
                  title="Phase 3（デーモン実装）後に有効化"
                >
                  <Linkedin className="h-3.5 w-3.5" /> LinkedIn DM
                </button>
              )}
              <button
                disabled
                className="flex items-center gap-1.5 px-3 py-2 text-xs border rounded-md opacity-40 cursor-not-allowed"
                title="Phase 3（デーモン実装）後に有効化"
              >
                <Globe className="h-3.5 w-3.5" /> フォーム
              </button>
            </div>
          </div>
        </div>

        {/* フッター（保存ボタン） */}
        {Object.keys(editing).length > 0 && (
          <div className="border-t px-5 py-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '保存中...' : '変更を保存'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add app/components/CompanyDrawer.tsx
git commit -m "feat: add CompanyDrawer side panel component"
```

---

## Task 10: ダッシュボードページ統合

**Files:**
- Modify: `app/(dashboard)/page.tsx`
- Modify: `app/(dashboard)/layout.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: ダッシュボードレイアウトを作成**

`app/(dashboard)/layout.tsx`:
```typescript
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">JVA CRM</h1>
        <p className="text-xs text-gray-500 mt-0.5">IB 企業営業管理</p>
      </header>
      <main className="px-6 py-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: ダッシュボードページを実装**

`app/(dashboard)/page.tsx`:
```typescript
'use client'

import { useEffect, useState } from 'react'
import type { Company } from '@/lib/types'
import { CompanyTable } from '@/app/components/CompanyTable'
import { CompanyDrawer } from '@/app/components/CompanyDrawer'

export default function DashboardPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selected, setSelected] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/companies')
      .then(r => r.json())
      .then(data => setCompanies(data))
      .finally(() => setLoading(false))
  }, [])

  async function handleUpdate(id: string, updates: Partial<Company>) {
    const res = await fetch(`/api/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const updated: Company = await res.json()
    setCompanies(prev => prev.map(c => (c.id === id ? updated : c)))
    setSelected(updated)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        読み込み中...
      </div>
    )
  }

  return (
    <>
      <CompanyTable companies={companies} onSelect={setSelected} />
      <CompanyDrawer
        company={selected}
        onClose={() => setSelected(null)}
        onUpdate={handleUpdate}
      />
    </>
  )
}
```

- [ ] **Step 3: ルートレイアウトの globals.css を確認**

`app/globals.css` に Tailwind の base import があることを確認:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: 動作確認**

```bash
npm run dev
```

`localhost:3000` を開いて以下を確認:
- 企業テーブルが表示される
- 検索・フィルターが動作する
- 行クリックでドロワーが開く
- ステータス変更して「変更を保存」→ テーブルに反映される

- [ ] **Step 5: コミット**

```bash
git add app/
git commit -m "feat: integrate CompanyTable and CompanyDrawer into dashboard page"
```

---

## 完了確認チェックリスト

- [ ] `npm run dev` → localhost:3000 が開く
- [ ] 企業テーブルに outreach-tracker.md のデータが表示される
- [ ] ステータスフィルター・検索が動作する
- [ ] ドロワーからステータス更新 → テーブルとDB に反映
- [ ] Claude Code で `list_companies` ツールが呼べる
- [ ] `list_companies` で企業データが返る
- [ ] `update_company` でステータス更新 → DB に反映
- [ ] `sync_markdown` でoutreach-tracker.md が更新される
- [ ] `npm test` → 全テスト PASS

---

## 次フェーズ（このプランのスコープ外）

Phase 3（自動化デーモン）の実装は別プランで行う:
- `daemon/index.js` — 5秒ポーリング
- `daemon/workers/email.js` — SendGrid
- `daemon/workers/form.js` — Playwright
- `daemon/workers/linkedin.js` — Playwright
