import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "GrabYourCar"
const BRAND_COLOR = "#22A84E"

interface PaymentReceiptProps {
  name?: string
  amount?: string
  paymentId?: string
  service?: string
  paymentDate?: string
  paymentMode?: string
}

const PaymentReceiptEmail = ({ name, amount, paymentId, service, paymentDate, paymentMode }: PaymentReceiptProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment of ₹{amount || '0'} received – {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logo}>{SITE_NAME}</Heading>
        </Section>
        <Hr style={divider} />
        <Section style={successBox}>
          <Text style={successText}>✅ Payment Received</Text>
        </Section>
        <Heading style={h1}>
          {name ? `Thank you, ${name}!` : 'Thank you for your payment!'}
        </Heading>
        <Text style={text}>
          We have successfully received your payment. Here are the details:
        </Text>
        <Section style={detailsBox}>
          {amount && <Text style={detailRow}><strong>Amount:</strong> ₹{amount}</Text>}
          {paymentId && <Text style={detailRow}><strong>Transaction ID:</strong> {paymentId}</Text>}
          {service && <Text style={detailRow}><strong>Service:</strong> {service}</Text>}
          {paymentDate && <Text style={detailRow}><strong>Date:</strong> {paymentDate}</Text>}
          {paymentMode && <Text style={detailRow}><strong>Mode:</strong> {paymentMode}</Text>}
        </Section>
        <Text style={text}>
          A detailed invoice will be shared with you separately. For any queries, feel free to contact us.
        </Text>
        <Section style={{ textAlign: 'center' as const, margin: '30px 0' }}>
          <Button style={button} href="https://www.grabyourcar.com">
            Visit GrabYourCar
          </Button>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>
          Best regards,<br />The {SITE_NAME} Accounts Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentReceiptEmail,
  subject: (data: Record<string, any>) =>
    data?.amount
      ? `Payment of ₹${data.amount} Received | ${SITE_NAME}`
      : `Payment Received | ${SITE_NAME}`,
  displayName: 'Payment receipt',
  previewData: { name: 'Rahul', amount: '25,000', paymentId: 'PAY-20260413-XYZ', service: 'Car Insurance', paymentDate: 'April 13, 2026', paymentMode: 'UPI' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Work Sans', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logo = { fontSize: '24px', fontWeight: '700' as const, color: BRAND_COLOR, margin: '0' }
const divider = { borderColor: '#e5e7eb', margin: '15px 0' }
const successBox = { backgroundColor: '#ECFDF5', borderRadius: '8px', padding: '12px 16px', margin: '0 0 16px', textAlign: 'center' as const }
const successText = { fontSize: '16px', fontWeight: '600' as const, color: '#065F46', margin: '0' }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#1a1a1a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px 20px', margin: '0 0 16px' }
const detailRow = { fontSize: '14px', color: '#374151', margin: '4px 0', lineHeight: '1.5' }
const button = {
  backgroundColor: BRAND_COLOR,
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const footer = { fontSize: '13px', color: '#9ca3af', margin: '20px 0 0', lineHeight: '1.5' }
