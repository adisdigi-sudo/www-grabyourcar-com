// 6-Stage Car Loan Unified Workspace Configuration

export const LOAN_STAGES = [
  'new_lead', 'smart_calling', 'interested', 'offer_shared',
  'loan_application', 'disbursed', 'lost'
] as const;

export type LoanStage = typeof LOAN_STAGES[number];

export const STAGE_LABELS: Record<LoanStage, string> = {
  new_lead: 'New Lead',
  smart_calling: 'Smart Calling',
  interested: 'Interested',
  offer_shared: 'Offer Shared',
  loan_application: 'Loan Application',
  disbursed: 'Disbursed',
  lost: 'Lost',
};

export const STAGE_COLORS: Record<LoanStage, string> = {
  new_lead: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  smart_calling: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  interested: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  offer_shared: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  loan_application: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  disbursed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  lost: 'bg-red-500/10 text-red-600 border-red-500/20',
};

// Map legacy stages to new 6-stage pipeline
export const LEGACY_STAGE_MAP: Record<string, LoanStage> = {
  new_lead: 'new_lead',
  contacted: 'smart_calling',
  qualified: 'interested',
  eligibility_check: 'interested',
  lender_match: 'offer_shared',
  offer_shared: 'offer_shared',
  documents_requested: 'loan_application',
  documents_received: 'loan_application',
  approval: 'loan_application',
  disbursement: 'disbursed',
  converted: 'disbursed',
  lost: 'lost',
  smart_calling: 'smart_calling',
  interested: 'interested',
  loan_application: 'loan_application',
  disbursed: 'disbursed',
};

export const normalizeStage = (stage: string | null): LoanStage => {
  return LEGACY_STAGE_MAP[stage || 'new_lead'] || 'new_lead';
};

export const LEAD_SOURCES = [
  'Meta', 'Google Ads', 'Referral', 'Walk-in', 'WhatsApp Broadcast',
  'Website', 'Social Media', 'Partner', 'Manual',
];

export const LOAN_TYPES = [
  { value: 'new_car_loan', label: 'New Car Loan', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { value: 'used_car_loan', label: 'Used Car Loan', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  { value: 'topup_loan', label: 'Top-up Loan', color: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
  { value: 'balance_transfer', label: 'Balance Transfer', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
  { value: 'commercial_vehicle', label: 'Commercial Vehicle', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
];

export const EMPLOYMENT_TYPES = [
  { value: 'salaried', label: 'Salaried' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'business', label: 'Business Owner' },
];

export const PRIORITY_OPTIONS = [
  { value: 'hot', label: '🔥 Hot', color: 'bg-red-500/10 text-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500/10 text-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500/10 text-blue-500' },
  { value: 'low', label: 'Low', color: 'bg-gray-500/10 text-gray-500' },
];

export const CALL_STATUSES = [
  'Interested', 'Not Interested', 'Call Back', 'No Answer', 'Wrong Number', 'Busy',
];

export const LOST_REASONS = [
  'High interest rate',
  'Better offer elsewhere',
  'Changed mind',
  'Loan not approved',
  'Insufficient documents',
  'Customer not responding',
  'Budget constraints',
  'Bought from another dealer',
  'Credit score too low',
  'Other',
];

// Legacy exports for backward compatibility with old components
export const ALLOWED_TRANSITIONS: Record<LoanStage, LoanStage[]> = {
  new_lead: ['smart_calling', 'interested', 'offer_shared', 'loan_application', 'disbursed', 'lost'],
  smart_calling: ['new_lead', 'interested', 'offer_shared', 'loan_application', 'disbursed', 'lost'],
  interested: ['new_lead', 'smart_calling', 'offer_shared', 'loan_application', 'disbursed', 'lost'],
  offer_shared: ['new_lead', 'smart_calling', 'interested', 'loan_application', 'disbursed', 'lost'],
  loan_application: ['new_lead', 'smart_calling', 'interested', 'offer_shared', 'disbursed', 'lost'],
  disbursed: [], // 🔒 Permanently locked — no transitions allowed
  lost: ['new_lead', 'smart_calling', 'interested', 'offer_shared', 'loan_application', 'disbursed'],
};

export const REQUIRED_DOCUMENTS = [
  { key: 'pan_card', label: 'PAN Card' },
  { key: 'aadhaar', label: 'Aadhaar Card' },
  { key: 'income_proof', label: 'Income Proof / Salary Slip' },
  { key: 'bank_statement', label: 'Bank Statements (6 months)' },
  { key: 'address_proof', label: 'Address Proof' },
  { key: 'itr', label: 'ITR (if applicable)' },
  { key: 'photo', label: 'Passport Photo' },
];
