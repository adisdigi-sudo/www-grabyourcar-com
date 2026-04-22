---
name: Finance Office (CFO Rebuild v2)
description: Corporate-style 3-role Finance workspace replacing old CFO Board — Accountant/CFO/Founder views
type: feature
---
Finance Office is the rebuilt finance workspace at `src/components/admin/finance/finance-v2/`.
Replaced the old `cfo-board/` folder (deleted).

**Entry**: ZohoAccountsWorkspace sidebar item `finance-office` (label "Finance Office").

**Architecture**: Single FinanceWorkspace.tsx with role switcher → 3 lazy-loaded views:
- AccountantView — daily expenses, invoices, vendor payments, bank reco
- CFOView — budget planner, approval inbox, team targets, P&L designer, docs drawer
- FounderView — executive summary, final approvals, reports library, P&L comparison

**Design**: Corporate style — slate/navy palette, font-serif headings, white cards, subtle borders, no gradients on KPIs. Shared `SectionCard` and `StatTile` primitives in `finance-v2/shared/`.

**Data**: Reuses corporate_budgets, expenses, invoices, approvals_queue. No new tables yet — placeholders for team_targets, cfo_documents, cfo_pl_templates (next turns).

**Default view**: CFO (central piece per user direction).
