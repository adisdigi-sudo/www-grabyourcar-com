-- Add missing columns to chart_of_accounts for balance tracking
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS current_balance numeric DEFAULT 0;
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS normal_side text DEFAULT 'debit';

-- Add missing columns to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_type text DEFAULT 'service';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Add missing column to payroll_records for bonus
ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS bonus numeric DEFAULT 0;