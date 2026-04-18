export interface SalesEngine {
  id: string;
  name: string;
  description: string | null;
  vertical: string;
  trigger_template_name: string | null;
  language: string | null;
  is_active: boolean;
  qualify_action: string;
  handover_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesEngineStep {
  id: string;
  engine_id: string;
  step_key: string;
  step_order: number;
  title: string | null;
  message_text: string;
  message_type: string;
  media_url: string | null;
  template_name: string | null;
  expects_reply: boolean;
  capture_field: string | null;
  is_initial: boolean;
  is_terminal: boolean;
}

export interface SalesEngineBranch {
  id: string;
  step_id: string;
  branch_order: number;
  match_type: "keyword" | "regex" | "any" | "no_match";
  match_keywords: string[] | null;
  next_step_key: string | null;
  action: "continue" | "qualify" | "disqualify" | "handover" | "end";
  action_note: string | null;
}

export const VERTICALS = [
  { value: "loans", label: "Car Loans", color: "bg-blue-500" },
  { value: "insurance", label: "Insurance", color: "bg-emerald-500" },
  { value: "sales", label: "Car Sales", color: "bg-orange-500" },
  { value: "hsrp", label: "HSRP", color: "bg-purple-500" },
  { value: "rentals", label: "Self Drive", color: "bg-cyan-500" },
  { value: "accessories", label: "Accessories", color: "bg-pink-500" },
  { value: "custom", label: "Custom", color: "bg-gray-500" },
];

export const ACTIONS = [
  { value: "continue", label: "Continue → next step", color: "text-blue-600" },
  { value: "qualify", label: "✅ Qualify (create lead)", color: "text-green-600" },
  { value: "disqualify", label: "❌ Disqualify (close)", color: "text-red-600" },
  { value: "handover", label: "👤 Handover to agent", color: "text-amber-600" },
  { value: "end", label: "End conversation", color: "text-gray-600" },
];
