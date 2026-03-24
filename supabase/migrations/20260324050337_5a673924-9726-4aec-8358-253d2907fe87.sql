
-- Bank transactions table for tracking all entries per bank account
CREATE TABLE public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  reference_number text,
  transaction_type text NOT NULL DEFAULT 'debit',
  category text,
  amount numeric NOT NULL DEFAULT 0,
  running_balance numeric,
  payment_mode text,
  linked_invoice_id text,
  linked_bill_id text,
  source text DEFAULT 'manual',
  notes text,
  is_reconciled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access bank_transactions" ON public.bank_transactions FOR ALL USING (public.is_admin(auth.uid()));

-- Financial documents vault
CREATE TABLE public.financial_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL,
  document_category text,
  title text NOT NULL,
  description text,
  file_url text,
  file_name text,
  file_size text,
  mime_type text,
  entity_name text,
  entity_type text,
  status text DEFAULT 'active',
  expiry_date date,
  issued_date date,
  reference_number text,
  tags text[],
  metadata jsonb DEFAULT '{}',
  uploaded_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.financial_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access financial_documents" ON public.financial_documents FOR ALL USING (public.is_admin(auth.uid()));

-- Update bank balance trigger
CREATE OR REPLACE FUNCTION public.update_bank_balance_on_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NEW.transaction_type = 'credit' THEN
    UPDATE public.bank_accounts SET current_balance = current_balance + NEW.amount, updated_at = now() WHERE id = NEW.bank_account_id;
  ELSE
    UPDATE public.bank_accounts SET current_balance = current_balance - NEW.amount, updated_at = now() WHERE id = NEW.bank_account_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_bank_balance
AFTER INSERT ON public.bank_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_bank_balance_on_transaction();
