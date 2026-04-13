

# GYC CRM Final Setup Plan — Whiteboard Points (1-6)

Based on your whiteboard, here are the 6 items decoded and what needs to be built/fixed for each:

---

## Point 1: All Verticals — Test & Fix Workflow

**What it means:** Every vertical (Insurance, Sales, Loans, HSRP, Rental, Accessories, Marketing, etc.) should have a working end-to-end workflow — from lead creation to closure.

**Current state:** WorkflowEngine.tsx exists but is **purely visual/static** — no actual enforcement. Stage transitions, mandatory fields, and approval gates are hardcoded constants with no database backing.

**What to do:**
- Audit each vertical's pipeline stages against the WorkflowEngine config
- Ensure pipeline_stage transitions are validated (e.g., can't skip stages)
- Add mandatory field checks before stage advancement
- Add approval checkpoints for stages marked with `approval: true`
- Test each vertical end-to-end: New Lead → Stages → Won/Lost

---

## Point 2: Team Hierarchy — Assign, Create Role, Give Work

**What it means:** Proper organizational hierarchy: **Telecaller/Executive → Team Leader → Manager → Super Admin**

**Current state:** 
- `team_members` table has NO `reporting_to`, `manager_id`, or `team_leader_id` columns
- Designations are flat text: "Executive", "Telecalling", "HR Executive", "Accountant"
- No Team Leader or Manager designation exists
- User roles (`user_roles` table) only have: admin, super_admin, sales, dealer, finance, insurance, marketing, calling, operations
- **Missing:** `team_leader` and `manager` roles in the enum

**What to build:**
1. Add columns to `team_members`: `reporting_to UUID`, `role_tier TEXT` (caller, team_leader, manager)
2. Add `team_leader` and `manager` to the `app_role` enum
3. Update SuperAdminUserManager to support hierarchy assignment (who reports to whom)
4. Add lead assignment rules: Team Leaders assign work to their callers only
5. Enforce data isolation: Callers see only their assigned leads, Team Leaders see their team's leads, Managers see all in their vertical

---

## Point 3: Track & Report — Hierarchical Reporting Chain

**What it means:** Every activity tracked and reported upward: **Telecaller → Team Leader → Manager → Super Admin/Founder**

**Current state:**
- `employee_sessions` table exists (login/active/idle/break tracking)
- `admin_activity_logs` exists but basic
- Auto-Pilot has morning briefing & evening report but only to Super Admin
- No hierarchical reporting chain

**What to build:**
1. Performance reports auto-sent to each level:
   - Telecaller's daily report → their Team Leader
   - Team Leader's team summary → their Manager  
   - Manager's vertical summary → Super Admin
2. Update the Auto-Pilot agents to respect hierarchy
3. Add a "My Team" dashboard for Team Leaders showing their members' performance
4. Add a "My Vertical" dashboard for Managers showing all teams

---

## Point 4: Marketing Setup — Clear Build & Auto Reports

**What it means:** Marketing vertical should be clearly set up with auto-reporting flowing up the hierarchy. Telecaller → Team Leader → Manager → Super Admin.

**Current state:** Marketing Command Center exists with campaigns, lead scoring, journeys, email, WhatsApp tabs. Auto-Pilot dashboard exists but reports only go to Super Admin.

**What to build:**
1. Clean up Marketing workspace — ensure all tabs work
2. Configure auto-reports to go to relevant hierarchy levels
3. Campaign performance auto-sent to Team Leaders daily
4. Weekly summary to Managers and Super Admin

---

## Point 5: Team Size Limits — Max 10 per Leader

**What it means:** Organizational cap: **Max 10 persons under 1 Team Leader, Max 10 Team Leaders under 1 Manager.**

**What to build:**
1. Add validation in user management: when assigning `reporting_to`, check count
2. If a Team Leader already has 10 members → block with error
3. If a Manager already has 10 Team Leaders → block with error
4. Show capacity indicators in the user management UI (e.g., "7/10 slots used")

---

## Point 6: Data Room — Centralized Data Repository

**What it means:** A secure "Data Room" where all critical business data is stored. Super Admin can access monthly data, replace/add data, with automated growth tracking and reporting via email.

**Current state:** DataExportEngine exists but is just a CSV/Excel export tool. No centralized data room.

**What to build:**
1. New "Data Room" page accessible only to Super Admin
2. Monthly snapshots of key metrics (revenue, leads, conversions, team performance) auto-saved
3. Upload/replace capability for bulk data (Excel imports)
4. Growth charts: month-over-month, quarter-over-quarter
5. Auto-email monthly summary to Super Admin with growth metrics
6. All data exportable (CSV, Excel, PDF)

---

## Implementation Order

| Phase | Items | Priority |
|-------|-------|----------|
| **Phase A** | Point 2 — Team Hierarchy (DB + roles + UI) | Highest — everything depends on this |
| **Phase B** | Point 5 — Team Size Limits (validation) | Built into Phase A |
| **Phase C** | Point 3 — Hierarchical Reporting Chain | Depends on Phase A |
| **Phase D** | Point 4 — Marketing Auto-Reports | Uses Phase C infrastructure |
| **Phase E** | Point 1 — Vertical Workflow Enforcement | Independent, can parallel |
| **Phase F** | Point 6 — Data Room | Independent, can parallel |

---

## Technical Details

**Database changes (Phase A):**
```sql
-- Add hierarchy columns to team_members
ALTER TABLE team_members ADD COLUMN reporting_to UUID REFERENCES team_members(id);
ALTER TABLE team_members ADD COLUMN role_tier TEXT DEFAULT 'caller' 
  CHECK (role_tier IN ('caller', 'team_leader', 'manager'));
ALTER TABLE team_members ADD COLUMN max_reports INTEGER DEFAULT 10;

-- Add team_leader and manager to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'team_leader';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'manager';
```

**New components:**
- `src/components/admin/TeamHierarchyView.tsx` — org chart visualization
- `src/components/admin/DataRoom.tsx` — Super Admin data repository
- `src/components/admin/MyTeamDashboard.tsx` — Team Leader view

**Edge function updates:**
- `auto-pilot-engine` — add hierarchical report recipients
- New: `monthly-data-snapshot` — cron job for Data Room

**Files to modify:**
- `SuperAdminUserManager.tsx` — add reporting_to assignment + capacity limits
- `AdminSidebar.tsx` — add Data Room, My Team nav items
- `AdminLayout.tsx` — register new tab components
- `useAdminAuth.tsx` — recognize team_leader/manager roles
- `useVerticalAccess.tsx` — filter leads by hierarchy

