export const CHANNELS = [
  { value: "whatsapp_meta", label: "WhatsApp Meta API", icon: "💬", costPerUnit: 0.5, unitName: "message", convRate: 1.5 },
  { value: "google_ads", label: "Google Ads", icon: "🔍", costPerUnit: 25, unitName: "click", convRate: 25 },
  { value: "meta_ads", label: "Meta / FB Ads", icon: "📘", costPerUnit: 15, unitName: "click", convRate: 18 },
  { value: "data_purchase", label: "Data Purchase", icon: "📋", costPerUnit: 2, unitName: "lead", convRate: 100 },
  { value: "sms", label: "SMS", icon: "📱", costPerUnit: 0.15, unitName: "sms", convRate: 0.5 },
  { value: "email", label: "Email", icon: "✉️", costPerUnit: 0.05, unitName: "email", convRate: 0.8 },
  { value: "influencer", label: "Influencer", icon: "⭐", costPerUnit: 5000, unitName: "post", convRate: 100 },
  { value: "other", label: "Other", icon: "🎯", costPerUnit: 100, unitName: "unit", convRate: 10 },
];

export const VERTICALS = [
  { value: "car_sales", label: "Car Sales", avgDealValue: 800000, closeRate: 8 },
  { value: "insurance", label: "Insurance", avgDealValue: 8000, closeRate: 12 },
  { value: "loans", label: "Car Loans", avgDealValue: 600000, closeRate: 6 },
  { value: "hsrp", label: "HSRP", avgDealValue: 1200, closeRate: 25 },
  { value: "rental", label: "Self Drive Rental", avgDealValue: 5000, closeRate: 15 },
  { value: "accessories", label: "Accessories", avgDealValue: 3500, closeRate: 20 },
];

export const fmt = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;

export const calcExpectedOutcome = (channel: string, amount: number, vertical?: string) => {
  const ch = CHANNELS.find(c => c.value === channel);
  const v = VERTICALS.find(x => x.value === vertical);
  if (!ch) return { volume: 0, leads: 0, closures: 0, revenue: 0 };
  const volume = Math.round(amount / ch.costPerUnit);
  const leads = Math.round((volume * ch.convRate) / 100);
  const closeRate = v?.closeRate || 10;
  const closures = Math.round((leads * closeRate) / 100);
  const revenue = Math.round(closures * (v?.avgDealValue || 5000));
  return { volume, leads, closures, revenue };
};
