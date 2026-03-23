-- Seed default HR templates if empty
INSERT INTO public.hr_templates (template_name, template_type, content, variables, is_active)
SELECT name, type, content, vars, true FROM (VALUES
  ('Standard Offer Letter', 'offer_letter',
   'Date: {{date}}

To,
{{employee_name}}
{{address}}

Subject: Offer of Employment - {{designation}}

Dear {{employee_name}},

We are pleased to offer you the position of {{designation}} in the {{department}} department at GrabYourCar Pvt. Ltd., effective from {{joining_date}}.

COMPENSATION:
- Annual CTC: Rs. {{ctc}} per annum
- Basic Salary: Rs. {{basic_salary}} per month
- HRA: Rs. {{hra}} per month
- Special Allowance: Rs. {{special_allowance}} per month

TERMS:
- Probation Period: {{probation_period}} months
- Notice Period: {{notice_period}} months
- Working Hours: 9:30 AM to 6:30 PM, Monday to Saturday
- Reporting To: {{reporting_manager}}

Please sign and return this letter by {{acceptance_deadline}} to confirm your acceptance.

Warm regards,
HR Department
GrabYourCar Pvt. Ltd.',
   ARRAY['employee_name','address','designation','department','joining_date','ctc','basic_salary','hra','special_allowance','probation_period','notice_period','reporting_manager','acceptance_deadline','date']),

  ('Experience Letter', 'experience_letter',
   'Date: {{date}}

TO WHOM IT MAY CONCERN

This is to certify that {{employee_name}} (Employee ID: {{employee_id}}) was employed with GrabYourCar Pvt. Ltd. from {{joining_date}} to {{last_working_date}} as {{designation}} in the {{department}} department.

During their tenure, {{employee_name}} demonstrated professionalism and dedication. Their conduct and performance were satisfactory.

We wish them all the best in their future endeavors.

For GrabYourCar Pvt. Ltd.

_____________________
HR Manager',
   ARRAY['employee_name','employee_id','joining_date','last_working_date','designation','department','date']),

  ('Salary Revision Letter', 'salary_revision',
   'Date: {{date}}
CONFIDENTIAL

To,
{{employee_name}}
Employee ID: {{employee_id}}

Subject: Revision of Compensation

Dear {{employee_name}},

We are pleased to inform you that your compensation has been revised effective {{effective_date}}.

REVISED COMPENSATION:
- Previous CTC: Rs. {{old_ctc}} per annum
- Revised CTC: Rs. {{new_ctc}} per annum
- Increment: {{increment_percentage}} percent

This revision is in recognition of your contribution and performance.

For GrabYourCar Pvt. Ltd.

_____________________
HR Manager',
   ARRAY['employee_name','employee_id','effective_date','old_ctc','new_ctc','increment_percentage','date']),

  ('Warning Letter', 'warning_letter',
   'Date: {{date}}
STRICTLY CONFIDENTIAL

To,
{{employee_name}}
Employee ID: {{employee_id}}
Department: {{department}}

Subject: Warning Letter - {{warning_reason}}

Dear {{employee_name}},

This letter serves as a formal warning regarding {{warning_reason}} observed on {{incident_date}}.

Details: {{incident_details}}

This behavior is in violation of company policy. You are advised to take corrective action immediately.

For GrabYourCar Pvt. Ltd.

_____________________
HR Manager',
   ARRAY['employee_name','employee_id','department','warning_reason','incident_date','incident_details','date'])
) AS v(name, type, content, vars)
WHERE NOT EXISTS (SELECT 1 FROM public.hr_templates LIMIT 1)