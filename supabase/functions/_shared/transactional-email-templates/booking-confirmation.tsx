import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "GrabYourCar"
const BRAND_COLOR = "#22A84E"

interface BookingConfirmationProps {
  name?: string
  bookingId?: string
  carName?: string
  bookingDate?: string
}

const BookingConfirmationEmail = ({ name, bookingId, carName, bookingDate }: BookingConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your booking with {SITE_NAME} is confirmed!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logo}>{SITE_NAME}</Heading>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>
          {name ? `Hey ${name}, your booking is confirmed! 🎉` : 'Your booking is confirmed! 🎉'}
        </Heading>
        <Text style={text}>
          Thank you for choosing {SITE_NAME}. We've received your booking and our team will be in touch shortly.
        </Text>
        {(bookingId || carName || bookingDate) && (
          <Section style={detailsBox}>
            {bookingId && <Text style={detailRow}><strong>Booking ID:</strong> {bookingId}</Text>}
            {carName && <Text style={detailRow}><strong>Vehicle:</strong> {carName}</Text>}
            {bookingDate && <Text style={detailRow}><strong>Date:</strong> {bookingDate}</Text>}
          </Section>
        )}
        <Section style={{ textAlign: 'center' as const, margin: '30px 0' }}>
          <Button style={button} href="https://www.grabyourcar.com/my-bookings">
            View My Bookings
          </Button>
        </Section>
        <Text style={text}>
          If you have any questions, feel free to reach out to us on WhatsApp or call us directly.
        </Text>
        <Hr style={divider} />
        <Text style={footer}>
          Best regards,<br />The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingConfirmationEmail,
  subject: (data: Record<string, any>) =>
    data?.carName
      ? `Booking Confirmed – ${data.carName} | ${SITE_NAME}`
      : `Your Booking is Confirmed | ${SITE_NAME}`,
  displayName: 'Booking confirmation',
  previewData: { name: 'Anshdeep', bookingId: 'GYC-20260409-ABC123', carName: 'Maruti Brezza ZXI+', bookingDate: 'April 9, 2026' },
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
