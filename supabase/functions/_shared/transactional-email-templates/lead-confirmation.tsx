import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "GrabYourCar"
const BRAND_COLOR = "#22A84E"

interface LeadConfirmationProps {
  name?: string
  service?: string
  leadId?: string
}

const LeadConfirmationEmail = ({ name, service, leadId }: LeadConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Thanks for your enquiry – {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logo}>{SITE_NAME}</Heading>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>
          {name ? `Hi ${name}, we've received your enquiry!` : 'We've received your enquiry!'}
        </Heading>
        <Text style={text}>
          Thank you for reaching out to {SITE_NAME}. Our team has received your request and will contact you shortly.
        </Text>
        {(service || leadId) && (
          <Section style={detailsBox}>
            {service && <Text style={detailRow}><strong>Service:</strong> {service}</Text>}
            {leadId && <Text style={detailRow}><strong>Reference:</strong> {leadId}</Text>}
          </Section>
        )}
        <Text style={text}>
          One of our experts will reach out to you within the next few hours. You can also call us directly for immediate assistance.
        </Text>
        <Section style={{ textAlign: 'center' as const, margin: '30px 0' }}>
          <Button style={button} href="https://www.grabyourcar.com">
            Visit GrabYourCar
          </Button>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>
          Best regards,<br />The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LeadConfirmationEmail,
  subject: (data: Record<string, any>) =>
    data?.service
      ? `Enquiry Received – ${data.service} | ${SITE_NAME}`
      : `We've Received Your Enquiry | ${SITE_NAME}`,
  displayName: 'Lead confirmation',
  previewData: { name: 'Rahul', service: 'New Car Booking', leadId: 'GYC-L-12345' },
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
