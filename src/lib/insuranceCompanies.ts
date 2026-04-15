/**
 * Complete list of general insurance companies operating in India.
 * Used across Insurance CRM — Quote Modal, Bulk Quote Generator, Pipeline, etc.
 */
export const INSURANCE_COMPANIES = [
  // Private General Insurers
  "Acko General Insurance Ltd",
  "Bajaj Allianz General Insurance Co Ltd",
  "Bharti AXA General Insurance Co Ltd",
  "Cholamandalam MS General Insurance Co Ltd",
  "Digit Insurance (Go Digit General Insurance Ltd)",
  "Edelweiss General Insurance Co Ltd",
  "Future Generali General Insurance Ltd",
  "HDFC ERGO General Insurance Co Ltd",
  "ICICI Lombard General Insurance Co Ltd",
  "Iffco Tokio General Insurance Co Ltd",
  "Kotak Mahindra General Insurance Co Ltd",
  "Liberty General Insurance Ltd",
  "Magma HDI General Insurance Co Ltd",
  "Navi General Insurance Ltd",
  "Raheja QBE General Insurance Co Ltd",
  "Reliance General Insurance Co Ltd",
  "Royal Sundaram General Insurance Co Ltd",
  "SBI General Insurance Co Ltd",
  "Shriram General Insurance Co Ltd",
  "Tata AIG General Insurance Co Ltd",
  "Universal Sompo General Insurance Co Ltd",
  "Zuno General Insurance Ltd (formerly Edelweiss)",

  // Public Sector General Insurers
  "National Insurance Co Ltd",
  "New India Assurance Co Ltd",
  "Oriental Insurance Co Ltd",
  "United India Insurance Co Ltd",

  // Standalone Health (occasionally seen in motor bundles)
  "Care Health Insurance Ltd",
  "Star Health & Allied Insurance Co Ltd",
  "Niva Bupa Health Insurance Co Ltd",
];

/** Short display names for compact UI (table cells, badges) */
export const INSURANCE_COMPANY_SHORT: Record<string, string> = {
  "Acko General Insurance Ltd": "Acko",
  "Bajaj Allianz General Insurance Co Ltd": "Bajaj Allianz",
  "Bharti AXA General Insurance Co Ltd": "Bharti AXA",
  "Cholamandalam MS General Insurance Co Ltd": "Chola MS",
  "Digit Insurance (Go Digit General Insurance Ltd)": "Digit",
  "Edelweiss General Insurance Co Ltd": "Edelweiss",
  "Future Generali General Insurance Ltd": "Future Generali",
  "HDFC ERGO General Insurance Co Ltd": "HDFC ERGO",
  "ICICI Lombard General Insurance Co Ltd": "ICICI Lombard",
  "Iffco Tokio General Insurance Co Ltd": "Iffco Tokio",
  "Kotak Mahindra General Insurance Co Ltd": "Kotak General",
  "Liberty General Insurance Ltd": "Liberty",
  "Magma HDI General Insurance Co Ltd": "Magma HDI",
  "Navi General Insurance Ltd": "Navi",
  "Raheja QBE General Insurance Co Ltd": "Raheja QBE",
  "Reliance General Insurance Co Ltd": "Reliance General",
  "Royal Sundaram General Insurance Co Ltd": "Royal Sundaram",
  "SBI General Insurance Co Ltd": "SBI General",
  "Shriram General Insurance Co Ltd": "Shriram",
  "Tata AIG General Insurance Co Ltd": "Tata AIG",
  "Universal Sompo General Insurance Co Ltd": "Universal Sompo",
  "Zuno General Insurance Ltd (formerly Edelweiss)": "Zuno",
  "National Insurance Co Ltd": "National Insurance",
  "New India Assurance Co Ltd": "New India",
  "Oriental Insurance Co Ltd": "Oriental",
  "United India Insurance Co Ltd": "United India",
  "Care Health Insurance Ltd": "Care Health",
  "Star Health & Allied Insurance Co Ltd": "Star Health",
  "Niva Bupa Health Insurance Co Ltd": "Niva Bupa",
};

/** Get short display name for a company (works for custom names too) */
export const getShortName = (fullName: string): string =>
  INSURANCE_COMPANY_SHORT[fullName] || fullName;
