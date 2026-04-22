# Master Plan — 3 Major Refactors

> **Status**: Planning only. No code changes yet.
> **User intent**: Clean, corporate, role-separated workspaces. Insurance-style live performance everywhere. Marketing/Tech reduced to essentials. CFO rebuilt from scratch in corporate style.

---

## 🎯 PART 1 — Performance Dashboards in All 7 Verticals

**Pattern reference**: Insurance Performance Dashboard
- Period filter: Today / Yesterday / This Week / This Month / This Quarter / This Year / Custom
- KPI cards (4–6): revenue, conversions, pending, conversion rate
- Achiever Leaderboard (employee → count, value, incentive)
- Detailed table (expandable, exportable)
- Live data only (no mocks)

### Verticals to build

| # | Vertical | Source table | Won metric | Achiever | Incentive |
|---|----------|--------------|------------|----------|-----------|
| 1 | Insurance | insurance_clients (won) | premium_amount | assigned_executive | new ₹500 / renewal ₹300 |
| 2 | Car Loans | loan_applications (disbursed) | disbursement_amount | assigned_to | % from incentive_rules |
| 3 | HSRP | hsrp_bookings (paid) | payment_amount | assigned_to | per plate |
| 4 | Car Sales (Dealer) | deals (closed+received) | deal_value | assigned_to | per deal |
| 5 | Self-Drive Rentals | rental_bookings (paid) | total_amount | assigned_to | per booking |
| 6 | Accessories | accessory_orders (delivered) | total_amount | system | flat ₹50/order |
| 7 | Used Cars | deals filtered Used Car | deal_value | assigned_to | rules |

### Approach
- Reusable component: `<VerticalPerformanceDashboard verticalSlug config />`
- Build Loans first → approve → reuse for next 6
- Each vertical ~30 min once template locked

### Files to create
```
src/components/admin/shared/performance/
  ├── VerticalPerformanceDashboard.tsx
  ├── PerformanceKPICards.tsx
  ├── PerformanceLeaderboard.tsx
  ├── PerformanceDetailTable.tsx
  ├── PeriodFilter.tsx
  └── usePerformanceData.ts
src/lib/performance/
  ├── verticalConfigs.ts
  └── incentiveCalculator.ts
```

---

## 🎯 PART 2 — Marketing & Tech Cleanup (Corporate Rebuild)

### Current problem
- 15+ tabs in UnifiedMarketingHub
- 6 more in MarketingCommandCenter
- Massive overlap, no single source of truth

### New 3-Pillar Structure

```
Marketing & Tech Workspace
├── WEBSITE          ├── MARKETING              ├── TECH
│  • Pages/CMS       │  Channels:                │  • Integrations
│  • SEO Manager     │   - Email                 │  • Edge Functions
│  • Blog            │   - WhatsApp              │  • DB Health
│  • Forms           │   - SMS                   │  • API Keys
│  • Analytics       │   - RCS                   │  • Webhooks
│  • Frontend        │   - Meta Ads (live)       │  • Logs
│  • Backend         │   - Google Ads (live)     │
│                    │  • Unified ROI Dashboard  │
│                    │  • Audiences              │
│                    │  • Automations            │
```

### KEEP (migrate into new structure)
- Website CMS, SEO, blog, forms
- Email: merge Campaigns + Templates + Subscribers + Sequences into ONE tab with sub-views
- WhatsApp: existing WAHubLayout (already complete)
- SMS / RCS: minimal new tabs
- Meta Ads + Google Ads: live sync dashboards
- Unified ROI: cross-channel spend vs revenue

### DELETE / ARCHIVE
- Standalone tabs: Lead Scoring (→ CRM), Journeys (→ automation), Pop-ups, Cart Recovery, Polls, Dynamic Content (→ all merge under Email Advanced)
- MarketingCommandCenter page
- Duplicate Email Inbox

### New files
```
src/components/admin/marketing-tech/
  ├── MarketingTechWorkspace.tsx
  ├── website/WebsiteColumn.tsx
  ├── marketing/MarketingColumn.tsx
  ├── marketing/UnifiedROIDashboard.tsx
  ├── marketing/channels/
  │     ├── EmailChannel.tsx
  │     ├── WhatsAppChannel.tsx
  │     ├── SMSChannel.tsx
  │     ├── RCSChannel.tsx
  │     ├── MetaAdsChannel.tsx
  │     └── GoogleAdsChannel.tsx
  └── tech/TechColumn.tsx
```

### Mockup process
1. Build empty 3-column shell
2. Show screenshot
3. Get approval
4. Migrate existing components
5. Then delete old tabs

---

## 🎯 PART 3 — CFO Workspace Complete Rebuild (Corporate Style)

### User decision
> "existing sab delete, new tab add, clearly cleanly rich design corporate style rebuild"

### Role-based 3-View Architecture

