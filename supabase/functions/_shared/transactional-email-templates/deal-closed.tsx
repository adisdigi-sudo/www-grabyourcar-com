import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "GrabYourCar"
const BRAND_COLOR = "#22A84E"

interface DealClosedProps {
  name?: string
  dealNumber?: string
  carName?: string
  amount?: string
  vertical?: string
}

const DealClosedEmail = ({ name, dealNumber, carName, amount, vertical }: DealClosedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your deal with {SITE_NAME} is complete! 🚗</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logo}>{SITE_NAME}</Heading>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>
          {name ? `Thank you, ${name}! 🎊` : 'Deal Completed Successfully! 🎊'}
        </Heading>
        <Text style={text}>
          We're thrilled to confirm that your deal has been successfully completed. Welcome to the {SITE_NAME} family!
        </Text>
        <Section style={detailsBox}>
          {dealNumber && <Text style={detailRow}><strong>Deal ID:</strong> {dealNumber}</Text>}
          {carName && <Text style={detailRow}><strong>Vehicle:</strong> {carName}</Text>}
          {vertical && <Text style={detailRow}><strong>Service:</strong> {vertical}</Text>}
          {amount && <Text style={detailRow}><strong>Amount:</strong> ₹{amount}</Text>}
        </Section>
        <Text style={text}>
          Our team will follow up with you for any next steps. If you need anything, don't hesitate to reach out!
        </Text>
        <Section style={{ textAlign: 'center' as const, margin: '30px 0' }}>
          <Button style={button} href="https://wa.me/919577200023">
            Contact Us on WhatsApp
          </Button>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>Best regards,<br />The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DealClosedEmail,
  subject: (data: Record<string, any>) =>
    data?.carName
      ? `Deal Complete – ${data.carName} | ${SITE_NAME}`
      : `Your Deal is Complete | ${SITE_NAME}`,
  displayName: 'Deal closed confirmation',
  previewData: { name: 'Vikram Singh', dealNumber: 'GYC-DEAL-001', carName: 'Hyundai Creta SX', amount: '15,50,000', vertical: 'Car Sales' },
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
const button = { backgroundColor: BRAND_COLOR, color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' as const }
const footer = { fontSize: '13px', color: '#9ca3af', margin: '20px 0 0', lineHeight: '1.5' }
