import { Html, Body, Container, Text, Button, Hr, Head, Preview } from '@react-email/components'

interface Props {
  clientName: string
  csName: string
  docName: string
  returnNote: string
  portalUrl: string
}

export function DocReturnEmail({ clientName, csName, docName, returnNote, portalUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>書類の差し戻しについて - {docName}</Preview>
      <Body style={{ fontFamily: 'Hiragino Kaku Gothic ProN, Hiragino Sans, Meiryo, sans-serif', background: '#f5f4f0' }}>
        <Container style={{ background: '#fff', padding: '40px 32px', borderRadius: '12px', maxWidth: '560px', margin: '40px auto' }}>
          <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a1814', marginBottom: '24px' }}>
            書類の差し戻しについて
          </Text>
          <Text style={{ color: '#5a5650', lineHeight: '1.8' }}>
            {clientName} ご担当者様<br /><br />
            {csName}です。<br />
            提出いただいた書類について、修正をお願いしたい点がございます。
          </Text>
          <div style={{ background: '#fff5f5', borderLeft: '3px solid #b83232', padding: '16px', borderRadius: '4px', margin: '16px 0' }}>
            <Text style={{ fontWeight: 'bold', color: '#b83232', margin: '0 0 8px' }}>書類名: {docName}</Text>
            <Text style={{ color: '#3a3730', lineHeight: '1.7', margin: 0 }}>{returnNote}</Text>
          </div>
          <Text style={{ color: '#5a5650', lineHeight: '1.8' }}>
            修正の上、ポータルより再提出してください。
          </Text>
          <div style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button
              href={portalUrl}
              style={{ background: '#c45c1a', color: '#fff', padding: '14px 32px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold' }}
            >
              ポータルで再提出する
            </Button>
          </div>
          <Hr style={{ border: 'none', borderTop: '1px solid #e8e6e1', margin: '24px 0' }} />
          <Text style={{ fontSize: '12px', color: '#9b9890' }}>担当: {csName}（株式会社AZOO）</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default DocReturnEmail
