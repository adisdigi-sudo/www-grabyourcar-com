import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "GrabYourCar"
const BRAND_COLOR = "#22A84E"

interface LoanDisbursedProps {
  name?: string
  loanAmount?: string
  lenderName?: string
  disbursementDate?: string
  emiAmount?: string
}

const LoanDisbursedEmail = ({ name, loanAmount, lenderName, disbursementDate, emiAmount }: LoanDisbursedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your car loan has been disbursed! 🏦</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logo}>{SITE_NAME} Loans</Heading>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>
          {name ? `Great news, ${name}! 🏦` : 'Loan Disbursed Successfully! 🏦'}
        </Heading>
        <Text style={text}>
          Your car loan has been successfully disbursed. Here are the details:
        </Text>
        <Section style={detailsBox}>
          {loanAmount && <Text style={detailRow}><strong>Loan Amount:</strong> ₹{loanAmount}</Text>}
          {lenderName && <Text style={detailRow}><strong>Lender:</strong> {lenderName}</Text>}
          {disbursementDate && <Text style={detailRow}><strong>Disbursement Date:</strong> {disbursementDate}</Text>}
          {emiAmount && <Text style={detailRow}><strong>Monthly EMI:</strong> ₹{emiAmount}</Text>}
        </Section>
        <Text style={text}>
          Your EMI schedule will begin as per your agreement with {lenderName || 'the bank'}. For any loan-related queries, we're here to help!
        </Text>
        <Section style={{ textAlign: 'center' as const, margin: '30px 0' }}>
          <Button style={button} href="https://wa.me/919577200023">
            Need Help? Chat with Us
          </Button>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>Best regards,<br />The {SITE_NAME} Loans Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LoanDisbursedEmail,
  subject: (data: Record<string, any>) =>
    data?.loanAmount
      ? `Loan Disbursed – ₹${data.loanAmount} | ${SITE_NAME}`
      : `Your Car Loan has been Disbursed | ${SITE_NAME}`,
  displayName: 'Loan disbursement confirmation',
  previewData: { name: 'Priya Gupta', loanAmount: '8,50,000', lenderName: 'HDFC Bank', disbursementDate: 'April 13, 2026', emiAmount: '18,500' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Work Sans', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logo = { fontSize: '24px', fontWeight: '700' as const, color: BRAND_COLOR, margin: '0' }
const divider = { borderColor: '#e5e7eb', margin: '15px 0' }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#1a1a1a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#eff6ff', borderRadius: '8px', padding: '16px 20px', margin: '0 0 16px', border: '1px solid #bfdbfe' }
const detailRow = { fontSize: '14px', color: '#374151', margin: '4px 0', lineHeight: '1.5' }
const button = { backgroundColor: BRAND_COLOR, color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' as const }
const footer = { fontSize: '13px', color: '#9ca3af', margin: '20px 0 0', lineHeight: '1.5' }
