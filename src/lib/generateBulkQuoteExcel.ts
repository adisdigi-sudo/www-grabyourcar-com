import ExcelJS from "exceljs";
import { format } from "date-fns";

interface PrefilledLead {
  customer_name?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_number?: string | null;
  vehicle_year?: number | null;
  fuel_type?: string | null;
  current_insurer?: string | null;
  current_policy_type?: string | null;
  ncb_percentage?: number | null;
  current_premium?: number | null;
  premium?: number | null;
  ex_showroom_price?: number | null;
}

// Column layout:
// A=Customer Name, B=Phone, C=Email, D=City,
// E=Vehicle Make, F=Vehicle Model, G=Vehicle Number, H=Vehicle Year,
// I=Fuel Type, J=Insurance Company, K=Policy Type, L=Ex-Showroom Price,
// M=Basic OD, N=OD Discount %, O=NCB %,
// P=Third Party, Q=Secure Premium, R=Addon Premium, S=Addons,
// --- Auto-calculated ---
// T=IDV (auto from Ex-Showroom + Year), U=NCB Discount, V=OD Discount Amt,
// W=Net OD, X=Net Premium, Y=GST (18%), Z=Total Premium

const INPUT_HEADERS = [
  "Customer Name", "Phone", "Email", "City",
  "Vehicle Make", "Vehicle Model", "Vehicle Number", "Vehicle Year",
  "Fuel Type", "Insurance Company", "Policy Type", "Ex-Showroom Price",
  "Basic OD", "OD Discount %", "NCB %",
  "Third Party", "Secure Premium", "Addon Premium", "Addons",
];

const FORMULA_HEADERS = [
  "IDV (Auto)", "NCB Discount", "OD Discount Amt", "Net OD", "Net Premium", "GST (18%)", "Total Premium",
];

const FUEL_OPTIONS = '"Petrol,Diesel,CNG,Electric,Hybrid"';
const POLICY_OPTIONS = '"Comprehensive,Third Party,Own Damage,Standalone OD"';

