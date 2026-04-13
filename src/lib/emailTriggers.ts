import { supabase } from "@/integrations/supabase/client";

/**
 * Fires a transactional email via the send-transactional-email edge function.
 * Non-blocking — catches errors silently so the main flow isn't interrupted.
 */
export async function fireTransactionalEmail(
  templateName: string,
  recipientEmail: string,
  idempotencyKey: string,
  templateData?: Record<string, any>
) {
  try {
    if (!recipientEmail || !recipientEmail.includes("@")) return;

    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName,
        recipientEmail,
        idempotencyKey,
        ...(templateData ? { templateData } : {}),
      },
    });
    console.log(`📧 Email trigger: ${templateName} → ${recipientEmail}`);
  } catch (err) {
    // Non-blocking — don't break the user flow if email fails
    console.warn(`Email trigger failed (${templateName}):`, err);
  }
}

/**
 * Fire lead confirmation email after a new lead is captured
 */
export function sendLeadConfirmationEmail(params: {
  email: string;
  name?: string;
  service?: string;
  leadId?: string;
}) {
  if (!params.email) return;
  const key = `lead-confirm-${params.leadId || Date.now()}`;
  return fireTransactionalEmail("lead-confirmation", params.email, key, {
    name: params.name,
    service: params.service,
    leadId: params.leadId,
  });
}

/**
 * Fire booking confirmation email
 */
export function sendBookingConfirmationEmail(params: {
  email: string;
  name?: string;
  bookingId?: string;
  carName?: string;
  bookingDate?: string;
}) {
  if (!params.email) return;
  const key = `booking-confirm-${params.bookingId || Date.now()}`;
  return fireTransactionalEmail("booking-confirmation", params.email, key, {
    name: params.name,
    bookingId: params.bookingId,
    carName: params.carName,
    bookingDate: params.bookingDate,
  });
}

/**
 * Fire invoice sent email
 */
export function sendInvoiceEmail(params: {
  email: string;
  name?: string;
  invoiceNumber?: string;
  amount?: string;
  dueDate?: string;
}) {
  if (!params.email) return;
  const key = `invoice-${params.invoiceNumber || Date.now()}`;
  return fireTransactionalEmail("invoice-sent", params.email, key, {
    name: params.name,
    invoiceNumber: params.invoiceNumber,
    amount: params.amount,
    dueDate: params.dueDate,
  });
}

/**
 * Fire welcome email after signup
 */
export function sendWelcomeEmail(params: {
  email: string;
  name?: string;
}) {
  if (!params.email) return;
  const key = `welcome-${params.email}-${Date.now()}`;
  return fireTransactionalEmail("welcome-email", params.email, key, {
    name: params.name,
  });
}

/**
 * Fire renewal reminder email
 */
export function sendRenewalReminderEmail(params: {
  email: string;
  name?: string;
  vehicleNumber?: string;
  expiryDate?: string;
  policyNumber?: string;
}) {
  if (!params.email) return;
  const key = `renewal-${params.policyNumber || params.vehicleNumber || Date.now()}`;
  return fireTransactionalEmail("renewal-reminder", params.email, key, {
    name: params.name,
    vehicleNumber: params.vehicleNumber,
    expiryDate: params.expiryDate,
    policyNumber: params.policyNumber,
  });
}

/**
 * Fire payment receipt email
 */
export function sendPaymentReceiptEmail(params: {
  email: string;
  name?: string;
  amount?: string;
  paymentId?: string;
  service?: string;
  paymentDate?: string;
  paymentMode?: string;
}) {
  if (!params.email) return;
  const key = `payment-${params.paymentId || Date.now()}`;
  return fireTransactionalEmail("payment-receipt", params.email, key, {
    name: params.name,
    amount: params.amount,
    paymentId: params.paymentId,
    service: params.service,
    paymentDate: params.paymentDate,
    paymentMode: params.paymentMode,
  });
}

/**
 * Fire follow-up scheduled email
 */
export function sendFollowUpScheduledEmail(params: {
  email: string;
  name?: string;
  followUpDate?: string;
  followUpTime?: string;
  agentName?: string;
  service?: string;
}) {
  if (!params.email) return;
  const key = `followup-${params.email}-${params.followUpDate || Date.now()}`;
  return fireTransactionalEmail("follow-up-scheduled", params.email, key, {
    name: params.name,
    followUpDate: params.followUpDate,
    followUpTime: params.followUpTime,
    agentName: params.agentName,
    service: params.service,
  });
}
