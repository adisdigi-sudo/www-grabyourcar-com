

# Fuel-Type Based Variant Grouping (Like Tata Punch Petrol/Diesel/EV)

## Problem
Currently, all variants for a car are shown in a single flat list. Real-world cars like Tata Punch come in Petrol, Diesel, and Electric versions — each with completely different variant names, prices, and features. Users need to first pick the fuel type, then see only relevant variants.

## What Changes

### 1. Frontend Variant Display — Fuel Type Tabs
**Files**: `CarPricingConfigurator.tsx`, `PriceSummaryCard.tsx`, `VariantComparisonTable.tsx`

- Extract unique fuel types from the car's variants
- If a car has 2+ fuel types, show **toggle tabs** (e.g., `Petrol | Diesel | Electric`) above the variant selector
- Filter the variant dropdown to only show variants matching the selected fuel type
- Auto-select the first variant when switching fuel types
- Show fuel type badge on each variant in the dropdown

### 2. Variant Comparison Table — Fuel Type Filter
**File**: `VariantComparisonTable.tsx`

- Add fuel type toggle pills at the top of the comparison table
- Filter compared variants by selected fuel type
- Show "All" option to compare across fuel types

### 3. Admin Upload Wizard — Fuel Type Grouping UI
**File**: `CarUploadWizard.tsx`

- Group variant cards visually by fuel type with section headers (e.g., "Petrol Variants", "Diesel Variants")
- Add a "Quick Add Fuel Group" button that creates a batch of common variant names for a fuel type
- Sort variants by fuel type automatically in the review step

### 4. Admin Variant Management — Grouped View
**File**: `VariantPricingManagement.tsx`

- Group variants by fuel type in the table display
- Show fuel type section headers with variant count per fuel type

## Technical Details

- No database changes needed — `car_variants` table already has `fuel_type` column
- Fuel type grouping is done client-side using `Array.filter()` and grouping by `fuelType`/`fuel_type`
- The grouping logic:
  ```typescript
  const fuelTypes = [...new Set(variants.map(v => v.fuelType).filter(Boolean))];
  const filteredVariants = selectedFuel === 'All' 
    ? variants 
    : variants.filter(v => v.fuelType === selectedFuel);
  ```
- When only 1 fuel type exists, tabs are hidden and behavior stays exactly as current