export async function generateBulkQuoteExcel(prefilledLeads?: PrefilledLead[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "GrabYourCar Insurance CRM";
  const ws = wb.addWorksheet("Bulk Quotes", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const allHeaders = [...INPUT_HEADERS, ...FORMULA_HEADERS];
  const headerRow = ws.addRow(allHeaders);

  // Style headers
  const inputFill: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
  const formulaFill: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D7C3E" } };
  const idvFill: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF8B5CF6" } }; // Purple for IDV
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  const borderThin: Partial<ExcelJS.Borders> = {
    top: { style: "thin" }, bottom: { style: "thin" },
    left: { style: "thin" }, right: { style: "thin" },
  };

  headerRow.eachCell((cell, colNumber) => {
    cell.font = headerFont;
    if (colNumber <= INPUT_HEADERS.length) {
      cell.fill = inputFill;
    } else if (colNumber === INPUT_HEADERS.length + 1) {
      // IDV column gets special purple fill
      cell.fill = idvFill;
    } else {
      cell.fill = formulaFill;
    }
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = borderThin;
  });
  headerRow.height = 28;

  // Column widths
  const widths = [
    18, 14, 20, 12, 14, 14, 14, 10, 10, 18, 16, 14, // A-L (Ex-Showroom=L)
    10, 12, 10, 10, 12, 12, 24, // M-S (input)
    14, 12, 14, 10, 12, 12, 14, // T-Z (formula)
  ];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // Add data validation for fuel type (col I=9) and policy type (col K=11)
  const dataRows = Math.max(prefilledLeads?.length || 0, 50);
  for (let r = 2; r <= dataRows + 1; r++) {
    ws.getCell(r, 9).dataValidation = { type: "list", formulae: [FUEL_OPTIONS] };
    ws.getCell(r, 11).dataValidation = { type: "list", formulae: [POLICY_OPTIONS] };
  }

  // Current year for IDV depreciation calculation
  const currentYear = new Date().getFullYear();

  // Add formulas for calculated columns (rows 2 to dataRows+1)
  for (let r = 2; r <= dataRows + 1; r++) {
    // T (col 20): IDV Auto-Calculator
    // Logic: Vehicle Age = Current Year - Vehicle Year (H)
    //   Age 0 (new/same year): 5% depreciation → Ex-Showroom × 0.95
    //   Age 1: 15% depreciation → Ex-Showroom × 0.85
    //   Age 2: 25% → × 0.75
    //   Age 3: 35% → × 0.65
    //   Age 4: 45% → × 0.55
    //   Age 5+: 50% + 5% per extra year (capped at 90%)
    // Formula: =IF(L{r}="","",ROUND(L{r}*MAX(0.1, IF(age=0,0.95, IF(age=1,0.85, 1-0.05-age*0.10))), 0))
    const idvFormula = `IF(OR(L${r}="",H${r}=""),"",ROUND(L${r}*MAX(0.1,IF(${currentYear}-H${r}=0,0.95,IF(${currentYear}-H${r}=1,0.85,IF(${currentYear}-H${r}=2,0.75,IF(${currentYear}-H${r}=3,0.65,IF(${currentYear}-H${r}=4,0.55,MAX(0.1,1-0.05-(${currentYear}-H${r})*0.10))))))),0))`;
    ws.getCell(r, 20).value = { formula: idvFormula } as any;

    // U (col 21): NCB Discount = Basic_OD(M) * NCB%(O)
    ws.getCell(r, 21).value = { formula: `IF(M${r}="","",M${r}*O${r})` } as any;
    // V (col 22): OD Discount Amt = Basic_OD(M) * OD_Discount%(N)
    ws.getCell(r, 22).value = { formula: `IF(M${r}="","",M${r}*N${r})` } as any;
    // W (col 23): Net OD = MAX(0, Basic_OD - OD_Disc_Amt - NCB_Disc)
    ws.getCell(r, 23).value = { formula: `IF(M${r}="","",MAX(0,M${r}-V${r}-U${r}))` } as any;
    // X (col 24): Net Premium = Net_OD + TP + Secure + Addon
    ws.getCell(r, 24).value = { formula: `IF(W${r}="","",W${r}+P${r}+Q${r}+R${r})` } as any;
    // Y (col 25): GST = ROUND(Net_Premium * 0.18, 0)
    ws.getCell(r, 25).value = { formula: `IF(X${r}="","",ROUND(X${r}*0.18,0))` } as any;
    // Z (col 26): Total = Net_Premium + GST
    ws.getCell(r, 26).value = { formula: `IF(X${r}="","",X${r}+Y${r})` } as any;

    // Style formula cells (T=20 to Z=26)
    for (let c = 20; c <= 26; c++) {
      const cell = ws.getCell(r, c);
      if (c === 20) {
        // IDV gets special purple tint
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F0FF" } } as ExcelJS.FillPattern;
      } else {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FFF0" } } as ExcelJS.FillPattern;
      }
      cell.font = { bold: true, size: 10 };
      cell.numFmt = '#,##0';
      cell.border = borderThin;
      cell.alignment = { horizontal: "right" };
    }

    // Style input cells
    for (let c = 1; c <= 19; c++) {
      const cell = ws.getCell(r, c);
      cell.border = borderThin;
      cell.alignment = { horizontal: c >= 12 ? "right" : "left" };
    }
    // Number format for numeric input columns
    [12, 13, 16, 17, 18].forEach(c => { ws.getCell(r, c).numFmt = '#,##0'; });
    [14, 15].forEach(c => { ws.getCell(r, c).numFmt = '0%'; });
    ws.getCell(r, 8).numFmt = '0'; // year
  }

  // Pre-fill data
  if (prefilledLeads?.length) {
    prefilledLeads.forEach((lead, i) => {
      const r = i + 2;
      ws.getCell(r, 1).value = lead.customer_name || "";
      ws.getCell(r, 2).value = lead.phone || "";
      ws.getCell(r, 3).value = lead.email || "";
      ws.getCell(r, 4).value = lead.city || "";
      ws.getCell(r, 5).value = lead.vehicle_make || "";
      ws.getCell(r, 6).value = lead.vehicle_model || "";
      ws.getCell(r, 7).value = lead.vehicle_number || "";
      ws.getCell(r, 8).value = lead.vehicle_year || new Date().getFullYear();
      ws.getCell(r, 9).value = lead.fuel_type || "Petrol";
      ws.getCell(r, 10).value = lead.current_insurer || "";
      ws.getCell(r, 11).value = lead.current_policy_type || "Comprehensive";
      // Ex-Showroom Price
      if (lead.ex_showroom_price) ws.getCell(r, 12).value = lead.ex_showroom_price;
      // NCB% as decimal
      if (lead.ncb_percentage) ws.getCell(r, 15).value = lead.ncb_percentage / 100;
    });
  } else {
    // Sample row
    ws.getCell(2, 1).value = "Rajesh Kumar";
    ws.getCell(2, 2).value = "9876543210";
    ws.getCell(2, 3).value = "rajesh@email.com";
    ws.getCell(2, 4).value = "Delhi";
    ws.getCell(2, 5).value = "Maruti";
    ws.getCell(2, 6).value = "Swift";
    ws.getCell(2, 7).value = "DL01AB1234";
    ws.getCell(2, 8).value = 2022;
    ws.getCell(2, 9).value = "Petrol";
    ws.getCell(2, 10).value = "ICICI Lombard";
    ws.getCell(2, 11).value = "Comprehensive";
    ws.getCell(2, 12).value = 800000; // Ex-Showroom Price
    ws.getCell(2, 13).value = 12000; // Basic OD
    ws.getCell(2, 14).value = 0.15; // OD Discount %
    ws.getCell(2, 15).value = 0.25; // NCB %
    ws.getCell(2, 16).value = 3500; // Third Party
    ws.getCell(2, 17).value = 800; // Secure Premium
    ws.getCell(2, 18).value = 1200; // Addon Premium
    ws.getCell(2, 19).value = "Zero Depreciation|Roadside Assistance";
  }

  // Instructions sheet
  const instrWs = wb.addWorksheet("Instructions");
  instrWs.getColumn(1).width = 70;
  const instructions = [
    "BULK QUOTE TEMPLATE - INSTRUCTIONS",
    "",
    "1. Fill client details in columns A-S (Customer Name through Addons)",
    "2. For OD Discount % and NCB %, enter as decimal (e.g., 0.25 for 25%)",
    "3. Columns T-Z are AUTO-CALCULATED — do NOT edit them",
    "4. Addons: separate multiple addons with | (pipe character)",
    "   e.g., Zero Depreciation|Engine Protection|Roadside Assistance",
    "5. Fuel Type dropdown: Petrol, Diesel, CNG, Electric, Hybrid",
    "6. Policy Type dropdown: Comprehensive, Third Party, Own Damage, Standalone OD",
    "",
    "IDV AUTO-CALCULATOR (Column T):",
    "  Based on Ex-Showroom Price (Col L) and Vehicle Year (Col H):",
    `  Current Year: ${currentYear}`,
    "  ┌────────────────┬──────────────┬───────────────────────┐",
    "  │ Vehicle Age    │ Depreciation │ IDV Formula           │",
    "  ├────────────────┼──────────────┼───────────────────────┤",
    "  │ 0 (New/Same Yr)│ 5%           │ Ex-Showroom × 0.95   │",
    "  │ 1 Year         │ 15%          │ Ex-Showroom × 0.85   │",
    "  │ 2 Years        │ 25%          │ Ex-Showroom × 0.75   │",
    "  │ 3 Years        │ 35%          │ Ex-Showroom × 0.65   │",
    "  │ 4 Years        │ 45%          │ Ex-Showroom × 0.55   │",
    "  │ 5+ Years       │ 50%+5%/yr    │ Min 10% of Ex-Showroom│",
    "  └────────────────┴──────────────┴───────────────────────┘",
    "  First year: 5% flat depreciation (new car insurance)",
    "  Every subsequent year: 10% additional depreciation",
    "  Minimum IDV: 10% of Ex-Showroom (capped)",
    "",
    "PREMIUM FORMULAS:",
    "  NCB Discount = Basic OD × NCB%",
    "  OD Discount Amt = Basic OD × OD Discount%",
    "  Net OD = MAX(0, Basic OD - OD Discount Amt - NCB Discount)",
    "  Net Premium = Net OD + Third Party + Secure Premium + Addon Premium",
    "  GST (18%) = ROUND(Net Premium × 0.18)",
    "  Total Premium = Net Premium + GST",
    "",
    "After filling, save and upload back to CRM → Bulk Quotes → Import Excel",
  ];
  instructions.forEach((text, i) => {
    const cell = instrWs.getCell(i + 1, 1);
    cell.value = text;
    if (i === 0) cell.font = { bold: true, size: 14 };
    else if (text.startsWith("IDV AUTO") || text.startsWith("PREMIUM FORMULAS")) cell.font = { bold: true, size: 11 };
    else if (text.includes("│")) cell.font = { name: "Courier New", size: 10 };
  });

  // Download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `bulk_quote_template_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Parse uploaded Excel file back to quote objects
export async function parseQuoteExcel(file: File): Promise<Record<string, any>[]> {
  const wb = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await wb.xlsx.load(buffer);

  const ws = wb.getWorksheet("Bulk Quotes") || wb.worksheets[0];
  if (!ws) return [];

  const results: Record<string, any>[] = [];
  const headers: string[] = [];
  
  ws.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = String(cell.value || "").toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  });

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, any> = {};
    let hasData = false;

    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      let val = cell.value;
      // Handle formula results
      if (val && typeof val === "object" && "result" in val) val = (val as any).result;
      if (val !== null && val !== undefined && val !== "") hasData = true;
      obj[header] = val;
    });

    if (hasData && obj.customer_name) {
      // Map IDV from auto-calculated column if present
      if (obj.idv_auto && !obj.idv) {
        obj.idv = obj.idv_auto;
      }
      results.push(obj);
    }
  });

  return results;
}
