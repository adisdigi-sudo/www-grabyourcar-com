
-- Insert expertise columns content into insurance_content table
INSERT INTO public.insurance_content (section_key, section_title, section_data, is_active)
VALUES (
  'hero_expertise',
  'Hero Expertise Columns',
  '{
    "columns": [
      {
        "icon": "Shield",
        "title": "20+ Trusted Insurers",
        "description": "Compare plans from HDFC ERGO, ICICI Lombard, Bajaj Allianz & more top-rated providers",
        "stat": "20+",
        "stat_label": "Partners"
      },
      {
        "icon": "TrendingUp",
        "title": "98.3% Claim Settlement",
        "description": "Industry-leading claim approval rate with dedicated assistance throughout the process",
        "stat": "98.3%",
        "stat_label": "Settlement"
      },
      {
        "icon": "Zap",
        "title": "Instant Digital Policy",
        "description": "Get your policy issued in under 2 minutes with zero paperwork and instant confirmation",
        "stat": "2 Min",
        "stat_label": "Issuance"
      },
      {
        "icon": "Wallet",
        "title": "Save Up To 85%",
        "description": "Lowest premiums guaranteed with exclusive online discounts and no-claim bonuses",
        "stat": "85%",
        "stat_label": "Savings"
      }
    ]
  }'::jsonb,
  true
)
ON CONFLICT DO NOTHING;
