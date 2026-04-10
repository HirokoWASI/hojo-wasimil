import { Html, Body, Container, Text, Button, Hr, Head, Preview, Section } from '@react-email/components'

interface Props {
  clientName: string
  csName: string
  subsidyName: string
  daysLeft: number
  deadline: string
  pendingDocs: string[]
  portalUrl: string
}

export function DeadlineAlertEmail({ clientName, csName, subsidyName, daysLeft, deadline, pendingDocs, portalUrl }: Props) {
  const isUrgent = daysLeft <= 7

  return (
    <Html>
      <Head />
      <Preview>{`【重要】${subsidyName}の申請期限まで残り${daysLeft}日`}</Preview>
      <Body style={{ fontFamily: 'Hiragino Kaku Gothic ProN, Hiragino Sans, Meiryo, sans-serif', background: '#f5f4f0' }}>
        <Container style={{ background: '#fff', padding: '40px 32px', borderRadius: '12px', maxWidth: '560px', margin: '40px auto' }}>
          <div style={{ background: isUrgent ? '#b83232' : '#c45c1a', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', textAlign: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px', margin: 0 }}>
              ⚠ 申請期限まで残り<span style={{ fontSize: '24px' }}>{daysLeft}</span>日
            </Text>
          </div>

          <Text style={{ color: '#5a5650', lineHeight: '1.8' }}>
            {clientName} ご担当者様<br /><br />
            {csName}です。<br />
            <strong>{subsidyName}</strong>の申請期限（{deadline}）が近づいています。
          </Text>

          {pendingDocs.length > 0 && (
            <Section style={{ background: '#fff8f0', borderLeft: '3px solid #c45c1a', padding: '16px', borderRadius: '4px', margin: '16px 0' }}>
              <Text style={{ fontWeight: 'bold', color: '#1a1814', margin: '0 0 8px', fontSize: '14px' }}>
                未提出・差し戻し書類 ({pendingDocs.length}件)
              </Text>
              {pendingDocs.map((doc, i) => (
                <Text key={i} style={{ color: '#5a5650', margin: '4px 0', fontSize: '14px' }}>
                  • {doc}
                </Text>
              ))}
            </Section>
          )}

          <div style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button
              href={portalUrl}
              style={{
                background: '#c45c1a',
                color: '#fff',
                padding: '14px 32px',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 'bold',
              }}
            >
              ポータルで確認する
            </Button>
          </div>

          <Hr style={{ border: 'none', borderTop: '1px solid #e8e6e1', margin: '24px 0' }} />
          <Text style={{ fontSize: '12px', color: '#9b9890' }}>
            担当: {csName}（株式会社AZOO）
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default DeadlineAlertEmail
