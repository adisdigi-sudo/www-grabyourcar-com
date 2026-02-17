
-- =============================================
-- STEP 8: Car Loans Full 12-Stage Workflow
-- =============================================

-- 1. Create loan_stage enum for strict stage control
DO $$ BEGIN
  CREATE TYPE public.loan_stage AS ENUM (
    'new_lead',
    'contacted',
    'qualified',
    'eligibility_check',
    'lender_match',
    'offer_shared',
    'documents_requested',
    'documents_received',
    'approval',
    'disbursement',
    'converted',
    'lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add new columns to loan_applications for 12-stage workflow
ALTER TABLE public.loan_applications 
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS lead_source_tag TEXT,
  ADD COLUMN IF NOT EXISTS lost_reason TEXT,
  ADD COLUMN IF NOT EXISTS lost_remarks TEXT,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_profile_id UUID REFERENCES public.client_profiles(id),
  ADD COLUMN IF NOT EXISTS documents_required TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS documents_uploaded TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lender_name TEXT,
  ADD COLUMN IF NOT EXISTS offer_details JSONB,
  ADD COLUMN IF NOT EXISTS eligibility_result JSONB,
  ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_notes TEXT,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS activity_count INTEGER DEFAULT 0;

-- 3. Create loan_documents table for mandatory doc uploads
CREATE TABLE IF NOT EXISTS public.loan_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'kyc', 'income_proof', 'bank_statement', 'address_proof', 'pan_card', 'aadhaar', 'salary_slip', 'itr', 'other'
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID,
  verified BOOLEAN DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view loan documents"
  ON public.loan_documents FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert loan documents"
  ON public.loan_documents FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update loan documents"
  ON public.loan_documents FOR UPDATE TO authenticated
  USING (true);

-- 4. Create loan_stage_history for audit trail
CREATE TABLE IF NOT EXISTS public.loan_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by UUID,
  remarks TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stage history"
  ON public.loan_stage_history FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert stage history"
  ON public.loan_stage_history FOR INSERT TO authenticated
  WITH CHECK (true);

-- 5. Create loan_bulk_imports tracking table
CREATE TABLE IF NOT EXISTS public.loan_bulk_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  success_rows INTEGER NOT NULL DEFAULT 0,
  error_rows INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  imported_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.loan_bulk_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage bulk imports"
  ON public.loan_bulk_imports FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 6. Add storage bucket for loan documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('loan-documents', 'loan-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for loan documents
CREATE POLICY "Authenticated can upload loan docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'loan-documents');

CREATE POLICY "Authenticated can view loan docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'loan-documents');

CREATE POLICY "Authenticated can delete loan docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'loan-documents');
