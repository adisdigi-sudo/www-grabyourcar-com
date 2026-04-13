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

export const TEMPLATES: Record<string, TemplateEntry> = {
  'booking-confirmation': bookingConfirmation,
  'welcome-email': welcomeEmail,
  'lead-confirmation': leadConfirmation,
  'invoice-sent': invoiceSent,
  'renewal-reminder': renewalReminder,
  'payment-receipt': paymentReceipt,
  'follow-up-scheduled': followUpScheduled,
}
