

## R&D: How Top Corporates Build B2B Fleet/Enterprise Pages

### What Leading Corporate Pages Do Differently

Based on research across enterprise fleet pages (Konexial, HERE, top B2B landing pages), here are the key patterns:

1. **Single-Focus Hero with One CTA** — Not three vague icons. A bold value proposition + one primary action (e.g., "Get Fleet Quote" or "Talk to Our Team"). Enterprise buyers want clarity, not decoration.

2. **Social Proof Immediately After Hero** — Logo bar (simple, clean, no cards — just logos in a row) followed by a single powerful stat line ("500+ vehicles delivered across 50+ cities").

3. **Problem → Solution Narrative** — Corporates don't browse; they evaluate. The page should frame a problem ("Fleet procurement is fragmented and slow") then present the solution, not just list features.

4. **ROI/Value Calculators Higher Up** — The Lease vs Buy calculator and Fleet Builder are powerful conversion tools but are buried too deep. Enterprise buyers want to see numbers early.

5. **Fewer Sections, More Depth** — Current page has 14+ sections. Best-in-class B2B pages have 6-8 focused sections max. Redundancy kills trust.

6. **Sticky CTA / Floating Action** — A persistent "Get Corporate Quote" button that follows the user, not buried at the bottom.

7. **Case Studies as Social Proof, Not Separate Section** — Integrate client success metrics inline rather than having separate case studies + testimonials + social proof + logo grid (4 separate trust sections is redundant).

---

### Current Issues Identified

| Problem | Impact |
|---------|--------|
| 14+ sections — excessive for B2B | Decision fatigue, high bounce |
| Hero has 3 generic icons, no clear CTA | No conversion path above fold |
| Logo grid uses large animated cards with marquee | Feels consumer/flashy, not corporate |
| Stats section repeats similar data as logo grid stats | Redundancy |
| Industries section is thin (just pill chips) | Wasted space |
| Fleet Builder + Calculator buried at positions 7-8 | Key tools invisible |
| Case Studies + Testimonials + Social Proof = 3 overlapping trust sections | Consolidate |
| Brochure Download is a tiny standalone section | Should be integrated |
| Scroll progress widget adds clutter for a B2B page | Over-engineered |
| No sticky/floating CTA | Missed conversions |

---

### Proposed Redesigned Flow (8 Sections)

```text
┌─────────────────────────────────────┐
│  1. HERO (Redesigned)               │
│  - Bold headline + subtext          │
│  - Two CTAs: "Get Quote" + "Call"   │
│  - Trusted by: inline logo strip    │
│  - Key stat: "500+ vehicles, 50+    │
│    cities, 100% satisfaction"       │
├─────────────────────────────────────┤
│  2. VALUE PROPOSITION               │
│  - 3-column problem→solution grid   │
│  - Why corporate procurement is     │
│    broken + how we fix it           │
│  - Merge current WhyChoose content  │
├─────────────────────────────────────┤
│  3. HOW IT WORKS (Timeline)         │
│  - Keep current 4-step process      │
│  - Cleaner, more minimal styling    │
├─────────────────────────────────────┤
│  4. FLEET TOOLS (Combined)          │
│  - Tab interface: Fleet Builder |   │
│    Lease vs Buy Calculator |        │
│    Pricing Tiers                    │
│  - Moves interactive tools UP       │
├─────────────────────────────────────┤
│  5. CASE STUDIES + TESTIMONIALS     │
│  - Merged: client logo + quote +    │
│    key metric in one card           │
│  - Comparison table integrated      │
├─────────────────────────────────────┤
│  6. FAQ                             │
│  - Keep accordion, add brochure     │
│    download as inline CTA here      │
├─────────────────────────────────────┤
│  7. CTA + FORM (Final)              │
│  - Full-width, dark bg              │
│  - Form + WhatsApp + Phone          │
├─────────────────────────────────────┤
│  8. STICKY FLOATING CTA BAR         │
│  - Appears after scrolling past     │
│    hero: "Get Corporate Quote"      │
└─────────────────────────────────────┘
```

---

### Design Philosophy Changes

- **Logo grid**: Replace animated marquee cards with a clean, minimal single-row logo strip (grayscale logos, no cards, no animation). This is what Salesforce, HubSpot, and Stripe do.
- **Hero**: Dark, authoritative, single focus. Replace 3 generic icons with inline trust stats. Add two clear CTAs.
- **Color**: Maintain dark slate hero/CTA sections, light sections in between for contrast rhythm (dark → light → light → light → dark).
- **Typography**: Larger headings, tighter line heights, more whitespace between sections.
- **Remove**: CorporateScrollProgress (over-engineered), CorporateSocialProof (redundant), CorporateIndustries (merge into hero or value prop as tags).

### Implementation Plan

1. **Redesign CorporateHero** — Add inline logo strip, trust stats as numbers, two CTA buttons, remove generic icon grid
2. **Create CorporateValueProposition** — New component merging WhyChoose + Industries into a problem→solution narrative
3. **Simplify CorporateLogoGrid** — Convert from animated marquee cards to minimal grayscale logo row
4. **Create CorporateFleetTools** — Tabbed container combining Fleet Builder + Calculator + Pricing Tiers
5. **Merge CorporateCaseStudies + Testimonials** — Single unified trust section with client stories + metrics
6. **Add Floating CTA Bar** — Sticky bottom bar with "Get Corporate Quote" after scrolling past hero
7. **Update page layout** — Reorder and remove redundant sections (ScrollProgress, SocialProof, standalone BrochureDownload)
8. **Clean CorporateProcessTimeline** — Simplify styling, less decorative, more corporate-clean

