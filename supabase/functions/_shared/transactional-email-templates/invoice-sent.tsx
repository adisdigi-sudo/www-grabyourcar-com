import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "GrabYourCar"
const BRAND_COLOR = "#22A84E"

interface InvoiceSentProps {
  name?: string
  invoiceNumber?: string
  amount?: string
  dueDate?: string
  vertical?: string
}

const InvoiceSentEmail = ({ name, invoiceNumber, amount, dueDate, vertical }: InvoiceSentProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Invoice {invoiceNumber || ''} from {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logo}>{SITE_NAME}</Heading>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>
          {name ? `Hi ${name}, your invoice is ready` : 'Your invoice is ready'}
        </Heading>
        <Text style={text}>
          Please find the details of your invoice below. You can make the payment via UPI, bank transfer, or any other preferred method.
        </Text>
        <Section style={detailsBox}>
          {invoiceNumber && <Text style={detailRow}><strong>Invoice #:</strong> {invoiceNumber}</Text>}
          {amount && <Text style={detailRow}><strong>Amount:</strong> ₹{amount}</Text>}
          {dueDate && <Text style={detailRow}><strong>Due Date:</strong> {dueDate}</Text>}
          {vertical && <Text style={detailRow}><strong>Service:</strong> {vertical}</Text>}
        </Section>
        <Section style={{ textAlign: 'center' as const, margin: '30px 0' }}>
          <Button style={button} href="https://www.grabyourcar.com">
            View Invoice
          </Button>
        </Section>
        <Text style={text}>
          If you have any questions about this invoice, please don't hesitate to contact us.
        </Text>
        <Hr style={divider} />
        <Text style={footer}>
          Best regards,<br />The {SITE_NAME} Accounts Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InvoiceSentEmail,
  subject: (data: Record<string, any>) =>
    data?.invoiceNumber
      ? `Invoice ${data.invoiceNumber} – ${SITE_NAME}`
      : `Your Invoice from ${SITE_NAME}`,
  displayName: 'Invoice sent',
  previewData: { name: 'Anshdeep', invoiceNumber: 'INV-2026-001', amount: '45,000', dueDate: 'April 20, 2026', vertical: 'Car Insurance' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Work Sans', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logo = { fontSize: '24px', fontWeight: '700' as const, color: BRAND_COLOR, margin: '0' }
const divider = { borderColor: '#e5e7eb', margin: '15px 0' }
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
