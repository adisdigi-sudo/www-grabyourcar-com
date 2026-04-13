import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "GrabYourCar"
const BRAND_COLOR = "#22A84E"

interface RentalConfirmedProps {
  name?: string
  carName?: string
  pickupDate?: string
  returnDate?: string
  totalAmount?: string
  bookingId?: string
}

const RentalConfirmedEmail = ({ name, carName, pickupDate, returnDate, totalAmount, bookingId }: RentalConfirmedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your self-drive rental is confirmed! 🚗</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logo}>{SITE_NAME} Self-Drive</Heading>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>
          {name ? `Hi ${name}, your rental is confirmed! 🚗` : 'Rental Booking Confirmed! 🚗'}
        </Heading>
        <Text style={text}>
          Your self-drive rental has been confirmed. Here are your trip details:
        </Text>
        <Section style={detailsBox}>
          {bookingId && <Text style={detailRow}><strong>Booking ID:</strong> {bookingId}</Text>}
          {carName && <Text style={detailRow}><strong>Vehicle:</strong> {carName}</Text>}
          {pickupDate && <Text style={detailRow}><strong>Pickup:</strong> {pickupDate}</Text>}
          {returnDate && <Text style={detailRow}><strong>Return:</strong> {returnDate}</Text>}
          {totalAmount && <Text style={detailRow}><strong>Total:</strong> ₹{totalAmount}</Text>}
        </Section>
        <Text style={text}>
          Please carry your original driving license and Aadhaar card at the time of vehicle pickup. Our team will share the rental agreement for your signature.
        </Text>
        <Section style={{ textAlign: 'center' as const, margin: '30px 0' }}>
          <Button style={button} href="https://wa.me/919577200023">
            Contact Us on WhatsApp
          </Button>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>Happy driving! 🚗<br />The {SITE_NAME} Self-Drive Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RentalConfirmedEmail,
  subject: (data: Record<string, any>) =>
    data?.carName
      ? `Rental Confirmed – ${data.carName} | ${SITE_NAME}`
      : `Your Self-Drive Rental is Confirmed | ${SITE_NAME}`,
  displayName: 'Rental booking confirmed',
  previewData: { name: 'Neha Kapoor', carName: 'Maruti Swift ZXI', pickupDate: 'April 15, 2026 - 10:00 AM', returnDate: 'April 18, 2026 - 10:00 AM', totalAmount: '4,500', bookingId: 'RNT-2026-001' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Work Sans', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logo = { fontSize: '24px', fontWeight: '700' as const, color: BRAND_COLOR, margin: '0' }
const divider = { borderColor: '#e5e7eb', margin: '15px 0' }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#1a1a1a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#fefce8', borderRadius: '8px', padding: '16px 20px', margin: '0 0 16px', border: '1px solid #fde68a' }
const detailRow = { fontSize: '14px', color: '#374151', margin: '4px 0', lineHeight: '1.5' }
const button = { backgroundColor: BRAND_COLOR, color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' as const }
const footer = { fontSize: '13px', color: '#9ca3af', margin: '20px 0 0', lineHeight: '1.5' }
