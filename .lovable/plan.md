

## Plan: Import CSV Booking Data with Correct Expiry Dates

### Understanding
Your CSV has 47 policies. The old policy expired **7 days before** the booking date. So for each record:
- `policy_expiry_date` on `insurance_clients` = `Booking Date - 7 days` (this is when the old policy expired, triggering the renewal)
- `insurance_policies.expiry_date` = `start_date + 1 year - 1 day` (the new policy's expiry, already set correctly)

### Data Updates

**Step 1 — Update `insurance_clients` with correct data from CSV**

For each of the 47 rows, match by `vehicle_number` (Registration Number) and update:
- `policy_expiry_date` = Booking Date minus 7 days
- `current_insurer` = Insurer from CSV
- `current_premium` = Premium (total) from CSV
- `current_policy_number` = Policy No from CSV
- `current_policy_type` = Policy Type from CSV
- `city` / `state` / `pincode` where missing

This will be done via individual UPDATE statements matched on `vehicle_number`.

**Step 2 — Verify `insurance_policies` table alignment**

The `insurance_policies` records already have `start_date` derived from the CSV's issuance date and `expiry_date` = start + 1 year. These should now be correct. I'll cross-check and fix any mismatches.

**Step 3 — Handle the "Rejected" entries**

Two CSV rows have status "Rejected(Post Issuance)" (rows 13 and 20 — SEWA E CLASS and RAJAT SURI Hector). These will be marked with appropriate status in both tables.

### Technical Details

- All 47 vehicle numbers from the CSV already exist in `insurance_clients` (matched previously during import)
- Updates will be done using the data insert tool with UPDATE SQL
- No schema changes needed — all required columns already exist

