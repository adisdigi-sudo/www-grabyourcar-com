export interface InsuranceRetargetMessageParams {
  customerName?: string | null;
  vehicleNumber?: string | null;
  insurer?: string | null;
  premium?: number | string | null;
}

const formatPremium = (premium: number | string | null | undefined) => {
  if (premium === null || premium === undefined || premium === "") return "";
  const amount = typeof premium === "number" ? premium : Number(premium);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return `💰 *Renewal Premium Support:* starting around *₹${amount.toLocaleString("en-IN")}*\n`;
};

export const buildInsuranceRetargetMessage = ({
  customerName,
  vehicleNumber,
  insurer,
  premium,
}: InsuranceRetargetMessageParams) => {
  const name = customerName || "Sir/Madam";
  const vehicle = vehicleNumber ? ` for your vehicle *${vehicleNumber}*` : "";
  const insurerLine = insurer ? `🏢 *Previous insurer:* ${insurer}\n` : "";
  const premiumLine = formatPremium(premium);

  return `Hey ${name} 🙏\n\nWe really missed you so much. Please renew your car insurance${vehicle} with us and keep grabbing *Grabyourcar* exclusive offers proudly:\n\n🚗 *FREE 2 Car Washes* per month\n🌸 *FREE 3 Car Perfumes* per month\n🆘 *FREE 24/7 Assistance*\n📋 *Personalized Claim Settlement Assistance*\n${insurerLine}${premiumLine}✨ Fast support, trusted advice, and better renewal help from our team\n\nWe are just a click away — ask and command us anytime 💚\n\n📞 +91 98559 24442\n🔗 https://www.grabyourcar.com/insurance\n\n— *Team Grabyourcar* 🚗`;
};
