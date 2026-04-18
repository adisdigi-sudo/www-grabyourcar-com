---
name: Reply Agents Builder
description: Form-based AI reply agent system for WhatsApp & Email — manageable by Super Admin and vertical managers without engineer support
type: feature
---

The platform includes a Viasocket-style **Reply Agents Builder** (Admin → AI Automation Hub → "Reply Agents" tab) that lets Super Admins and vertical managers create form-based AI agents to auto-reply on WhatsApp and Email.

**Schema:** `reply_agents` (name, vertical_id, channel, trigger_type [inbound_message/keyword/new_lead/any], trigger_keywords[], system_prompt, knowledge_base, ai_model, temperature, auto_send, business_hours_only, max_replies_per_lead, is_active, stats: total_runs/replies_sent/approvals_pending) + `reply_agent_logs` audit table.

**Edge function:** `reply-agent-runner` calls Lovable AI Gateway with the agent's prompt + knowledge base, logs every run, increments stats, and handles 429/402 gracefully. Supports `test_mode` for the in-form Test button.

**RLS:** Super Admins (via `is_super_admin_user()`) have full CRUD; all authenticated users can read agents and logs.

**UI files:** `src/components/admin/automation/ReplyAgentsBuilder.tsx`, `ReplyAgentForm.tsx`, `ReplyAgentLogs.tsx`. Wired into `AIAutomationHub.tsx` as the default tab.
