-- 顧客テーブル
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT NOT NULL,
  portal_token UUID UNIQUE DEFAULT gen_random_uuid(),
  token_expires_at TIMESTAMPTZ,
  token_sent_at TIMESTAMPTZ,
  hubspot_deal_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 補助金申請案件テーブル
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  subsidy_type TEXT NOT NULL,
  subsidy_frame TEXT,
  status TEXT DEFAULT '適格審査中',
  amount TEXT,
  deadline DATE,
  score INTEGER,
  cs_name TEXT,
  cs_email TEXT,
  slack_channel TEXT,
  ai_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 書類管理テーブル
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  required BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT '未提出',
  file_url TEXT,
  file_name TEXT,
  note TEXT,
  submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- メッセージ（チャット）テーブル
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  slack_ts TEXT,
  slack_channel TEXT,
  from_slack BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- メール送信ログ
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id),
  type TEXT,
  subject TEXT,
  to_email TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  via TEXT DEFAULT 'resend'
);

-- AI診断ログ
CREATE TABLE screening_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID,
  client_name TEXT,
  score INTEGER,
  eligible BOOLEAN,
  frame TEXT,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS（Row Level Security）設定
ALTER TABLE clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages     ENABLE ROW LEVEL SECURITY;

-- 顧客ポータル: portal_token一致時のみ自分のデータを取得可
CREATE POLICY "portal_token_access" ON applications
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients WHERE portal_token = current_setting('app.portal_token', TRUE)::UUID
    )
  );

CREATE POLICY "portal_token_docs" ON documents
  FOR SELECT USING (
    application_id IN (
      SELECT a.id FROM applications a
      JOIN clients c ON c.id = a.client_id
      WHERE c.portal_token = current_setting('app.portal_token', TRUE)::UUID
    )
  );

CREATE POLICY "portal_insert_messages" ON messages
  FOR INSERT WITH CHECK (
    application_id IN (
      SELECT a.id FROM applications a
      JOIN clients c ON c.id = a.client_id
      WHERE c.portal_token = current_setting('app.portal_token', TRUE)::UUID
    )
  );

CREATE POLICY "portal_select_messages" ON messages
  FOR SELECT USING (
    application_id IN (
      SELECT a.id FROM applications a
      JOIN clients c ON c.id = a.client_id
      WHERE c.portal_token = current_setting('app.portal_token', TRUE)::UUID
    )
  );

-- portal_docs: 書類アップロード（INSERT）も許可
CREATE POLICY "portal_insert_docs" ON documents
  FOR INSERT WITH CHECK (
    application_id IN (
      SELECT a.id FROM applications a
      JOIN clients c ON c.id = a.client_id
      WHERE c.portal_token = current_setting('app.portal_token', TRUE)::UUID
    )
  );

-- Supabase Storage バケット作成（CLIで実行）
-- supabase storage create documents --public false
