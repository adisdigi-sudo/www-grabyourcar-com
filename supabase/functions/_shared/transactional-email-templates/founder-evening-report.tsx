import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "GrabYourCar"
const BRAND_COLOR = "#22A84E"

interface FounderReportProps {
  date?: string
  totalLeads?: number
  newLeads?: number
  closedDeals?: number
  revenue?: string
  totalCalls?: number
  insuranceLeads?: number
  teamSize?: number
  activeMembers?: number
  escalatedTasks?: number
  topPerformers?: string
  bottomPerformers?: string
  insights?: string
}

const FounderEveningReportEmail = (props: FounderReportProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>🌙 Day End Report — {props.date || 'Today'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logo}>{SITE_NAME}</Heading>
          <Text style={tagline}>Founder's Evening Report</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>🌙 Day End Report</Heading>
        <Text style={dateText}>{props.date || new Date().toLocaleDateString('en-IN')}</Text>

        <Section style={statsGrid}>
          <Row>
            <Column style={statBox}>
              <Text style={statNumber}>{props.newLeads ?? 0}</Text>
              <Text style={statLabel}>New Leads</Text>
            </Column>
            <Column style={statBox}>
              <Text style={statNumber}>{props.closedDeals ?? 0}</Text>
              <Text style={statLabel}>Closed Deals</Text>
            </Column>
            <Column style={statBox}>
              <Text style={{...statNumber, color: BRAND_COLOR}}>{props.revenue || '₹0'}</Text>
              <Text style={statLabel}>Revenue</Text>
            </Column>
          </Row>
        </Section>

        <Section style={statsGrid}>
          <Row>
            <Column style={statBox}>
              <Text style={statNumber}>{props.totalCalls ?? 0}</Text>
              <Text style={statLabel}>Calls Made</Text>
            </Column>
            <Column style={statBox}>
              <Text style={statNumber}>{props.insuranceLeads ?? 0}</Text>
              <Text style={statLabel}>Insurance</Text>
            </Column>
            <Column style={statBox}>
              <Text style={statNumber}>{props.activeMembers ?? 0}/{props.teamSize ?? 0}</Text>
              <Text style={statLabel}>Team Active</Text>
            </Column>
          </Row>
        </Section>

        {(props.escalatedTasks ?? 0) > 0 && (
          <Section style={{...alertSection, backgroundColor: '#fef2f2'}}>
            <Heading style={h2}>🚨 Escalated Tasks: {props.escalatedTasks}</Heading>
            <Text style={text}>Tasks escalated to your level that need attention.</Text>
          </Section>
        )}

        {props.topPerformers && (
          <Section style={alertSection}>
            <Heading style={h2}>🏆 Top Performers</Heading>
            <Text style={text}>{props.topPerformers}</Text>
          </Section>
        )}

        {props.bottomPerformers && (
          <Section style={alertSection}>
            <Heading style={h2}>⚠️ Needs Improvement</Heading>
            <Text style={text}>{props.bottomPerformers}</Text>
          </Section>
        )}

        {props.insights && (
          <Section style={alertSection}>
            <Heading style={h2}>💡 AI Insights</Heading>
            <Text style={text}>{props.insights}</Text>
          </Section>
        )}

        <Hr style={divider} />
        <Text style={footer}>— {SITE_NAME} Auto-Pilot System</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FounderEveningReportEmail,
  subject: (data: Record<string, any>) => `🌙 Day End Report — ${data.date || 'Today'} | Revenue: ${data.revenue || '₹0'}`,
  displayName: 'Founder Evening Report',
  previewData: { date: '13 Apr 2026', newLeads: 28, closedDeals: 5, revenue: '₹1,45,000', totalCalls: 85, insuranceLeads: 12, teamSize: 25, activeMembers: 22, escalatedTasks: 3, topPerformers: '1. Rahul — 12 leads closed\n2. Priya — ₹48,000 revenue', insights: 'Insurance vertical is up 15% this week. 3 stale leads need attention.' },
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
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 10px', whiteSpace: 'pre-line' as const }
const footer = { fontSize: '11px', color: '#aaa', margin: '15px 0 0', textAlign: 'center' as const }
const statsGrid = { margin: '10px 0', backgroundColor: '#f9fafb', borderRadius: '8px', padding: '15px' }
const statBox = { textAlign: 'center' as const, padding: '5px' }
const statNumber = { fontSize: '22px', fontWeight: 'bold' as const, color: '#111', margin: '0' }
const statLabel = { fontSize: '11px', color: '#888', margin: '2px 0 0' }
const alertSection = { margin: '10px 0', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }
