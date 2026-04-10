export type ApplicationStatus =
  | '適格審査中'
  | '書類準備中'
  | '申請中'
  | '採択待ち'
  | '採択済'
  | '不採択'

export type PostGrantStatus =
  | '交付決定'
  | '事業実施'
  | '実績報告'
  | '補助金入金'
  | '効果報告1年目'
  | '効果報告2年目'
  | '効果報告3年目'
  | '完了'

export type DocumentStatus =
  | '未提出'
  | '提出済'
  | '確認中'
  | '承認済'
  | '差し戻し'

export type SenderType = 'customer' | 'cs'

export type EmailType =
  | 'deadline_alert'
  | 'doc_submitted'
  | 'portal_invite'
  | 'return'
  | 'reminder'

export interface Client {
  id: string
  name: string
  contact_name: string | null
  email: string
  portal_token: string | null
  token_expires_at: string | null
  token_sent_at: string | null
  hubspot_deal_id: string | null
  created_at: string
}

export interface Application {
  id: string
  client_id: string
  subsidy_type: string
  subsidy_frame: string | null
  status: ApplicationStatus
  amount: string | null
  deadline: string | null
  score: number | null
  cs_name: string | null
  cs_email: string | null
  slack_channel: string | null
  ai_result: AiResult | null
  notes: string | null
  application_round: string | null
  program_id: string | null
  round_id: string | null
  tool_name: string | null
  quote_amount: number | null
  subsidy_amount: number | null
  gbiz_id_status: string | null
  security_action_done: boolean
  miradeji_done: boolean
  post_grant_status: PostGrantStatus | null
  post_grant_notes: string | null
  created_at: string
  clients?: Client
}

export interface Document {
  id: string
  application_id: string
  name: string
  required: boolean
  status: DocumentStatus
  file_url: string | null
  file_name: string | null
  note: string | null
  submitted_at: string | null
  updated_at: string
}

export interface Message {
  id: string
  application_id: string
  sender_type: SenderType
  sender_name: string
  content: string
  slack_ts: string | null
  slack_channel: string | null
  from_slack: boolean
  created_at: string
}

export interface EmailLog {
  id: string
  application_id: string | null
  type: EmailType | null
  subject: string | null
  to_email: string | null
  status: string
  sent_at: string
  via: string
}

export interface ScreeningLog {
  id: string
  application_id: string | null
  client_name: string | null
  score: number | null
  eligible: boolean | null
  frame: string | null
  result: AiResult | null
  created_at: string
}

export interface AiResult {
  score: number
  eligible: boolean
  frame: string
  maxAmount: string
  subsidyRate: string
  reasons: string[]
  requiredDocs: string[]
  risks: string[]
  nextAction: string
}
