import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "GrabYourCar"
const BRAND_COLOR = "#22A84E"

interface FollowUpScheduledProps {
  name?: string
  followUpDate?: string
  followUpTime?: string
  agentName?: string
  service?: string
}

const FollowUpScheduledEmail = ({ name, followUpDate, followUpTime, agentName, service }: FollowUpScheduledProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your callback is scheduled – {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logo}>{SITE_NAME}</Heading>
        </Section>
        <Hr style={divider} />
        <Section style={scheduleBox}>
          <Text style={scheduleText}>📅 Callback Scheduled</Text>
        </Section>
        <Heading style={h1}>
          {name ? `Hi ${name}, your call is booked!` : 'Your call is booked!'}
        </Heading>
        <Text style={text}>
          We've scheduled a callback for you. Our expert will call you at the scheduled time.
        </Text>
        <Section style={detailsBox}>
          {followUpDate && <Text style={detailRow}><strong>Date:</strong> {followUpDate}</Text>}
          {followUpTime && <Text style={detailRow}><strong>Time:</strong> {followUpTime}</Text>}
          {agentName && <Text style={detailRow}><strong>Your Expert:</strong> {agentName}</Text>}
          {service && <Text style={detailRow}><strong>Service:</strong> {service}</Text>}
        </Section>
        <Text style={text}>
          Can't make it? No worries — just reply to this email or WhatsApp us at +91 95772 00023 to reschedule.
        </Text>
        <Section style={{ textAlign: 'center' as const, margin: '30px 0' }}>
          <Button style={button} href="https://wa.me/919577200023">
            Chat on WhatsApp
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
  component: FollowUpScheduledEmail,
  subject: (data: Record<string, any>) =>
    data?.followUpDate
      ? `Callback Scheduled for ${data.followUpDate} | ${SITE_NAME}`
      : `Your Callback is Scheduled | ${SITE_NAME}`,
  displayName: 'Follow-up scheduled',
  previewData: { name: 'Priya', followUpDate: 'April 14, 2026', followUpTime: '11:00 AM', agentName: 'Anshdeep', service: 'Car Insurance' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Work Sans', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logo = { fontSize: '24px', fontWeight: '700' as const, color: BRAND_COLOR, margin: '0' }
const divider = { borderColor: '#e5e7eb', margin: '15px 0' }
const scheduleBox = { backgroundColor: '#EFF6FF', borderRadius: '8px', padding: '12px 16px', margin: '0 0 16px', textAlign: 'center' as const }
const scheduleText = { fontSize: '16px', fontWeight: '600' as const, color: '#1E40AF', margin: '0' }
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
