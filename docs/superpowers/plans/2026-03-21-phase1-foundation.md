# JVA CRM Phase 1 Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js + Supabase ベースの企業営業管理CRMを構築し、既存 outreach-tracker.md のデータをインポートしてブラウザから閲覧・編集できる状態にする。

**Architecture:** Next.js App Router（Vercel向け）+ Supabase PostgreSQL。フロントエンドはサーバーコンポーネント+クライアントコンポーネントのハイブリッド。APIルートはEdge-compatible。

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Supabase JS v2, shadcn/ui（Table/Drawer/Badge）

---

## ファイル構成（作成・変更対象）

```
~/jva-crm/
├── app/
│   ├── layout.tsx                     # ルートレイアウト（Tailwind global CSS）
│   ├── page.tsx                       # / → /dashboard リダイレクト
│   ├── (dashboard)/
│   │   ├── layout.tsx                 # ダッシュボードレイアウト
│   │   └── page.tsx                   # CompanyTable をレンダリング
│   ├── api/
│   │   └── companies/
│   │       ├── route.ts               # GET(一覧) / POST(作成)
│   │       └── [id]/
│   │           └── route.ts           # GET(詳細) / PATCH(更新) / DELETE(削除)
│   └── components/
│       ├── CompanyTable.tsx           # テーブル一覧（Client Component）
│       ├── CompanyDrawer.tsx          # サイドドロワー詳細・編集（Client Component）
│       └── StatusBadge.tsx            # ステータスバッジ（色分け）
├── lib/
│   └── supabase.ts                    # Supabase クライアント（browser + server）
├── types/
│   └── company.ts                     # Company / OutreachHistory 型定義
├── scripts/
│   └── import-from-md.ts             # outreach-tracker.md → Supabase 初回インポート
├── supabase/
│   └── schema.sql                     # DDL（companies / outreach_history / templates）
├── .env.local.example                 # 必要な環境変数のテンプレート
└── .gitignore                         # .env.local を除外（既存 or 追記）
```

---

## Task 1: Next.js プロジェクト初期化

**Files:**
- Modify: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `app/layout.tsx`

- [ ] **Step 1: 既存ファイルのバックアップ確認**

```bash
ls ~/jva-crm
# DESIGN.md が存在することを確認
```

- [ ] **Step 2: Next.js を初期化（既存ディレクトリに展開）**

```bash
cd ~/jva-crm
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=no \
  --import-alias="@/*" \
  --yes
```

Expected: `app/`, `public/`, `package.json` 等が生成される。DESIGN.md は上書きされない。

- [ ] **Step 3: shadcn/ui を初期化**

```bash
npx shadcn@latest init --yes
```

- [ ] **Step 4: 必要な shadcn コンポーネントを追加**

```bash
npx shadcn@latest add table sheet badge button input label select
```

- [ ] **Step 5: Supabase JS クライアントをインストール**

```bash
npm install @supabase/supabase-js
```

- [ ] **Step 6: 開発サーバーの起動確認**

```bash
npm run dev
# ブラウザで http://localhost:3000 → Next.js デフォルト画面が表示される
```

- [ ] **Step 7: コミット**

```bash
git add -A
git commit -m "feat: initialize Next.js 15 + Tailwind + shadcn/ui"
```

---

## Task 2: 環境変数・Supabase クライアント設定

**前提:** Supabase プロジェクトを手動で作成済みであること。
- https://supabase.com/dashboard でプロジェクト作成
- Project URL と anon key を取得

**Files:**
- Create: `.env.local.example`
- Create: `.env.local`（gitignore済み、手動入力）
- Create: `lib/supabase.ts`
- Create: `types/company.ts`

- [ ] **Step 1: .env.local.example を作成**

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
WORKSPACE_PATH=/Users/sorasasaki/claude-workspace
```

- [ ] **Step 2: .env.local に実際の値を設定**

Supabase ダッシュボード → Settings → API から取得してコピー。

- [ ] **Step 3: lib/supabase.ts を作成**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ブラウザ用（Client Component から使う）
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// サーバー用（API Routes から使う）
export function createServerClient() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey
  )
}
```

- [ ] **Step 4: types/company.ts を作成**

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

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  untouched: '未着手',
  step1: 'Step1',
  approved: '承認済',
  step2: 'Step2',
  followup: 'フォローアップ',
  negotiating: '商談中',
  listed: '掲載完了',
  closed: 'クローズ',
}

