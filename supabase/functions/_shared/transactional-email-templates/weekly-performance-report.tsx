import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "GrabYourCar"
const BRAND_COLOR = "#22A84E"

interface WeeklyReportProps {
  recipientName?: string
  weekRange?: string
  totalLeads?: number
  totalClosed?: number
  totalRevenue?: string
  conversionRate?: string
  teamRankings?: string
  topPerformer?: string
  areasToImprove?: string
  weeklyGoalAchieved?: string
  nextWeekFocus?: string
}

const WeeklyPerformanceEmail = (props: WeeklyReportProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>📈 Weekly Performance — {props.weekRange || 'This Week'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logo}>{SITE_NAME}</Heading>
          <Text style={tagline}>Weekly Performance Report</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>📈 Weekly Performance</Heading>
        <Text style={dateText}>{props.weekRange || 'This Week'}</Text>
        {props.recipientName && <Text style={text}>Hi {props.recipientName},</Text>}

        <Section style={statsGrid}>
          <Row>
            <Column style={statBox}>
              <Text style={statNumber}>{props.totalLeads ?? 0}</Text>
              <Text style={statLabel}>Leads</Text>
            </Column>
            <Column style={statBox}>
              <Text style={statNumber}>{props.totalClosed ?? 0}</Text>
              <Text style={statLabel}>Closed</Text>
            </Column>
            <Column style={statBox}>
              <Text style={{...statNumber, color: BRAND_COLOR}}>{props.totalRevenue || '₹0'}</Text>
              <Text style={statLabel}>Revenue</Text>
            </Column>
            <Column style={statBox}>
              <Text style={statNumber}>{props.conversionRate || '0%'}</Text>
              <Text style={statLabel}>Conversion</Text>
            </Column>
          </Row>
        </Section>

        {props.weeklyGoalAchieved && (
          <Section style={{...alertSection, backgroundColor: '#f0fdf4'}}>
            <Heading style={h2}>🎯 Goal Achievement</Heading>
            <Text style={text}>{props.weeklyGoalAchieved}</Text>
          </Section>
        )}

        {props.teamRankings && (
          <Section style={alertSection}>
            <Heading style={h2}>🏅 Team Rankings</Heading>
            <Text style={preText}>{props.teamRankings}</Text>
          </Section>
        )}

        {props.topPerformer && (
          <Section style={{...alertSection, backgroundColor: '#fffbeb'}}>
            <Heading style={h2}>⭐ Star of the Week</Heading>
            <Text style={text}>{props.topPerformer}</Text>
          </Section>
        )}

        {props.areasToImprove && (
          <Section style={alertSection}>
            <Heading style={h2}>📌 Areas to Improve</Heading>
            <Text style={text}>{props.areasToImprove}</Text>
          </Section>
        )}

        {props.nextWeekFocus && (
          <Section style={alertSection}>
            <Heading style={h2}>🎯 Next Week Focus</Heading>
            <Text style={text}>{props.nextWeekFocus}</Text>
          </Section>
        )}

        <Hr style={divider} />
        <Text style={footer}>— {SITE_NAME} Auto-Pilot System</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WeeklyPerformanceEmail,
  subject: (data: Record<string, any>) => `📈 Weekly Report — ${data.weekRange || 'This Week'} | Revenue: ${data.totalRevenue || '₹0'}`,
  displayName: 'Weekly Performance Report',
  previewData: { recipientName: 'Founder', weekRange: '7 Apr - 13 Apr 2026', totalLeads: 142, totalClosed: 18, totalRevenue: '₹8,45,000', conversionRate: '12.6%', teamRankings: '1. Rahul — 45 leads, 6 closed\n2. Priya — 38 leads, 5 closed\n3. Amit — 32 leads, 4 closed', topPerformer: 'Rahul — 6 deals closed, ₹2.8L revenue', areasToImprove: 'Insurance follow-ups lagging, HSRP conversion below target', nextWeekFocus: '1. Clear 15 overdue leads\n2. Push insurance renewals\n3. New campaign launch' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '10px 0' }
const logo = { fontSize: '20px', fontWeight: 'bold' as const, color: BRAND_COLOR, margin: '0' }
const tagline = { fontSize: '12px', color: '#888', margin: '2px 0 0' }
const divider = { borderColor: '#e5e7eb', margin: '15px 0' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#111', margin: '0 0 5px' }
const h2 = { fontSize: '15px', fontWeight: 'bold' as const, color: '#333', margin: '0 0 8px' }
const dateText = { fontSize: '12px', color: '#888', margin: '0 0 15px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 10px' }
const preText = { fontSize: '13px', color: '#55575d', lineHeight: '1.6', margin: '0', whiteSpace: 'pre-line' as const }
const footer = { fontSize: '11px', color: '#aaa', margin: '15px 0 0', textAlign: 'center' as const }
const statsGrid = { margin: '15px 0', backgroundColor: '#f9fafb', borderRadius: '8px', padding: '15px' }
const statBox = { textAlign: 'center' as const, padding: '5px' }
const statNumber = { fontSize: '20px', fontWeight: 'bold' as const, color: '#111', margin: '0' }
const statLabel = { fontSize: '11px', color: '#888', margin: '2px 0 0' }
const alertSection = { margin: '10px 0', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }
