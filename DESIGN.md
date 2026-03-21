# JVA CRM 設計書

**作成日：** 2026-03-21
**ステータス：** 設計確定・実装待ち

---

## 概要

インターンシップボード（IB）の企業営業活動を管理するWebCRM。
メール・LinkedIn DM・フォーム営業の自動化、Claude Code からのMCP操作、既存 `.md` ファイルとの双方向同期を実現する。

---

## アーキテクチャ

**構成：** モノリス型（Next.js + Supabase + ローカル自動化デーモン + MCPサーバー）

```
Claude Code (claude-workspace)
  └── MCP Server (~/jva-crm/mcp-server/) → Supabase

Next.js App (Vercel)
  └── API Routes → Supabase

Local Automation Daemon (~/jva-crm/daemon/)
  ├── Playwright Worker (LinkedIn DM / フォーム送信)
  └── SendGrid Worker (メール送信)
      → Supabaseのoutreach_historyキューをポーリング
```

### リポジトリ構成

```
~/jva-crm/                  ← このリポジトリ（開発時は別ウィンドウで開く）
├── app/                    # Next.js (App Router)
│   ├── (dashboard)/
│   │   ├── page.tsx        # 企業テーブル一覧
│   │   └── layout.tsx
│   ├── api/
│   │   ├── companies/      # CRUD API routes
│   │   ├── outreach/       # アウトリーチキュー API
│   │   └── sync/           # .md 同期 API
│   └── components/
│       ├── CompanyTable.tsx
│       ├── CompanyDrawer.tsx   # サイドドロワー（詳細）
│       └── OutreachComposer.tsx
├── daemon/
│   ├── index.js            # メインプロセス（5秒ポーリング）
│   └── workers/
│       ├── email.js        # SendGrid
│       ├── linkedin.js     # Playwright LinkedIn DM
│       └── form.js         # Playwright フォーム送信
├── mcp-server/
│   └── index.js            # MCP ツール定義
├── lib/
│   ├── supabase.ts         # Supabase クライアント
│   └── sync.ts             # .md ↔ Supabase 同期ロジック
├── DESIGN.md               # この設計書
├── .env.local              # gitignore（Supabase keys, SendGrid key 等）
└── package.json
```

---

## データモデル（Supabase PostgreSQL）

### `companies`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
name            text NOT NULL
linkedin_url    text
contact_name    text
email           text
phone           text
contact_status  text DEFAULT 'untouched'
  -- untouched / step1 / approved / step2 / followup / negotiating / listed / closed
notes           text
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

### `outreach_history`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
company_id  uuid REFERENCES companies(id)
type        text  -- email / linkedin_dm / form
message     text
status      text  -- queued / sent / failed / replied
sent_at     timestamptz
```

### `templates`
```sql
id       uuid PRIMARY KEY DEFAULT gen_random_uuid()
type     text  -- email / linkedin_dm / form
name     text
content  text  -- {{company_name}} 等の変数対応
```

---

## UI設計

- **メインビュー：** テーブル（スプレッドシート型）+ ソート・フィルター・検索
- **詳細：** サイドドロワー（右からスライドイン）
  - フィールド表示・編集
  - コンタクト履歴タイムライン
  - アウトリーチ送信ボタン（メール / LinkedIn / フォーム）
- **テンプレート管理画面**
- **ダッシュボード：** KPIサマリー（ステータス別件数、今週送信数）

---

## MCPサーバー

**登録先：** `~/.claude/settings.json`（グローバル設定）

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

| ツール名 | 説明 |
|---|---|
| `list_companies` | 企業一覧取得（status・name でフィルタ可） |
| `add_company` | 企業新規追加 |
| `update_company` | フィールド・ステータス更新 |
| `get_company` | 企業詳細取得 |
| `queue_outreach` | アウトリーチをキューに登録 |
| `sync_markdown` | .md ↔ Supabase 双方向同期 |

---

## .md 同期仕様

- **対象ファイル：**
  - `$WORKSPACE_PATH/company_jva/dep_IB/sales/outreach-tracker.md`
  - `$WORKSPACE_PATH/company_jva/dep_IB/sales/outreach-pipeline.md`
- `WORKSPACE_PATH=/Users/sorasasaki/claude-workspace` を `.env.local` に設定
- **コンフリクト解決：** CRM（Supabase）側を優先

---

## ローカル自動化デーモン

```bash
# 手動起動
node ~/jva-crm/daemon/index.js

# pm2 で常駐化（推奨）
pm2 start ~/jva-crm/daemon/index.js --name jva-crm-daemon
```

- 5秒ごとに `outreach_history` の `status=queued` をポーリング
- **LinkedIn DM：** Playwright でログイン → DM送信（1日の送信上限制御あり）
- **フォーム：** Playwright で企業サイトのフォームを自動入力・送信
- **メール：** SendGrid API 経由で送信

---

## 実装フェーズ

### Phase 1：基盤（MVP）
1. `~/jva-crm/` リポジトリ初期化（Next.js + TypeScript + Tailwind）
2. Supabase プロジェクト作成・スキーマ適用
3. 企業テーブル UI（一覧 + サイドドロワー）
4. CRUD API ルート
5. 既存 `.md` からの初回データインポート

### Phase 2：MCP連携
6. MCPサーバー実装・グローバル登録
7. `sync_markdown` ツール実装

### Phase 3：自動化
8. デーモン基盤（キュープロセッサ）
9. メール Worker（SendGrid）
10. フォーム Worker（Playwright）
11. LinkedIn DM Worker（Playwright）

### Phase 4：仕上げ
12. テンプレート管理画面
13. ダッシュボード（KPI サマリー）
14. Vercel デプロイ

---

## 検証方法

1. `npm run dev` → `localhost:3000` で企業追加・ステータス更新
2. Claude Code で `list_companies` / `add_company` を呼び出し
3. `sync_markdown` 実行後に `outreach-tracker.md` が更新されることを確認
4. テスト企業でデーモン → SendGrid ログで送信確認
5. テストURLでPlaywrightのフォーム自動入力確認

---

## 次セッション開始プロンプト

```
~/jva-crm/ を開いてCRMの実装を開始します。
DESIGN.md に設計書があります。Phase 1（基盤）から始めてください。

手順：
1. git init & npm create next-app@latest でプロジェクト初期化
2. Supabase プロジェクト作成（手動） → keys を .env.local に設定
3. Supabase スキーマ適用（companies / outreach_history / templates）
4. 企業テーブルUI（CompanyTable + CompanyDrawer）を実装
5. CRUD API ルート実装（/api/companies）
6. outreach-tracker.md からの初回データインポートスクリプト作成

既存データの場所：
- /Users/sorasasaki/claude-workspace/company_jva/dep_IB/sales/outreach-tracker.md
- /Users/sorasasaki/claude-workspace/company_jva/dep_IB/sales/outreach-pipeline.md
- /Users/sorasasaki/claude-workspace/company_jva/dep_IB/sales/linkedin-outreach-templates.md
```
