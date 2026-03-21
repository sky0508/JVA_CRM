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

-- RLS ポリシー（開発中は無効化）
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE templates DISABLE ROW LEVEL SECURITY;
