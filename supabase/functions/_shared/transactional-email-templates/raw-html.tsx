import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Html, Preview } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface RawHtmlProps {
  subject?: string
  html?: string
  name?: string
}

const RawHtmlEmail = ({ subject, html }: RawHtmlProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{subject || 'GrabYourCar update'}</Preview>
    <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }}>
      <Container style={{ padding: '20px 25px', maxWidth: 600, margin: '0 auto' }}>
        {/* eslint-disable-next-line react/no-danger */}
        <div dangerouslySetInnerHTML={{ __html: html || '' }} />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RawHtmlEmail,
  subject: (data: Record<string, any>) => data?.subject || 'Update from GrabYourCar',
  displayName: 'Raw HTML (system use)',
  previewData: { subject: 'Sample subject', html: '<p>Sample <b>email</b> body</p>' },
} satisfies TemplateEntry
