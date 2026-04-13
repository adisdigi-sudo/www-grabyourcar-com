import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "GrabYourCar"
const BRAND_COLOR = "#22A84E"

interface InsuranceWonProps {
  name?: string
  vehicleNumber?: string
  insurer?: string
  policyType?: string
  premium?: string
  policyNumber?: string
  expiryDate?: string
}

const InsuranceWonEmail = ({ name, vehicleNumber, insurer, policyType, premium, policyNumber, expiryDate }: InsuranceWonProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your motor insurance policy has been issued! 🎉</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logo}>{SITE_NAME} Insurance</Heading>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>
          {name ? `Congratulations ${name}! 🎉` : 'Congratulations! 🎉'}
        </Heading>
        <Text style={text}>
          Your motor insurance policy has been successfully issued. Here are your policy details:
        </Text>
        <Section style={detailsBox}>
          {policyNumber && <Text style={detailRow}><strong>Policy Number:</strong> {policyNumber}</Text>}
          {insurer && <Text style={detailRow}><strong>Insurer:</strong> {insurer}</Text>}
          {policyType && <Text style={detailRow}><strong>Policy Type:</strong> {policyType}</Text>}
          {vehicleNumber && <Text style={detailRow}><strong>Vehicle:</strong> {vehicleNumber}</Text>}
          {premium && <Text style={detailRow}><strong>Premium:</strong> ₹{premium}</Text>}
          {expiryDate && <Text style={detailRow}><strong>Valid Until:</strong> {expiryDate}</Text>}
        </Section>
        <Text style={text}>
          Your policy document will be shared with you shortly on WhatsApp. For any questions, we're just a message away!
        </Text>
        <Section style={{ textAlign: 'center' as const, margin: '30px 0' }}>
          <Button style={button} href="https://wa.me/919577200023">
            Chat with Us on WhatsApp 💬
          </Button>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>
          Thank you for choosing {SITE_NAME} Insurance!<br />Your trusted partner for all motor insurance needs.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InsuranceWonEmail,
  subject: (data: Record<string, any>) =>
    data?.vehicleNumber
      ? `Insurance Policy Issued – ${data.vehicleNumber} | ${SITE_NAME}`
      : `Your Insurance Policy is Ready | ${SITE_NAME}`,
  displayName: 'Insurance policy issued',
  previewData: { name: 'Rahul Sharma', vehicleNumber: 'DL 01 AB 1234', insurer: 'HDFC ERGO', policyType: 'Comprehensive', premium: '12,500', policyNumber: 'POL-2026-XYZ', expiryDate: 'April 13, 2027' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Work Sans', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logo = { fontSize: '24px', fontWeight: '700' as const, color: BRAND_COLOR, margin: '0' }
const divider = { borderColor: '#e5e7eb', margin: '15px 0' }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#1a1a1a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '16px 20px', margin: '0 0 16px', border: '1px solid #bbf7d0' }
const detailRow = { fontSize: '14px', color: '#374151', margin: '4px 0', lineHeight: '1.5' }
const button = { backgroundColor: BRAND_COLOR, color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' as const }
const footer = { fontSize: '13px', color: '#9ca3af', margin: '20px 0 0', lineHeight: '1.5' }
