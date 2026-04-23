-- Sync existing v1 templates to actual Meta status
UPDATE public.wa_templates SET category = 'marketing', status = 'approved', updated_at = now() WHERE name = 'feedback_insurance_won';
UPDATE public.wa_templates SET category = 'marketing', status = 'approved', updated_at = now() WHERE name = 'feedback_loan_disbursed';
UPDATE public.wa_templates SET category = 'marketing', status = 'approved', updated_at = now() WHERE name = 'feedback_sales_delivered';
UPDATE public.wa_templates SET category = 'utility',   status = 'approved', updated_at = now() WHERE name = 'feedback_hsrp_completed';

-- Remove any existing v2 rows so we can cleanly insert
DELETE FROM public.wa_templates WHERE name IN (
  'feedback_insurance_won_v2','feedback_loan_disbursed_v2','feedback_hsrp_completed_v2','feedback_sales_delivered_v2'
);

INSERT INTO public.wa_templates (name, display_name, category, language, body, footer, variables, buttons, status, vertical, meta_template_id) VALUES
  ('feedback_insurance_won_v2','Insurance Policy Issued (Utility v2)','utility','en',
   'Hi {{1}}, your motor insurance policy has been issued.\n\nPolicy No: {{2}}\nInsurer: {{3}}\n\nPlease keep this for your records. Reply with your feedback to help us improve our service.',
   'Grabyourcar Insurance Services',
   '["name","policy_number","insurer"]'::jsonb,
   '[{"type":"QUICK_REPLY","text":"Share feedback"}]'::jsonb,
   'pending','insurance','2093181154562389'),
  ('feedback_loan_disbursed_v2','Car Loan Disbursed (Utility v2)','utility','en',
   'Hi {{1}}, your car loan has been disbursed.\n\nLender: {{2}}\nAmount: Rs {{3}}\n\nPlease retain this confirmation for your records. Reply with your feedback on the loan process.',
   'Grabyourcar Loan Services',
   '["name","lender_name","loan_amount"]'::jsonb,
   '[{"type":"QUICK_REPLY","text":"Share feedback"}]'::jsonb,
   'pending','loans','2288116708594439'),
  ('feedback_hsrp_completed_v2','HSRP Delivered (Utility v2)','utility','en',
   'Hi {{1}}, the HSRP for your vehicle {{2}} has been delivered and fitted.\n\nYour vehicle is now RTO compliant. Please retain this message for your records. Reply with your feedback on the service.',
   'Grabyourcar HSRP Services',
   '["name","vehicle_number"]'::jsonb,
   '[{"type":"QUICK_REPLY","text":"Share feedback"}]'::jsonb,
   'pending','hsrp','1271906837904839'),
  ('feedback_sales_delivered_v2','Vehicle Delivered (Utility v2)','utility','en',
   'Hi {{1}}, your vehicle delivery is complete.\n\nDeal Reference: {{2}}\n\nKindly retain this confirmation. Reply with your feedback on the delivery experience.',
   'Grabyourcar Sales Team',
   '["name","deal_number"]'::jsonb,
   '[{"type":"QUICK_REPLY","text":"Share feedback"}]'::jsonb,
   'pending','sales','1360205475928531');