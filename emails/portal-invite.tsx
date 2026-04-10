import { Html, Body, Container, Text, Button, Hr, Head, Preview } from '@react-email/components'

interface Props {
  clientName: string
  csName: string
  portalUrl: string
  expiryDate: string
  subsidyName: string
}

export function PortalInviteEmail({ clientName, csName, portalUrl, expiryDate, subsidyName }: Props) {
  return (
    <Html>
      <Head />
      <Preview>補助金サポートポータルのご案内 - {subsidyName}</Preview>
      <Body style={{ fontFamily: 'Hiragino Kaku Gothic ProN, Hiragino Sans, Meiryo, sans-serif', background: '#f5f4f0', margin: 0, padding: 0 }}>
        <Container style={{ background: '#fff', padding: '40px 32px', borderRadius: '12px', maxWidth: '560px', margin: '40px auto', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <Text style={{ fontSize: '22px', fontWeight: 'bold', color: '#1a1814', margin: '0 0 24px' }}>
            補助金サポートポータルのご案内
          </Text>
          <Text style={{ color: '#5a5650', lineHeight: '1.8', fontSize: '15px' }}>
            {clientName} ご担当者様<br /><br />
            株式会社AZOOの{csName}です。<br />
            お客様専用の補助金サポートポータルをご用意いたしました。<br />
            以下のボタンよりアクセスし、申請状況のご確認や書類の提出をお願いいたします。
          </Text>
          <Text style={{ fontWeight: 'bold', color: '#1a1814', background: '#fff8f0', padding: '12px 16px', borderRadius: '8px', borderLeft: '3px solid #c45c1a' }}>
            対象補助金: {subsidyName}
          </Text>
          <div style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button
              href={portalUrl}
              style={{
                background: '#c45c1a',
                color: '#fff',
                padding: '14px 32px',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 'bold',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              ポータルを開く →
            </Button>
          </div>
          <Hr style={{ border: 'none', borderTop: '1px solid #e8e6e1', margin: '24px 0' }} />
          <Text style={{ fontSize: '12px', color: '#9b9890', lineHeight: '1.6' }}>
            このURLの有効期限: {expiryDate}<br />
            担当: {csName}（株式会社AZOO）<br /><br />
            ※このメールに心当たりがない場合はお手数ですが破棄してください。
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default PortalInviteEmail
