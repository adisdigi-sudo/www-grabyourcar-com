

# Phase 1: Complete HR + Incentive + Accounts CRM System — What Exists & What to Build

## What's Already Built (Your Backend + Frontend)

You already have a substantial system. Here's where to find everything:

### Existing Database Tables
- `hr_team_directory` — Full employee records (name, phone, department, vertical, salary, bank details, Aadhaar, PAN, documents JSON, etc.)
- `hr_templates` — Reusable HR letter templates
- `hr_onboarding` — Onboarding checklist steps
- `kpi_targets` — Monthly KPI targets per employee
- `incentive_rules` — Per-vertical incentive rule definitions (fixed, slab, bank-wise, manager override)
- `incentive_entries` — Per-deal incentive records
- `incentive_monthly_summary` — Monthly rollup per employee
- `incentive_payouts` — Payout approval records (pending/approved/paid)
- `manager_bonus_tracking` — Manager bonus calculations
- `deals` — Deal pipeline with auto-calculated commissions
- `document_vault` — Centralized document storage
- `revenue_entries`, `expense_entries` — Finance tracking
- `chart_of_accounts`, `journal_entries`, `journal_entry_lines` — Double-entry accounting
- `invoices` — Invoice management
- `team_members` — Core team identity table
- `user_roles` — RBAC roles
- `user_vertical_access` — Vertical-level permissions

### Existing Frontend Components (Navigate via CRM sidebar)
| Module | Sidebar Path | Component |
|--------|-------------|-----------|
| HR Overview | HR & Office → HR Overview | `HRWorkspace` (directory, attendance, leaves, announcements) |
| HR Deep | HR vertical dashboard | `HRDeepWorkspace` (payroll, KRA reviews, documents, attendance — 631 lines) |
| Employee Mgmt | HR & Office → Employee Mgmt | `HREmployeeManagement` |
| Onboarding | HR & Office → Onboarding | `HROnboarding` |
| KPI & Targets | HR & Office → KPI & Targets | `HRKPIManagement` |
| HR Templates | HR & Office → Templates | `HRTemplates` |
| Documents | HR & Office → Documents | `DocumentVault` |
| Finance Overview | Accounts & Finance → Finance Overview | `AccountsFinanceWorkspace` (revenue, expenses, commissions, payouts) |
| Deep Accounting | Accounts vertical dashboard | `AccountsDeepWorkspace` (chart of accounts, journal entries, invoices) |
| Incentive Payouts | Accounts → Incentive Payouts | `IncentivePayoutApproval` |
| Incentive Admin | Incentives → Admin Dashboard | `SuperAdminIncentiveWorkspace` |
| My Incentives | Incentives → My Incentives | `SalesIncentiveDashboard` |
| Incentive Banner | Embedded in dashboards | `IncentiveBanner` |

### Missing Database Tables (Not Yet Created)
- `hr_attendance` — Daily attendance tracking
- `hr_leave_requests` — Leave application & approval
- `hr_payroll` — Monthly salary processing
- `hr_documents` — Per-employee document storage (separate from document_vault)
- `hr_kra_reviews` — Performance reviews & appraisals

### How to Access (Where to See It)
1. Log in at `/crm-auth`
2. Select the **HR** vertical at `/workspace` → opens HR sidebar
3. Select the **Accounts** vertical → opens Finance sidebar
4. **Incentives** section appears in all verticals for all roles

---

## Phase 1 Build Plan — What's Missing & Needs Building

### 1. Create Missing HR Database Tables
Create 5 tables via migration:
- **`hr_attendance`**: employee_id, date, status (present/absent/half_day/late/wfh), check_in, check_out, notes
- **`hr_leave_requests`**: employee_id, leave_type, from_date, to_date, reason, status (pending/approved/rejected), approved_by
- **`hr_payroll`**: employee_id, month_year, gross_salary, hra, da, deductions, net_salary, status (draft/processed/paid)
- **`hr_documents`**: employee_id, doc_type, file_name, file_url, uploaded_by, created_at
- **`hr_kra_reviews`**: employee_id, review_type, period, kra_data (JSONB), rating, reviewer_id, status

All tables with RLS policies using `is_admin()` function.

### 2. Upgrade HRDeepWorkspace to Use Real Tables
Currently `HRDeepWorkspace` (631 lines) queries these tables but they don't exist yet. Wire it to the new tables so:
- Attendance tab reads/writes `hr_attendance`
- Leave tab reads/writes `hr_leave_requests`
- Payroll tab reads/writes `hr_payroll`
- Documents tab uploads to `hr-documents` storage bucket + writes to `hr_documents`
- KRA Reviews tab reads/writes `hr_kra_reviews`

### 3. Upgrade HRWorkspace to Use Real Tables
Same fix — the attendance and leaves tabs need the real tables.

### 4. Add Deals Pipeline View
Create a `DealsPipeline.tsx` component showing the `deals` table with:
- Customer name, vertical, deal value, status, assigned employee
- Auto-calculated incentive display (from `incentive_entries`)
- Filters by vertical, status, month
- Add to sidebar under the active vertical

### 5. Add Role Switcher for Testing
Add a dev/testing dropdown in the sidebar (Super Admin only) that lets you temporarily view the CRM as Admin / Manager / Sales role without changing database roles.

### 6. Sales "My Earnings" Enhancement
The existing `SalesIncentiveDashboard` already shows personal deals, earnings, and bonus progress. Enhance with:
- Projected monthly payout calculation
- Team leaderboard rank
- Historical earnings chart

---

## Technical Details

**Files to create:**
- Migration SQL for 5 new HR tables with RLS
- `src/components/admin/deals/DealsPipeline.tsx`

**Files to modify:**
- `src/components/admin/hr/HRDeepWorkspace.tsx` — wire to real tables
- `src/components/admin/hr/HRWorkspace.tsx` — wire attendance/leaves to real tables
- `src/components/admin/incentives/SalesIncentiveDashboard.tsx` — add projected payout + leaderboard
- `src/components/admin/AdminSidebar.tsx` — add Deals Pipeline nav item + role switcher
- `src/pages/AdminLayout.tsx` — add deals-pipeline route

**No new edge functions needed** — all operations use direct Supabase client queries with RLS.

