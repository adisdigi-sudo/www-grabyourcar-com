import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "GrabYourCar"
const BRAND_COLOR = "#22A84E"

interface DailySummaryProps {
  name?: string
  date?: string
  leadsHandled?: number
  callsMade?: number
  followUpsDone?: number
  tasksCompleted?: number
  tasksPending?: number
  tasksOverdue?: number
  activeHours?: string
  idleHours?: string
  breakHours?: string
  score?: number
  managerNote?: string
}

const DailyWorkSummaryEmail = (props: DailySummaryProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>📊 Your Daily Summary — {props.date || 'Today'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logo}>{SITE_NAME}</Heading>
          <Text style={tagline}>Daily Work Summary</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>📊 {props.name ? `${props.name}'s` : 'Your'} Day Report</Heading>
        <Text style={dateText}>{props.date || new Date().toLocaleDateString('en-IN')}</Text>

        <Section style={statsGrid}>
          <Row>
            <Column style={statBox}>
              <Text style={statNumber}>{props.leadsHandled ?? 0}</Text>
              <Text style={statLabel}>Leads</Text>
            </Column>
            <Column style={statBox}>
              <Text style={statNumber}>{props.callsMade ?? 0}</Text>
              <Text style={statLabel}>Calls</Text>
            </Column>
            <Column style={statBox}>
              <Text style={statNumber}>{props.followUpsDone ?? 0}</Text>
              <Text style={statLabel}>Follow-ups</Text>
            </Column>
          </Row>
        </Section>

        <Section style={taskSection}>
          <Heading style={h2}>📋 Tasks</Heading>
          <Text style={text}>
            ✅ Completed: <strong>{props.tasksCompleted ?? 0}</strong> | 
            ⏳ Pending: <strong>{props.tasksPending ?? 0}</strong> | 
            🔴 Overdue: <strong style={{color:'#EF4444'}}>{props.tasksOverdue ?? 0}</strong>
          </Text>
        </Section>

        <Section style={taskSection}>
          <Heading style={h2}>⏱️ Time Tracking</Heading>
          <Text style={text}>
            Active: <strong style={{color: BRAND_COLOR}}>{props.activeHours || '0h'}</strong> | 
            Idle: <strong>{props.idleHours || '0h'}</strong> | 
            Break: <strong>{props.breakHours || '0h'}</strong>
          </Text>
        </Section>

        {(props.score !== undefined && props.score !== null) && (
          <Section style={{...taskSection, backgroundColor: props.score >= 70 ? '#f0fdf4' : props.score >= 40 ? '#fffbeb' : '#fef2f2'}}>
            <Text style={{...text, textAlign: 'center' as const}}>
              Performance Score: <strong style={{fontSize:'20px', color: props.score >= 70 ? BRAND_COLOR : props.score >= 40 ? '#F59E0B' : '#EF4444'}}>{props.score}%</strong>
            </Text>
          </Section>
        )}

        {props.managerNote && (
          <Section style={taskSection}>
            <Heading style={h2}>💬 Manager's Note</Heading>
            <Text style={text}>{props.managerNote}</Text>
          </Section>
        )}

        <Hr style={divider} />
        <Text style={footer}>— {SITE_NAME} Auto-Pilot System</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DailyWorkSummaryEmail,
  subject: (data: Record<string, any>) => `📊 Daily Summary — ${data.name || 'Your Day'} (${data.date || 'Today'})`,
  displayName: 'Daily Work Summary',
  previewData: { name: 'Rahul', date: '13 Apr 2026', leadsHandled: 15, callsMade: 22, followUpsDone: 8, tasksCompleted: 5, tasksPending: 3, tasksOverdue: 1, activeHours: '6h 30m', idleHours: '45m', breakHours: '45m', score: 78 },
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
const taskSection = { margin: '10px 0', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }
