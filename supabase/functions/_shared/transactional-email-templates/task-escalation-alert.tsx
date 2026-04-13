import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "GrabYourCar"
const BRAND_COLOR = "#22A84E"

interface EscalationProps {
  recipientName?: string
  escalationLevel?: string
  taskTitle?: string
  assignedTo?: string
  dueDate?: string
  overdueDays?: number
  escalationChain?: string
  taskCount?: number
}

const TaskEscalationEmail = (props: EscalationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>🚨 Task Escalation — {props.taskTitle || 'Pending Task'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logo}>{SITE_NAME}</Heading>
          <Text style={tagline}>Task Escalation Alert</Text>
        </Section>
        <Hr style={divider} />
        
        <Section style={alertBanner}>
          <Heading style={alertTitle}>🚨 Task Escalation</Heading>
          <Text style={alertText}>
            Level: <strong>{props.escalationLevel || 'Team Leader'}</strong>
          </Text>
        </Section>

        <Heading style={h1}>{props.recipientName ? `Hi ${props.recipientName},` : 'Attention Required!'}</Heading>
        
        <Text style={text}>
          {props.taskCount && props.taskCount > 1 
            ? `${props.taskCount} tasks from your team are overdue and need immediate attention.`
            : 'A task from your team is overdue and has been escalated to you.'
          }
        </Text>

        <Section style={taskCard}>
          <Text style={taskTitle}>📋 {props.taskTitle || 'Pending Task'}</Text>
          <Text style={taskMeta}>
            Assigned to: <strong>{props.assignedTo || 'Team Member'}</strong><br/>
            Due: <strong style={{color:'#EF4444'}}>{props.dueDate || 'Overdue'}</strong>
            {props.overdueDays ? ` (${props.overdueDays} days overdue)` : ''}
          </Text>
          {props.escalationChain && (
            <Text style={chainText}>
              Escalation path: {props.escalationChain}
            </Text>
          )}
        </Section>

        <Text style={text}>
          Please take action — either complete the task, reassign it, or follow up with the team member.
        </Text>

        <Hr style={divider} />
        <Text style={footer}>— {SITE_NAME} Auto-Pilot System</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TaskEscalationEmail,
  subject: (data: Record<string, any>) => `🚨 Escalation: ${data.taskTitle || 'Overdue Task'} — Action Required`,
  displayName: 'Task Escalation Alert',
  previewData: { recipientName: 'Manager', escalationLevel: 'Manager', taskTitle: 'Follow up with Sharma ji', assignedTo: 'Rahul', dueDate: '10 Apr 2026', overdueDays: 3, escalationChain: 'Rahul → TL Priya → You' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '10px 0' }
const logo = { fontSize: '20px', fontWeight: 'bold' as const, color: BRAND_COLOR, margin: '0' }
const tagline = { fontSize: '12px', color: '#888', margin: '2px 0 0' }
const divider = { borderColor: '#e5e7eb', margin: '15px 0' }
const h1 = { fontSize: '18px', fontWeight: 'bold' as const, color: '#111', margin: '15px 0 8px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 12px' }
const footer = { fontSize: '11px', color: '#aaa', margin: '15px 0 0', textAlign: 'center' as const }
const alertBanner = { backgroundColor: '#fef2f2', borderRadius: '8px', padding: '12px', textAlign: 'center' as const, margin: '10px 0' }
const alertTitle = { fontSize: '18px', fontWeight: 'bold' as const, color: '#DC2626', margin: '0 0 4px' }
const alertText = { fontSize: '13px', color: '#7f1d1d', margin: '0' }
const taskCard = { backgroundColor: '#f9fafb', borderRadius: '8px', padding: '15px', margin: '12px 0', borderLeft: '4px solid #EF4444' }
const taskTitle = { fontSize: '15px', fontWeight: 'bold' as const, color: '#111', margin: '0 0 6px' }
const taskMeta = { fontSize: '13px', color: '#666', lineHeight: '1.6', margin: '0 0 6px' }
const chainText = { fontSize: '11px', color: '#888', margin: '6px 0 0', fontStyle: 'italic' as const }
