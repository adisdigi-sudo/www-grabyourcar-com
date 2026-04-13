import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "GrabYourCar"
const BRAND_COLOR = "#22A84E"

interface HRBriefingProps {
  recipientName?: string
  date?: string
  totalEmployees?: number
  presentToday?: number
  absentToday?: number
  pendingTasks?: number
  overdueTasks?: number
  topPerformers?: string
  alerts?: string
}

const HRMorningBriefingEmail = (props: HRBriefingProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>🌅 HR Morning Briefing — {props.date || 'Today'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logo}>{SITE_NAME}</Heading>
          <Text style={tagline}>HR Morning Briefing</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>🌅 Good Morning{props.recipientName ? `, ${props.recipientName}` : ''}!</Heading>
        <Text style={dateText}>{props.date || new Date().toLocaleDateString('en-IN')}</Text>

        <Section style={statsGrid}>
          <Row>
            <Column style={statBox}>
              <Text style={statNumber}>{props.totalEmployees ?? 0}</Text>
              <Text style={statLabel}>Total Team</Text>
            </Column>
            <Column style={statBox}>
              <Text style={{...statNumber, color: BRAND_COLOR}}>{props.presentToday ?? 0}</Text>
              <Text style={statLabel}>Present</Text>
            </Column>
            <Column style={statBox}>
              <Text style={{...statNumber, color: '#EF4444'}}>{props.absentToday ?? 0}</Text>
              <Text style={statLabel}>Absent</Text>
            </Column>
          </Row>
        </Section>

        <Section style={alertSection}>
          <Heading style={h2}>📋 Task Overview</Heading>
          <Text style={text}>
            Pending Tasks: <strong>{props.pendingTasks ?? 0}</strong> | Overdue Tasks: <strong style={{color:'#EF4444'}}>{props.overdueTasks ?? 0}</strong>
          </Text>
        </Section>

        {props.alerts && (
          <Section style={alertSection}>
            <Heading style={h2}>⚠️ Alerts & Escalations</Heading>
            <Text style={text}>{props.alerts}</Text>
          </Section>
        )}

        {props.topPerformers && (
          <Section style={alertSection}>
            <Heading style={h2}>🏆 Top Performers</Heading>
            <Text style={text}>{props.topPerformers}</Text>
          </Section>
        )}

        <Hr style={divider} />
        <Text style={footer}>— {SITE_NAME} Auto-Pilot System</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: HRMorningBriefingEmail,
  subject: (data: Record<string, any>) => `🌅 HR Briefing — ${data.date || 'Today'}`,
  displayName: 'HR Morning Briefing',
  previewData: { recipientName: 'HR Manager', date: '13 Apr 2026', totalEmployees: 25, presentToday: 22, absentToday: 3, pendingTasks: 12, overdueTasks: 3, topPerformers: 'Rahul (12 leads), Priya (8 leads)', alerts: '2 tasks escalated to manager level' },
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
const footer = { fontSize: '11px', color: '#aaa', margin: '15px 0 0', textAlign: 'center' as const }
const statsGrid = { margin: '15px 0', backgroundColor: '#f9fafb', borderRadius: '8px', padding: '15px' }
const statBox = { textAlign: 'center' as const, padding: '5px' }
const statNumber = { fontSize: '24px', fontWeight: 'bold' as const, color: '#111', margin: '0' }
const statLabel = { fontSize: '11px', color: '#888', margin: '2px 0 0' }
const alertSection = { margin: '15px 0', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }
