// 12-Stage Car Loans Workflow Configuration

export const LOAN_STAGES = [
  'new_lead', 'contacted', 'qualified', 'eligibility_check',
  'lender_match', 'offer_shared', 'documents_requested',
  'documents_received', 'approval', 'disbursement', 'converted', 'lost'
] as const;

export type LoanStage = typeof LOAN_STAGES[number];

export const STAGE_LABELS: Record<LoanStage, string> = {
  new_lead: 'New Lead',
  contacted: 'Contacted',
  qualified: 'Qualified',
  eligibility_check: 'Eligibility Check',
  lender_match: 'Lender Match',
  offer_shared: 'Offer Shared',
  documents_requested: 'Docs Requested',
  documents_received: 'Docs Received',
  approval: 'Approval',
  disbursement: 'Disbursement',
  converted: 'Converted',
  lost: 'Lost',
};

export const STAGE_COLORS: Record<LoanStage, string> = {
  new_lead: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  contacted: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  qualified: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  eligibility_check: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  lender_match: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  offer_shared: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  documents_requested: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  documents_received: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  approval: 'bg-lime-500/10 text-lime-600 border-lime-500/20',
  disbursement: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  converted: 'bg-green-500/10 text-green-700 border-green-500/20',
  lost: 'bg-red-500/10 text-red-600 border-red-500/20',
};

// Defines which stages a given stage can move to (forward + backward + terminal)
export const ALLOWED_TRANSITIONS: Record<LoanStage, LoanStage[]> = {
  new_lead: ['contacted', 'lost'],
  contacted: ['new_lead', 'qualified', 'lost'],
  qualified: ['contacted', 'eligibility_check', 'lost'],
  eligibility_check: ['qualified', 'lender_match', 'lost'],
  lender_match: ['eligibility_check', 'offer_shared', 'lost'],
  offer_shared: ['lender_match', 'documents_requested', 'lost'],
  documents_requested: ['offer_shared', 'documents_received', 'lost'],
  documents_received: ['documents_requested', 'approval', 'lost'],
  approval: ['documents_received', 'disbursement', 'lost'],
  disbursement: ['approval', 'converted', 'lost'],
  converted: [],
  lost: ['new_lead'],
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

export const LEAD_SOURCES = [
  'Website', 'WhatsApp', 'Walk-in', 'Referral', 'Social Media',
  'Google Ads', 'Facebook Ads', 'Partner', 'Bulk Import', 'Manual',
];

export const PRIORITY_OPTIONS = [
  { value: 'hot', label: '🔥 Hot', color: 'bg-red-500/10 text-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500/10 text-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500/10 text-blue-500' },
  { value: 'low', label: 'Low', color: 'bg-gray-500/10 text-gray-500' },
];