export const CONTACT_STATUS_COLORS: Record<ContactStatus, string> = {
  untouched: 'bg-gray-100 text-gray-600',
  step1: 'bg-blue-100 text-blue-700',
  approved: 'bg-yellow-100 text-yellow-700',
  step2: 'bg-purple-100 text-purple-700',
  followup: 'bg-orange-100 text-orange-700',
  negotiating: 'bg-green-100 text-green-700',
  listed: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-red-100 text-red-600',
}

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
  type: 'email' | 'linkedin_dm' | 'form'
  message: string | null
  status: 'queued' | 'sent' | 'failed' | 'replied'
  sent_at: string | null
}
```

- [ ] **Step 5: コミット**

```bash
git add lib/supabase.ts types/company.ts .env.local.example
git commit -m "feat: add Supabase client and Company types"
```

---

## Task 3: Supabase スキーマ適用

**Files:**
- Create: `supabase/schema.sql`

- [ ] **Step 1: supabase/schema.sql を作成**

```sql
-- companies
CREATE TABLE IF NOT EXISTS companies (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  linkedin_url   text,
  contact_name   text,
  email          text,
  phone          text,
  contact_status text NOT NULL DEFAULT 'untouched'
    CHECK (contact_status IN (
      'untouched','step1','approved','step2',
      'followup','negotiating','listed','closed'
    )),
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- outreach_history
CREATE TABLE IF NOT EXISTS outreach_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('email','linkedin_dm','form')),
  message    text,
  status     text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','sent','failed','replied')),
  sent_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- templates
CREATE TABLE IF NOT EXISTS templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text NOT NULL CHECK (type IN ('email','linkedin_dm','form')),
  name       text NOT NULL,
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS（MVP段階ではオフ。デプロイ時に有効化）
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE templates DISABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Supabase ダッシュボードでスキーマを適用**

Supabase ダッシュボード → SQL Editor → supabase/schema.sql の内容を貼り付けて実行。

Expected: 3テーブルが Table Editor に表示される。

- [ ] **Step 3: コミット**

```bash
git add supabase/schema.sql
git commit -m "feat: add Supabase schema (companies, outreach_history, templates)"
```

---

## Task 4: CRUD API ルート実装

**Files:**
- Create: `app/api/companies/route.ts`
- Create: `app/api/companies/[id]/route.ts`

- [ ] **Step 1: app/api/companies/route.ts を作成（GET・POST）**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const q = searchParams.get('q')

  const supabase = createServerClient()
  let query = supabase
    .from('companies')
    .select('*')
    .order('updated_at', { ascending: false })

  if (status) query = query.eq('contact_status', status)
  if (q) query = query.ilike('name', `%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('companies')
    .insert(body)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: app/api/companies/[id]/route.ts を作成（GET・PATCH・DELETE）**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('companies')
    .select('*, outreach_history(*)')
    .eq('id', params.id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('companies')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { error } = await supabase.from('companies').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: APIの動作確認（curl）**

```bash
# POST: 企業追加
curl -X POST http://localhost:3000/api/companies \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Corp","contact_status":"untouched"}'
# Expected: {"id":"...","name":"Test Corp",...}

# GET: 一覧取得
curl http://localhost:3000/api/companies
# Expected: JSON配列（Test Corp が含まれる）
```

- [ ] **Step 4: コミット**

```bash
git add app/api/
git commit -m "feat: add companies CRUD API routes"
```

---

## Task 5: StatusBadge コンポーネント

**Files:**
- Create: `app/components/StatusBadge.tsx`

- [ ] **Step 1: StatusBadge.tsx を作成**

```typescript
'use client'
import { ContactStatus, CONTACT_STATUS_LABELS, CONTACT_STATUS_COLORS } from '@/types/company'
import { cn } from '@/lib/utils'

export function StatusBadge({ status }: { status: ContactStatus }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      CONTACT_STATUS_COLORS[status]
    )}>
      {CONTACT_STATUS_LABELS[status]}
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

## Task 6: CompanyDrawer（詳細・編集サイドドロワー）

**Files:**
- Create: `app/components/CompanyDrawer.tsx`

- [ ] **Step 1: CompanyDrawer.tsx を作成**

