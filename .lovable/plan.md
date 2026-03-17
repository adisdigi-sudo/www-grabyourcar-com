

# Plan: WhatsApp Fallback Toggle + Delivery Tracking + Multi-User Team Management System

## Part 1: WhatsApp Fallback Toggle in Integration Hub

**Current state**: `sendWhatsApp.ts` always tries API first, falls back to wa.me on failure.

**Change**: Add a toggle in `WAIntegrationHub.tsx` that stores the user's preference in `admin_settings` table (key: `whatsapp_send_mode`, value: `api` or `manual`). Update `sendWhatsApp.ts` to check this setting before sending.

**Files to modify:**
- `src/components/admin/marketing/wa/WAIntegrationHub.tsx` — add Switch toggle for "API Send" vs "Manual wa.me" mode
- `src/lib/sendWhatsApp.ts` — check `admin_settings` for mode before sending; if `manual`, go directly to wa.me link

## Part 2: Delivery Status Tracking (sent/delivered/read)

**Current state**: `wa_message_logs` already has `delivered_at`, `read_at`, `replied_at` columns. The `whatsapp-webhook` edge function exists but uses old Finbite format.

**Changes needed:**
1. **Update `whatsapp-webhook/index.ts`** — Add a Meta webhook handler that processes delivery status updates (`sent`, `delivered`, `read`) from Meta's webhook callbacks. Match by `provider_message_id` and update `wa_message_logs`.
2. **Create a delivery status UI component** — Show sent/delivered/read indicators (checkmarks like WhatsApp) in a new `WAMessageStatusTracker.tsx` component, accessible from the Marketing WhatsApp portal.
3. **Add a "Message Logs" tab** to `WhatsAppMarketingPortal.tsx` showing recent messages with real-time status.

**Files to create/modify:**
- `supabase/functions/whatsapp-webhook/index.ts` — add Meta status webhook handler
- `src/components/admin/marketing/wa/WAMessageStatusTracker.tsx` — new component showing message delivery statuses
- `src/components/admin/marketing/WhatsAppMarketingPortal.tsx` — add "Message Logs" tab

## Part 3: Multi-User Team Management System

**Current state**: The infrastructure already exists:
- `user_roles` table with `app_role` enum: `super_admin`, `admin`, `sales`, `dealer`, `finance`, `insurance`, `marketing`, `calling`, `operations`
- `team_members` table with `user_id`, `username`, `display_name`, `phone`, `designation`, `department`
- `user_vertical_access` table mapping users to verticals with `access_level`
- `business_verticals` table with 7 verticals
- `admin-manage-users` edge function handling create/update/delete/reset-password/list
- `WorkspaceSelector.tsx` showing only assigned verticals
- `useVerticalAccess` hook filtering verticals by role

**What's missing**: A proper **User Management UI** for super admins to create/manage unlimited employees with vertical-specific access.

### Hierarchy enforcement:
```text
Super Admin (you)
  ├── Can access ALL verticals
  ├── Can create/manage all users
  ├── Login: own credentials (9855924442)
  │
  ├── Vertical Manager (role: admin per vertical)
  │   ├── Sees only assigned verticals
  │   ├── Cannot access other verticals
  │   └── Cannot create users
  │
  └── Employee (role: sales/insurance/calling/etc.)
      ├── Sees only assigned vertical(s)
      ├── Own login credentials (username@grabyourcar)
      └── Cannot access admin functions
```

### Changes needed:

1. **Enhance `admin-manage-users` edge function** — Add `access_level` support (`manager` vs `member`) when assigning verticals, so managers can be distinguished within a vertical.

2. **Build a rich User Management Dashboard** (`src/components/admin/UserManagementDashboard.tsx`):
   - List all team members with their roles, assigned verticals, and status
   - Search/filter by role, vertical, status
   - "Create Employee" form: username, display name, phone, designation, department, role, vertical assignments with access level (manager/member)
   - Auto-generates credentials: `username@grabyourcar` + default password
   - Edit employee: change role, verticals, active/inactive
   - Reset password
   - Shows employee count per vertical

3. **Update `useAdminAuth`** — Add `canManageUsers()` returning true only for `super_admin`.

4. **Update `AdminLayout.tsx`** — Wire the User Management tab to the new dashboard (accessible only to super_admin).

5. **Update `useVerticalAccess`** — Use `access_level` from `user_vertical_access` to expose whether user is a `manager` in the active vertical.

**Database migration**: Update `user_vertical_access.access_level` to properly use `manager`/`member` values (column exists, just need to use it in the UI and edge function).

### Files to create/modify:
- `src/components/admin/UserManagementDashboard.tsx` — new rich UI for team management
- `supabase/functions/admin-manage-users/index.ts` — add access_level support
- `src/hooks/useAdminAuth.tsx` — add `canManageUsers()`
- `src/hooks/useVerticalAccess.tsx` — expose access_level
- `src/pages/AdminLayout.tsx` — wire User Management tab

## Summary

| Area | Files | Type |
|------|-------|------|
| WA Fallback Toggle | 2 files | Modify |
| Delivery Tracking | 3 files | Create + Modify |
| User Management | 5 files | Create + Modify |
| Edge Functions | 2 functions | Modify |
| Database | 0 migrations (existing schema sufficient) | None |

