-- Enable pgcrypto for token encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Private schema + secret key holder
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed encryption key once (random 64-hex). Idempotent.
INSERT INTO private.app_secrets (key, value)
SELECT 'token_encryption_key', encode(gen_random_bytes(32), 'hex')
WHERE NOT EXISTS (SELECT 1 FROM private.app_secrets WHERE key = 'token_encryption_key');

-- Encrypt / decrypt helpers (SECURITY DEFINER, locked search_path)
CREATE OR REPLACE FUNCTION public.encrypt_token(plain_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_key text;
BEGIN
  IF plain_token IS NULL OR length(plain_token) = 0 THEN
    RETURN NULL;
  END IF;
  SELECT value INTO v_key FROM private.app_secrets WHERE key = 'token_encryption_key';
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'token_encryption_key missing';
  END IF;
  RETURN encode(pgp_sym_encrypt(plain_token, v_key), 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_token(encrypted_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_key text;
BEGIN
  IF encrypted_token IS NULL OR length(encrypted_token) = 0 THEN
    RETURN NULL;
  END IF;
  SELECT value INTO v_key FROM private.app_secrets WHERE key = 'token_encryption_key';
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'token_encryption_key missing';
  END IF;
  RETURN pgp_sym_decrypt(decode(encrypted_token, 'base64'), v_key);
END;
$$;

-- Lock these functions to authenticated + service_role only
REVOKE ALL ON FUNCTION public.encrypt_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrypt_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.encrypt_token(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_token(text) TO service_role;

-- ============================================================
-- whatsapp_accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number_id text NOT NULL,
  waba_id text NOT NULL,
  display_phone_number text,
  verified_name text,
  business_name text,
  quality_rating text,
  messaging_limit text,
  code_verification_status text,
  platform_type text,
  throughput_level text,
  encrypted_access_token text NOT NULL,
  encrypted_pin text,
  webhook_verify_token text,
  webhook_subscribed boolean NOT NULL DEFAULT false,
  phone_registered boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  last_synced_at timestamptz,
  last_sync_error text,
  setup_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_accounts_user_phone_unique UNIQUE (user_id, phone_number_id)
);

ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own whatsapp accounts" ON public.whatsapp_accounts;
CREATE POLICY "Users view own whatsapp accounts" ON public.whatsapp_accounts
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users insert own whatsapp accounts" ON public.whatsapp_accounts;
CREATE POLICY "Users insert own whatsapp accounts" ON public.whatsapp_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own whatsapp accounts" ON public.whatsapp_accounts;
CREATE POLICY "Users update own whatsapp accounts" ON public.whatsapp_accounts
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users delete own whatsapp accounts" ON public.whatsapp_accounts;
CREATE POLICY "Users delete own whatsapp accounts" ON public.whatsapp_accounts
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_whatsapp_accounts_updated_at ON public.whatsapp_accounts;
CREATE TRIGGER trg_whatsapp_accounts_updated_at
  BEFORE UPDATE ON public.whatsapp_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- message_templates (per-account, mirrored from Meta)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_account_id uuid NOT NULL REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  meta_template_id text,
  name text NOT NULL,
  category text,
  language text NOT NULL DEFAULT 'en',
  components jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text,
  rejection_reason text,
  quality_score jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_templates_account_name_lang_unique UNIQUE (whatsapp_account_id, name, language)
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own message templates" ON public.message_templates;
CREATE POLICY "Users view own message templates" ON public.message_templates
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users insert own message templates" ON public.message_templates;
CREATE POLICY "Users insert own message templates" ON public.message_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own message templates" ON public.message_templates;
CREATE POLICY "Users update own message templates" ON public.message_templates
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users delete own message templates" ON public.message_templates;
CREATE POLICY "Users delete own message templates" ON public.message_templates
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_message_templates_updated_at ON public.message_templates;
CREATE TRIGGER trg_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();