```typescript
'use client'
import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Company, ContactStatus, CONTACT_STATUS_LABELS } from '@/types/company'

interface Props {
  company: Company | null
  open: boolean
  onClose: () => void
  onSave: (updated: Partial<Company>) => Promise<void>
}

export function CompanyDrawer({ company, open, onClose, onSave }: Props) {
  const [form, setForm] = useState<Partial<Company>>({})
  const [saving, setSaving] = useState(false)

  // company が変わったら form をリセット
  useState(() => { setForm({}) })

  if (!company) return null

  const merged = { ...company, ...form }

  async function handleSave() {
    if (!Object.keys(form).length) { onClose(); return }
    setSaving(true)
    await onSave(form)
    setSaving(false)
    setForm({})
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent className="w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{company.name}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {([
            ['name', '会社名'],
            ['contact_name', '担当者名'],
            ['email', 'メール'],
            ['linkedin_url', 'LinkedIn URL'],
            ['phone', '電話番号'],
          ] as [keyof Company, string][]).map(([field, label]) => (
            <div key={field}>
              <Label>{label}</Label>
              <Input
                value={(form[field] ?? merged[field] ?? '') as string}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
              />
            </div>
          ))}

          <div>
            <Label>ステータス</Label>
            <Select
              value={merged.contact_status}
              onValueChange={(v) => setForm((f) => ({ ...f, contact_status: v as ContactStatus }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CONTACT_STATUS_LABELS) as ContactStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{CONTACT_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>メモ</Label>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm resize-none h-24"
              value={(form.notes ?? merged.notes ?? '') as string}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? '保存中...' : '保存'}
            </Button>
            <Button variant="outline" onClick={onClose}>キャンセル</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add app/components/CompanyDrawer.tsx
git commit -m "feat: add CompanyDrawer side panel component"
```

---

## Task 7: CompanyTable（メインテーブル）

**Files:**
- Create: `app/components/CompanyTable.tsx`

- [ ] **Step 1: CompanyTable.tsx を作成**

```typescript
'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Company } from '@/types/company'
import { StatusBadge } from './StatusBadge'
import { CompanyDrawer } from './CompanyDrawer'

export function CompanyTable() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Company | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const fetchCompanies = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    const res = await fetch(`/api/companies?${params}`)
    const data = await res.json()
    setCompanies(data)
    setLoading(false)
  }, [q])

  useEffect(() => {
    const t = setTimeout(fetchCompanies, 300)
    return () => clearTimeout(t)
  }, [fetchCompanies])

  async function handleSave(updated: Partial<Company>) {
    if (!selected) return
    await fetch(`/api/companies/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    await fetchCompanies()
  }

  function openDrawer(company: Company) {
    setSelected(company)
    setDrawerOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="会社名で検索..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground">{companies.length}件</span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>会社名</TableHead>
              <TableHead>担当者</TableHead>
              <TableHead>メール</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>更新日</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  データなし
                </TableCell>
              </TableRow>
            ) : companies.map((c) => (
              <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="font-medium" onClick={() => openDrawer(c)}>{c.name}</TableCell>
                <TableCell onClick={() => openDrawer(c)}>{c.contact_name ?? '—'}</TableCell>
                <TableCell onClick={() => openDrawer(c)}>{c.email ?? '—'}</TableCell>
                <TableCell onClick={() => openDrawer(c)}>
                  <StatusBadge status={c.contact_status} />
                </TableCell>
                <TableCell onClick={() => openDrawer(c)}>
                  {new Date(c.updated_at).toLocaleDateString('ja-JP')}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => openDrawer(c)}>
                    編集
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CompanyDrawer
        company={selected}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add app/components/CompanyTable.tsx
git commit -m "feat: add CompanyTable with search and inline editing"
```

---

## Task 8: ダッシュボードページ配線

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/(dashboard)/layout.tsx`
- Create: `app/(dashboard)/page.tsx`

- [ ] **Step 1: app/(dashboard)/layout.tsx を作成**

```typescript
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-3">
        <h1 className="text-lg font-semibold">JVA CRM</h1>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: app/(dashboard)/page.tsx を作成**

```typescript
import { CompanyTable } from '@/app/components/CompanyTable'

export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">企業一覧</h2>
      <CompanyTable />
    </div>
  )
}
```

- [ ] **Step 3: app/page.tsx をリダイレクトに変更**

```typescript
import { redirect } from 'next/navigation'
export default function Home() { redirect('/') }
```

（`(dashboard)/page.tsx` が `/` にマッピングされるため、このファイルは削除してもよい）

- [ ] **Step 4: ブラウザ確認**

```bash
npm run dev
# http://localhost:3000 → 企業テーブルが表示される（データはまだ空）
```

- [ ] **Step 5: コミット**

```bash
git add app/
git commit -m "feat: wire dashboard page with CompanyTable"
```

---

## Task 9: outreach-tracker.md からの初回インポートスクリプト

**Files:**
- Create: `scripts/import-from-md.ts`

インポート元データ構造（outreach-tracker.md）:
```
| # | 会社 | 担当者 | Lang | Step | 承認日 | 1通目 | メモ |
| 1 | ArkEdge Space | 黒田賢太 | JA | Step1 | — | — | Forbes Startup... |
```

ステータスマッピング:
- 未着手 → untouched
- Step1 → step1
- 承認済 → approved
- Step2 → step2
- FU1/FU2 → followup
- 返信あり/商談中 → negotiating
- 掲載完了 → listed
- クローズ → closed

- [ ] **Step 1: scripts/import-from-md.ts を作成**

```typescript
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const STATUS_MAP: Record<string, string> = {
  '未着手': 'untouched',
  'Step1': 'step1',
  '承認済': 'approved',
  'Step2': 'step2',
  'FU1': 'followup',
  'FU2': 'followup',
  '返信あり': 'negotiating',
  '商談中': 'negotiating',
  '掲載完了': 'listed',
  'クローズ': 'closed',
}

