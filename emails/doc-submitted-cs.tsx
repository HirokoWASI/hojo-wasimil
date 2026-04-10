import { Html, Body, Container, Text, Button, Hr, Head, Preview } from '@react-email/components'

interface Props {
  clientName: string
  senderName: string
  docName: string
  adminUrl: string
}

export function DocSubmittedCsEmail({ clientName, senderName, docName, adminUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>[書類提出] {clientName} から新着: {docName}</Preview>
      <Body style={{ fontFamily: 'Hiragino Kaku Gothic ProN, Hiragino Sans, Meiryo, sans-serif', background: '#f5f4f0' }}>
        <Container style={{ background: '#fff', padding: '40px 32px', borderRadius: '12px', maxWidth: '560px', margin: '40px auto' }}>
          <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a1814', marginBottom: '24px' }}>
            📄 書類が提出されました
          </Text>
          <div style={{ background: '#f0f7ff', borderLeft: '3px solid #1a5fa8', padding: '16px', borderRadius: '4px', margin: '16px 0' }}>
            <Text style={{ margin: '0 0 4px', color: '#1a5fa8', fontWeight: 'bold' }}>{clientName}</Text>
            <Text style={{ margin: '0 0 4px', color: '#3a3730' }}>送信者: {senderName}</Text>
            <Text style={{ margin: 0, color: '#3a3730' }}>書類名: {docName}</Text>
          </div>
          <div style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button
              href={adminUrl}
              style={{ background: '#c45c1a', color: '#fff', padding: '14px 32px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold' }}
            >
              管理画面で確認する
            </Button>
          </div>
          <Hr style={{ border: 'none', borderTop: '1px solid #e8e6e1', margin: '24px 0' }} />
          <Text style={{ fontSize: '12px', color: '#9b9890' }}>WASIMIL 補助金サポートシステム</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default DocSubmittedCsEmail
