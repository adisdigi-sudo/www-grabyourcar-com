import { format } from "date-fns";
import { generateTemplateDocumentPDF } from "@/lib/generateTemplateDocumentPDF";
import { generatePayslipPDF } from "@/lib/generatePayslipPDF";

const money = (value: number | string | null | undefined) => {
  const amount = Number(value || 0);
  return `Rs. ${Math.round(amount).toLocaleString("en-IN")}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "__________";
  try {
    return format(new Date(value), "dd MMM yyyy");
  } catch {
    return value;
  }
};

const buildTemplateContent = (type: string) => {
  switch (type) {
    case "welcome_letter":
      return `Dear {{name}},

Welcome to GrabYourCar.

We are delighted to welcome you as {{designation}} in the {{department}} / {{vertical}} team. Your journey with us begins on {{joining_date}}, and you will be reporting to {{manager}}.

At GrabYourCar, we believe in ownership, speed, customer obsession, and execution excellence. We are confident that your contribution will help us build a stronger company and a better customer experience.

Your monthly CTC has been structured at {{ctc}}.

We look forward to an exciting journey ahead and wish you a successful start.

Warm regards,
Human Resources
GrabYourCar`;
    case "offer_letter":
      return `Date: {{generated_on}}

To,
{{name}}

Subject: Offer of Employment

Dear {{name}},

We are pleased to offer you the position of {{designation}} with GrabYourCar in the {{vertical}} team. Your date of joining will be {{joining_date}} and your reporting manager will be {{manager}}.

Your compensation structure will be as follows:
- Monthly CTC: {{ctc}}
- Basic Salary: {{basic_salary}}
- HRA: {{hra}}
- Special Allowance: {{special_allowance}}

This offer is subject to successful completion of verification and onboarding formalities.

Please sign and share your acceptance to proceed.

Sincerely,
Human Resources
GrabYourCar`;
    case "joining_letter":
      return `Date: {{generated_on}}

To,
{{name}}

Subject: Joining Letter

Dear {{name}},

This letter confirms your joining with GrabYourCar as {{designation}} in the {{vertical}} team effective from {{joining_date}}.

Your manager will be {{manager}}, and your work schedule is {{shift_start}} to {{shift_end}}.

We wish you a successful and rewarding journey with the organization.

Regards,
Human Resources
GrabYourCar`;
    case "appointment_letter":
    case "employment_contract":
      return `Date: {{generated_on}}

To,
{{name}}

Subject: Appointment Confirmation

Dear {{name}},

You are hereby appointed as {{designation}} in the {{vertical}} team at GrabYourCar effective {{joining_date}}.

Compensation Summary:
- Monthly CTC: {{ctc}}
- Basic Salary: {{basic_salary}}
- HRA: {{hra}}
- DA: {{da}}
- Special Allowance: {{special_allowance}}

Employment Type: {{employment_type}}
Working Days per Month: {{working_days}}
Reporting Manager: {{manager}}

You are expected to maintain confidentiality, follow company policies, and uphold professional conduct at all times.

Regards,
Human Resources
GrabYourCar`;
    case "salary_structure":
      return `Salary Structure

Employee: {{name}}
Designation: {{designation}}
Department: {{department}}
Vertical: {{vertical}}

Compensation Breakdown:
- Monthly CTC: {{ctc}}
- Basic Salary: {{basic_salary}}
- HRA: {{hra}}
- DA: {{da}}
- Special Allowance: {{special_allowance}}
- PF Deduction: {{pf_deduction}}
- ESI Deduction: {{esi_deduction}}
- Professional Tax: {{professional_tax}}
- TDS: {{tds}}

Net Indicative Monthly Salary: {{net_salary}}`;
    default:
      return `Employee Name: {{name}}
Designation: {{designation}}
Department: {{department}}
Manager: {{manager}}
Generated On: {{generated_on}}`;
  }
};

export const generateEmployeeDocumentPDF = (doc: any) => {
  if (doc.document_type === "salary_slip" && doc.generated_data) {
    generatePayslipPDF(doc.generated_data);
    return;
  }

  const data = doc.generated_data || {};
  const variables = {
    generated_on: format(new Date(), "dd MMM yyyy"),
    name: data.name || data.employee_name || doc.employee_name || "Employee",
    designation: data.designation || "__________",
    department: data.department || "__________",
    vertical: data.vertical || data.vertical_name || "__________",
    manager: data.manager || data.manager_name || "__________",
    joining_date: formatDate(data.joining_date),
    employment_type: data.employment_type || "full_time",
    working_days: data.working_days || data.total_working_days || "26",
    shift_start: data.shift_start || "09:00 AM",
    shift_end: data.shift_end || "06:00 PM",
    ctc: money(data.ctc || data.monthly_ctc),
    basic_salary: money(data.basic_salary),
    hra: money(data.hra),
    da: money(data.da),
    special_allowance: money(data.special_allowance),
    pf_deduction: money(data.pf_deduction),
    esi_deduction: money(data.esi_deduction),
    professional_tax: money(data.professional_tax),
    tds: money(data.tds),
    net_salary: money(data.net_salary),
    employee_name: data.name || data.employee_name || doc.employee_name || "Employee",
  };

  generateTemplateDocumentPDF({
    title: (doc.document_name || doc.document_type || "Employee Document").replace(/_/g, " "),
    content: buildTemplateContent(doc.document_type),
    variables,
    fileName: doc.document_name || doc.document_type || "employee-document",
  });
};