function parseMarkdownTable(content: string) {
  const companies: Array<{
    name: string
    contact_name: string | null
    contact_status: string
    notes: string | null
  }> = []

  const lines = content.split('\n')
  for (const line of lines) {
    // テーブル行: | # | 会社 | 担当者 | ... | のフォーマット
    if (!line.startsWith('|')) continue
    const cells = line.split('|').map((c) => c.trim()).filter(Boolean)
    // ヘッダー行・区切り行をスキップ
    if (!cells[0] || isNaN(Number(cells[0]))) continue

    const [_num, name, contactName, _lang, step, _approval, _first, ...memoArr] = cells
    const notes = memoArr.join(' ').replace(/^—$/, '').trim() || null
    const contact_name = contactName === '(HR要調査)' || contactName === '(CEO直)'
      ? null
      : contactName || null

    const rawStatus = step?.trim() ?? '未着手'
    const contact_status = STATUS_MAP[rawStatus] ?? 'untouched'

    if (name && name !== '会社') {
      companies.push({ name, contact_name, contact_status, notes })
    }
  }
  return companies
}

async function main() {
  const workspacePath = process.env.WORKSPACE_PATH ?? '/Users/sorasasaki/claude-workspace'
  const trackerPath = `${workspacePath}/company_jva/dep_IB/sales/outreach-tracker.md`

  console.log(`Reading: ${trackerPath}`)
  const content = readFileSync(trackerPath, 'utf-8')
  const companies = parseMarkdownTable(content)

  console.log(`Parsed ${companies.length} companies`)

  const { data, error } = await supabase
    .from('companies')
    .upsert(companies, { onConflict: 'name', ignoreDuplicates: false })
    .select()

  if (error) {
    console.error('Import failed:', error.message)
    process.exit(1)
  }

  console.log(`Imported ${data?.length ?? 0} companies successfully`)
  data?.forEach((c) => console.log(`  [${c.contact_status}] ${c.name}`))
}

main()
```

- [ ] **Step 2: tsx（TypeScript実行）をインストール**

```bash
npm install -D tsx dotenv
```

- [ ] **Step 3: package.json にスクリプト追加**

```json
"scripts": {
  "import:md": "tsx scripts/import-from-md.ts"
}
```

- [ ] **Step 4: インポート実行**

```bash
npm run import:md
# Expected:
# Parsed 30 companies
# Imported 30 companies successfully
#   [step1] ArkEdge Space
#   [step1] enechain
#   ...
```

- [ ] **Step 5: ブラウザで確認**

```bash
# http://localhost:3000 → 30社が表示されていることを確認
```

- [ ] **Step 6: コミット**

```bash
git add scripts/ package.json
git commit -m "feat: add outreach-tracker.md import script"
```

---

## Task 10: GitHubプッシュ・Phase 1完了確認

- [ ] **Step 1: .gitignore に .env.local が含まれていることを確認**

```bash
grep '.env.local' .gitignore
# Expected: .env.local が出力される
```

- [ ] **Step 2: 最終ビルド確認**

```bash
npm run build
# Expected: ビルドエラーなし
```

- [ ] **Step 3: GitHub にプッシュ**

```bash
git push origin main
```

- [ ] **Step 4: 動作確認チェックリスト**

- [ ] http://localhost:3000 で企業一覧が表示される
- [ ] 検索ボックスで絞り込みができる
- [ ] 行クリックでサイドドロワーが開く
- [ ] ステータス変更して保存すると一覧に反映される
- [ ] ステータスバッジが色分けされている

---

## 実行順序まとめ

| # | タスク | 依存 |
|---|--------|------|
| 1 | Next.js初期化 | なし |
| 2 | Supabase設定（手動作業あり） | Task 1 |
| 3 | スキーマ適用（手動作業あり） | Task 2 |
| 4 | CRUD API | Task 2, 3 |
| 5 | StatusBadge | Task 2 |
| 6 | CompanyDrawer | Task 5 |
| 7 | CompanyTable | Task 5, 6 |
| 8 | ページ配線 | Task 4, 7 |
| 9 | インポートスクリプト | Task 3 |
| 10 | 完了確認 | すべて |

**手動作業が必要なステップ:**
- Task 2: Supabase プロジェクト作成・キー取得 → `.env.local` 設定
- Task 3: SQL Editor でスキーマ実行
