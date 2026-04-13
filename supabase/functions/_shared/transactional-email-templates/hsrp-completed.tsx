import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "GrabYourCar"
const BRAND_COLOR = "#22A84E"

interface HsrpCompletedProps {
  name?: string
  registrationNumber?: string
  serviceType?: string
  bookingId?: string
}

const HsrpCompletedEmail = ({ name, registrationNumber, serviceType, bookingId }: HsrpCompletedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your HSRP order is complete! ✅</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logo}>{SITE_NAME} HSRP</Heading>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>
          {name ? `Hi ${name}, your HSRP is ready! ✅` : 'HSRP Order Completed! ✅'}
        </Heading>
        <Text style={text}>
          Your HSRP (High Security Registration Plate) order has been successfully completed.
        </Text>
        <Section style={detailsBox}>
          {bookingId && <Text style={detailRow}><strong>Order ID:</strong> {bookingId}</Text>}
          {registrationNumber && <Text style={detailRow}><strong>Registration:</strong> {registrationNumber}</Text>}
          {serviceType && <Text style={detailRow}><strong>Service:</strong> {serviceType}</Text>}
          <Text style={detailRow}><strong>Status:</strong> ✅ Completed</Text>
        </Section>
        <Text style={text}>
          Thank you for choosing {SITE_NAME} for your HSRP needs. If you need any further assistance, we're always here to help!
        </Text>
        <Hr style={divider} />
        <Text style={footer}>Best regards,<br />The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: HsrpCompletedEmail,
  subject: (data: Record<string, any>) =>
    data?.registrationNumber
      ? `HSRP Complete – ${data.registrationNumber} | ${SITE_NAME}`
      : `Your HSRP Order is Complete | ${SITE_NAME}`,
  displayName: 'HSRP order completed',
  previewData: { name: 'Amit Kumar', registrationNumber: 'DL 05 CD 5678', serviceType: 'Both Plates', bookingId: 'HSRP-2026-001' },
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
const footer = { fontSize: '13px', color: '#9ca3af', margin: '20px 0 0', lineHeight: '1.5' }
