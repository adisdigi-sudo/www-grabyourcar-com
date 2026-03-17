

# Plan: Lead Auto-Assignment System + Person-Level Routing

## Problem
Currently, leads are assigned to **teams** (e.g., "sales", "insurance_team") but never to **individual people**. There's no round-robin auto-assignment, no manager-to-employee delegation, and imported leads sit unassigned.

## What Will Be Built

### 1. Database: Lead Assignment Tracking Table
Create a `lead_assignments` table to track who assigned what to whom, with history:

```sql
CREATE TABLE public.lead_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  assigned_to_user_id uuid REFERENCES auth.users(id) NOT NULL,
  assigned_by_user_id uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  vertical_id uuid REFERENCES business_verticals(id),
  assignment_type text DEFAULT 'manual', -- 'manual', 'auto_round_robin', 'import'
  status text DEFAULT 'active', -- 'active', 'reassigned', 'completed'
  notes text
);
```

Also add a DB function `auto_assign_lead_round_robin(vertical_id, lead_id)` that picks the team member with the fewest active assignments in that vertical.

### 2. Auto-Assignment on Import
Update the `LeadImportManager` and `lead-import` edge function so that when leads are imported:
- They land in the `leads` table with status `new`
- The system auto-runs round-robin assignment based on the vertical
- Each lead gets assigned to the team member with the least active leads
- Admin/Manager can override assignments afterward

### 3. Lead Assignment UI in LeadManagement.tsx
Replace the current team-only dropdown with a **person-level assignment** dropdown:
- Fetch `team_members` who have access to the current vertical
- Show member name + current lead count
- "Auto-Assign" button for bulk round-robin
- Assignment history visible in lead detail modal
- Managers see all leads in their vertical; employees see only their assigned leads

### 4. Manager Assignment Panel
Add an "Assign Leads" bulk action:
- Select multiple unassigned leads via checkboxes
- Choose employee from dropdown → bulk assign
- Or click "Auto-Assign All" for round-robin distribution

### 5. Employee Filtered View
Update `FreshLeadsQueue` and `LeadManagement`:
- If user role is `employee/member`: filter leads by `assigned_to_user_id = current_user`
- If `manager`: see all leads in their vertical, can reassign
- If `super_admin`: see everything, assign to any vertical/person

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| DB migration | Create | `lead_assignments` table + round-robin function |
| `src/components/admin/LeadManagement.tsx` | Modify | Add person-level assignment dropdown, bulk assign, role-based filtering |
| `src/components/admin/calling/FreshLeadsQueue.tsx` | Modify | Filter by assigned user for employees |
| `src/components/admin/shared/LeadAssignmentPanel.tsx` | Create | Reusable assignment UI with round-robin |
| `src/components/admin/LeadImportManager.tsx` | Modify | Auto-assign on import |
| `supabase/functions/lead-import/index.ts` | Modify | Call round-robin after insert |

### Assignment Flow
```text
Lead Imported/Created
  → Auto-assigned via round-robin to employee with fewest active leads
  → Admin/Manager can reassign anytime
  → Employee sees only their assigned leads in queue
  → Assignment history tracked in lead_assignments table
```

### Role-Based Access
- **Super Admin**: Sees all leads, assigns to anyone in any vertical
- **Vertical Manager**: Sees all leads in their vertical(s), assigns to employees in that vertical
- **Employee**: Sees only leads assigned to them, cannot reassign

