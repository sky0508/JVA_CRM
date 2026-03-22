-- companies テーブル
CREATE TABLE IF NOT EXISTS companies (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL UNIQUE,
  linkedin_url   text,
  contact_name   text,
  email          text,
  phone          text,
  contact_status text DEFAULT 'untouched'
    CHECK (contact_status IN ('untouched','step1','approved','step2','followup','negotiating','listed','closed')),
  notes          text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
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

-- outreach_history テーブル
CREATE TABLE IF NOT EXISTS outreach_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  type       text CHECK (type IN ('email','linkedin_dm','form')),
  message    text,
  status     text DEFAULT 'queued'
    CHECK (status IN ('queued','sent','failed','replied')),
  sent_at    timestamptz,
  created_at timestamptz DEFAULT now()
);

-- templates テーブル
CREATE TABLE IF NOT EXISTS templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text CHECK (type IN ('email','linkedin_dm','form')),
  name       text NOT NULL UNIQUE,
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- contacts テーブル
CREATE TABLE IF NOT EXISTS contacts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name              text NOT NULL,
  email             text,
  linkedin_url      text,
  linkedin_url_type text CHECK (linkedin_url_type IN ('personal', 'company')),
  lang              text DEFAULT 'JA' CHECK (lang IN ('JA', 'EN')),
  is_primary        boolean DEFAULT false,
  created_at        timestamptz DEFAULT now()
);

-- outreach_history に contact_id を追加
ALTER TABLE outreach_history
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL;

-- companies から担当者フィールドを削除（マイグレーション後に実行）
-- ALTER TABLE companies DROP COLUMN contact_name;
-- ALTER TABLE companies DROP COLUMN email;
-- ALTER TABLE companies DROP COLUMN linkedin_url;
-- ALTER TABLE companies DROP COLUMN phone;

-- RLS ポリシー（開発中は無効化）
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- AUTH: profiles テーブル（認証ユーザーのロール管理）
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id    uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text NOT NULL,
  role  text NOT NULL DEFAULT 'member'
    CHECK (role IN ('admin', 'member')),
  created_at timestamptz DEFAULT now()
);

-- 新規ユーザー作成時に自動でprofilesを挿入するトリガー
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'member');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- RLS: profilesは認証ユーザーのみ自分のレコードを読める
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- companies/outreach_history/templates はサービスロールキーでアクセス（RLSバイパス）
-- 引き続き RLS 無効のまま（API routes が service_role で接続するため）
