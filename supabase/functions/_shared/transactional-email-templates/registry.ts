/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as bookingConfirmation } from './booking-confirmation.tsx'
import { template as welcomeEmail } from './welcome-email.tsx'
import { template as leadConfirmation } from './lead-confirmation.tsx'
import { template as invoiceSent } from './invoice-sent.tsx'
import { template as renewalReminder } from './renewal-reminder.tsx'
import { template as paymentReceipt } from './payment-receipt.tsx'
import { template as followUpScheduled } from './follow-up-scheduled.tsx'
import { template as hrMorningBriefing } from './hr-morning-briefing.tsx'
import { template as dailyWorkSummary } from './daily-work-summary.tsx'
import { template as founderEveningReport } from './founder-evening-report.tsx'
import { template as weeklyPerformanceReport } from './weekly-performance-report.tsx'
import { template as taskEscalationAlert } from './task-escalation-alert.tsx'
import { template as insuranceWon } from './insurance-won.tsx'
import { template as dealClosed } from './deal-closed.tsx'
import { template as loanDisbursed } from './loan-disbursed.tsx'
import { template as hsrpCompleted } from './hsrp-completed.tsx'
import { template as rentalConfirmed } from './rental-confirmed.tsx'
import { template as rawHtml } from './raw-html.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'raw-html': rawHtml,
  'booking-confirmation': bookingConfirmation,
  'welcome-email': welcomeEmail,
  'lead-confirmation': leadConfirmation,
  'invoice-sent': invoiceSent,
  'renewal-reminder': renewalReminder,
  'payment-receipt': paymentReceipt,
  'follow-up-scheduled': followUpScheduled,
  'hr-morning-briefing': hrMorningBriefing,
  'daily-work-summary': dailyWorkSummary,
  'founder-evening-report': founderEveningReport,
  'weekly-performance-report': weeklyPerformanceReport,
  'task-escalation-alert': taskEscalationAlert,
  'insurance-won': insuranceWon,
  'deal-closed': dealClosed,
  'loan-disbursed': loanDisbursed,
  'hsrp-completed': hsrpCompleted,
  'rental-confirmed': rentalConfirmed,
}
