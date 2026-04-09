import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "GrabYourCar"
const BRAND_COLOR = "#22A84E"

interface WelcomeEmailProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {SITE_NAME} – Your car journey starts here!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logo}>{SITE_NAME}</Heading>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>
          {name ? `Welcome aboard, ${name}! 🚗` : 'Welcome aboard! 🚗'}
        </Heading>
        <Text style={text}>
          Thanks for joining {SITE_NAME}! We're excited to help you find the perfect car.
          Whether you're looking for the best deals, comparing models, or exploring financing options — we've got you covered.
        </Text>
        <Text style={text}>Here's what you can do:</Text>
        <Section style={featureList}>
          <Text style={featureItem}>🔍 Browse & compare cars across brands</Text>
          <Text style={featureItem}>💰 Get instant on-road price quotes</Text>
          <Text style={featureItem}>🛡️ Explore car insurance options</Text>
          <Text style={featureItem}>📋 Book test drives & track your bookings</Text>
        </Section>
        <Section style={{ textAlign: 'center' as const, margin: '30px 0' }}>
          <Button style={button} href="https://www.grabyourcar.com/cars">
            Explore Cars
          </Button>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>
          Happy car hunting!<br />The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: `Welcome to ${SITE_NAME}! 🚗`,
  displayName: 'Welcome email',
  previewData: { name: 'Anshdeep' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Work Sans', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logo = { fontSize: '24px', fontWeight: '700' as const, color: BRAND_COLOR, margin: '0' }
const divider = { borderColor: '#e5e7eb', margin: '15px 0' }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#1a1a1a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 16px' }
const featureList = { margin: '0 0 16px', padding: '0 10px' }
const featureItem = { fontSize: '14px', color: '#374151', margin: '6px 0', lineHeight: '1.5' }
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
