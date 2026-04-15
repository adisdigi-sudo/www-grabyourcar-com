import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "GrabYourCar"
const BRAND_COLOR = "#22A84E"
const WARN_COLOR = "#F59E0B"

interface RenewalReminderProps {
  name?: string
  policyNumber?: string
  vehicleNumber?: string
  expiryDate?: string
  insuranceCompany?: string
}

const RenewalReminderEmail = ({ name, policyNumber, vehicleNumber, expiryDate, insuranceCompany }: RenewalReminderProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your insurance is expiring soon – renew now with {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logo}>{SITE_NAME}</Heading>
        </Section>
        <Hr style={divider} />
        <Section style={alertBox}>
          <Text style={alertText}>⚠️ Insurance Expiring Soon</Text>
        </Section>
        <Heading style={h1}>
          {name ? `Hi ${name}, your insurance is due for renewal` : 'Your insurance is due for renewal'}
        </Heading>
        <Text style={text}>
          Don't let your vehicle insurance lapse. Renew now to stay protected and avoid penalties.
        </Text>
        <Section style={detailsBox}>
          {vehicleNumber && <Text style={detailRow}><strong>Vehicle:</strong> {vehicleNumber}</Text>}
          {policyNumber && <Text style={detailRow}><strong>Policy #:</strong> {policyNumber}</Text>}
          {insuranceCompany && <Text style={detailRow}><strong>Insurer:</strong> {insuranceCompany}</Text>}
          {expiryDate && <Text style={detailRow}><strong>Expiry Date:</strong> {expiryDate}</Text>}
        </Section>
        <Section style={{ textAlign: 'center' as const, margin: '30px 0' }}>
          <Button style={button} href="https://www.grabyourcar.com/insurance">
            Renew Now – Get Best Quote
          </Button>
        </Section>
        <Text style={text}>
          We compare 15+ insurers to get you the best deal. Our team will assist you with the entire renewal process.
        </Text>
        <Hr style={divider} />
        <Text style={footer}>
          Best regards,<br />The {SITE_NAME} Insurance Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RenewalReminderEmail,
  subject: (data: Record<string, any>) =>
    data?.vehicleNumber
      ? `Insurance Expiring – ${data.vehicleNumber} | ${SITE_NAME}`
      : `Your Insurance is Expiring Soon | ${SITE_NAME}`,
  displayName: 'Renewal reminder',
  previewData: { name: 'Vikram', policyNumber: 'POL-2025-78901', vehicleNumber: 'PB-65-AB-1234', expiryDate: 'April 25, 2026', insuranceCompany: 'ICICI Lombard' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Work Sans', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logo = { fontSize: '24px', fontWeight: '700' as const, color: BRAND_COLOR, margin: '0' }
const divider = { borderColor: '#e5e7eb', margin: '15px 0' }
const alertBox = { backgroundColor: '#FEF3C7', borderRadius: '8px', padding: '12px 16px', margin: '0 0 16px', textAlign: 'center' as const }
const alertText = { fontSize: '16px', fontWeight: '600' as const, color: '#92400E', margin: '0' }
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