```
Finance Workspace (new top-level tab)
├── 🟢 Accountant View (data entry, daily ops)
│     ├── Daily Expenses Entry
│     ├── Invoice Management
│     ├── Vendor Payments
│     ├── Bank Reconciliation
│     └── Document Upload (bills, receipts)
│
├── 🔵 CFO View (planning, approval, P&L design)
│     ├── Budget Planner (auto split D/W/M/Q/Y)
│     ├── Budget Execution Tracker (planned vs actual live)
│     ├── Approval Inbox (incoming spend requests)
│     ├── Team Targets & Performance (vertical-wise)
│     ├── Loan Documents Drawer
│     ├── Company Documents Drawer
│     ├── Draft Reports Builder
│     ├── Monthly P&L Designer (drag fields)
│     └── Cash Flow Forecast
│
└── 🟡 Founder View (read-only oversight + final auth)
      ├── Executive Dashboard (one-page)
      ├── Pending Final Approvals (CFO-screened)
      ├── Monthly P&L (read + download PDF/Excel)
      ├── All Reports Library (downloadable)
      ├── Approve / Reject Center
      └── P&L Comparison (MoM, YoY)
```

### Tab placement
- New top-level **Finance** tab (replaces current CFO Board)
- Inside Finance → 3 view-tabs: Accountant | CFO | Founder
- Auto-route by role; super_admin sees all 3

### Design language (Corporate)
- Muted slate/navy palette, serif headings (Playfair Display)
- Generous white space, subtle borders, NO gradients on KPIs
- Print-friendly P&L (real financial-statement look)
- Excel-style tables with grid lines
- Color: green=surplus, red=deficit, neutral elsewhere

### New files
```
src/components/admin/finance-v2/
  ├── FinanceWorkspace.tsx
  ├── accountant/
  │     ├── AccountantDashboard.tsx
  │     ├── DailyExpensesEntry.tsx
  │     ├── InvoiceManagement.tsx
  │     ├── VendorPayments.tsx
  │     ├── BankReconciliation.tsx
  │     └── DocumentUpload.tsx
  ├── cfo/
  │     ├── CFODashboard.tsx
  │     ├── BudgetPlanner.tsx
  │     ├── BudgetExecutionTracker.tsx
  │     ├── ApprovalInbox.tsx
  │     ├── TeamTargets.tsx
  │     ├── LoanDocsDrawer.tsx
  │     ├── CompanyDocsDrawer.tsx
  │     ├── ReportsBuilder.tsx
  │     ├── MonthlyPLDesigner.tsx
  │     └── CashFlowForecast.tsx
  └── founder/
        ├── FounderDashboard.tsx
        ├── PendingApprovals.tsx
        ├── MonthlyPLViewer.tsx
        ├── ReportsLibrary.tsx
        ├── ApprovalCenter.tsx
        └── PLComparison.tsx
```

### Data sources (already exist)
- expenses, invoices, bank_accounts, bank_transactions
- marketing_budgets (corporate-budget-engine)
- approvals_queue, pl_entries, team_members
- All vertical "won" tables for revenue
- incentive_rules

### Tables to ADD
- cfo_documents (loan docs, company docs, drafts)
- cfo_pl_templates (saved P&L layouts)
- team_targets (per vertical, per period)

### DELETE
- src/components/admin/finance/cfo-board/ (entire folder)
- All registrations pointing to old CFO Board

---

## 📋 Recommended Build Order

| Phase | What | Turns | Why |
|-------|------|-------|-----|
| 1 | CFO Workspace rebuild | 2-3 | User most confused here, fresh start clears fastest |
| 2 | Marketing & Tech 3-column shell + mockup | 1 | Show structure before deleting |
| 3 | Marketing & Tech migration | 2-3 | Risky — must not break working flows |
| 4 | Performance dashboard — Loans first | 1 | Template establishment |
| 5 | Performance dashboards — remaining 6 | 2 | Repeat pattern |

**Total**: 8-10 focused turns.

---

## ❓ Decisions Needed

1. **CFO build order**: Accountant first / Founder first / CFO middle first?
2. **Marketing migration**: Parallel old+new during transition, or hard cutover?
3. **Performance template**: Incentives editable per-vertical from CFO, or hardcoded per incentive_rules?
4. **Founder approval**: Auto-notify via WhatsApp on CFO escalation?

---

## ⚠️ Risks

| Risk | Mitigation |
|------|-----------|
| Deleting CFO Board breaks references | Search all imports before delete, redirect routes |
| Marketing migration breaks live email/WA | Keep edge functions untouched, only refactor UI shell |
| Performance shows wrong numbers (insurance bug repeat) | Use SAME query as each vertical's existing performance page |
| 3-role split confuses single-user setup | Super admin sees all 3 via tab switcher; additive not exclusive |

---

*End of plan. Awaiting direction on which phase to start.*
