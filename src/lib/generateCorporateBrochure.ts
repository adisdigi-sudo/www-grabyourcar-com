import jsPDF from "jspdf";

export const generateCorporateBrochure = () => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16;
  const CW = W - M * 2;

  // Premium brand palette
  const green: [number, number, number] = [34, 197, 94];
  const greenDark: [number, number, number] = [22, 163, 74];
  const greenLight: [number, number, number] = [220, 252, 231];
  const dark: [number, number, number] = [15, 23, 42];
  const darkMid: [number, number, number] = [30, 41, 59];
  const slate: [number, number, number] = [100, 116, 139];
  const lightBg: [number, number, number] = [248, 250, 252];
  const white: [number, number, number] = [255, 255, 255];
  const gold: [number, number, number] = [234, 179, 8];
  const red: [number, number, number] = [239, 68, 68];
  const amber: [number, number, number] = [245, 158, 11];

  const TOTAL_PAGES = 9;

  const WHATSAPP_URL = "https://wa.me/919855924442?text=Hi%20GrabYourCar!%20%F0%9F%8F%A2%0A%0AI%27m%20interested%20in%20*corporate%2Ffleet%20buying*.%0A%0APlease%20share%20a%20free%20quote%20and%20details.%0A%0AThanks!";

  // ── Helpers ──────────────────────────────────────────────

  const drawLogo = (x: number, y: number, size: "small" | "medium" = "small") => {
    const s = size === "medium" ? 1.4 : 1;
    // Green circle with car icon
    doc.setFillColor(...green);
    doc.circle(x + 5 * s, y + 5 * s, 5 * s, "F");
    doc.setTextColor(...white);
    doc.setFontSize(6 * s);
    doc.setFont("helvetica", "bold");
    doc.text("G", x + 5 * s, y + 7 * s, { align: "center" });
    // Brand text
    doc.setTextColor(...dark);
    doc.setFontSize(9 * s);
    doc.setFont("helvetica", "bold");
    doc.text("GRABYOURCAR", x + 12 * s, y + 7.5 * s);
  };

  const drawLogoDark = (x: number, y: number) => {
    doc.setFillColor(...green);
    doc.circle(x + 5, y + 5, 5, "F");
    doc.setTextColor(...white);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text("G", x + 5, y + 7, { align: "center" });
    doc.setTextColor(...white);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("GRABYOURCAR", x + 12, y + 7.5);
  };

  const pageFooter = (page: number) => {
    doc.setFillColor(...dark);
    doc.rect(0, H - 14, W, 14, "F");
    doc.setTextColor(180, 190, 200);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Adis Makethemoney Services Pvt Ltd  |  www.grabyourcar.com  |  +91 98559 24442",
      W / 2,
      H - 6,
      { align: "center" }
    );
    doc.setTextColor(120, 130, 140);
    doc.setFontSize(6);
    doc.text(`Page ${page} of ${TOTAL_PAGES}`, W - M, H - 6, { align: "right" });
  };

  const pageHeader = () => {
    // Top green bar
    doc.setFillColor(...green);
    doc.rect(0, 0, W, 4, "F");
    // Logo on each page
    drawLogo(M, 8);
    // Thin separator
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(M, 22, W - M, 22);
  };

  const sectionTitle = (text: string, y: number, subtitle?: string) => {
    doc.setFillColor(...green);
    doc.roundedRect(M, y, 5, 12, 1, 1, "F");
    doc.setTextColor(...dark);
    doc.setFontSize(17);
    doc.setFont("helvetica", "bold");
    doc.text(text, M + 9, y + 9);
    if (subtitle) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...slate);
      doc.text(subtitle, M + 9, y + 15);
      return y + 22;
    }
    return y + 18;
  };

  const divider = (y: number) => {
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.2);
    doc.line(M, y, W - M, y);
  };

  // ════════════════════════════════════════════════════════════
  // PAGE 1 — PREMIUM COVER
  // ════════════════════════════════════════════════════════════
  doc.setFillColor(...dark);
  doc.rect(0, 0, W, H, "F");

  // Top green gradient bar
  doc.setFillColor(...green);
  doc.rect(0, 0, W, 7, "F");
  doc.setFillColor(...greenDark);
  doc.rect(0, 5, W, 3, "F");

  // Side accent
  doc.setFillColor(...green);
  doc.rect(0, 40, 5, 180, "F");

  // Logo on cover (white version)
  doc.setFillColor(...green);
  doc.circle(W / 2 - 30, 42, 7, "F");
  doc.setTextColor(...white);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("G", W / 2 - 30, 44.5, { align: "center" });

  // Brand name
  doc.setTextColor(...white);
  doc.setFontSize(40);
  doc.setFont("helvetica", "bold");
  doc.text("GRABYOURCAR", W / 2, 58, { align: "center" });

  // Accent line
  doc.setFillColor(...green);
  doc.roundedRect(W / 2 - 40, 65, 80, 3, 1.5, 1.5, "F");

  // Tagline
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 200, 210);
  doc.text("Your Trusted Automotive Partner", W / 2, 78, { align: "center" });

  // Main title
  doc.setTextColor(...white);
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text("Corporate Fleet", W / 2, 112, { align: "center" });
  doc.text("Solutions", W / 2, 126, { align: "center" });

  // Year badge
  doc.setFillColor(...green);
  doc.roundedRect(W / 2 - 42, 136, 84, 13, 6, 6, "F");
  doc.setTextColor(...white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("ENTERPRISE EDITION 2025-26", W / 2, 144.5, { align: "center" });

  // Feature grid
  const coverFeatures = [
    "Volume Discounts up to 15%",
    "Dedicated Account Manager",
    "Priority Vehicle Allocation",
    "Pan-India Dealer Network",
    "Flexible Corporate Financing",
    "End-to-End Documentation",
  ];

  doc.setFontSize(10.5);
  doc.setFont("helvetica", "normal");
  coverFeatures.forEach((f, i) => {
    const col = i < 3 ? 0 : 1;
    const row = i % 3;
    const x = M + 22 + col * (CW / 2);
    const fy = 172 + row * 16;
    doc.setFillColor(...green);
    doc.circle(x - 4, fy - 2, 2.5, "F");
    doc.setTextColor(...white);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("OK", x - 4, fy - 0.5, { align: "center" });
    doc.setTextColor(200, 215, 225);
    doc.setFontSize(10.5);
    doc.setFont("helvetica", "normal");
    doc.text(f, x + 3, fy);
  });

  // Trusted by badge
  doc.setFillColor(...darkMid);
  doc.roundedRect(M + 15, 225, CW - 30, 16, 3, 3, "F");
  doc.setTextColor(...gold);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Trusted by 50+ Corporate Organisations Across India", W / 2, 235, { align: "center" });

  // Bottom contact strip
  doc.setFillColor(...green);
  doc.rect(0, H - 38, W, 24, "F");
  doc.setTextColor(...white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Call: +91 98559 24442", M + 10, H - 24);
  doc.text("Email: corporate@grabyourcar.com", W / 2, H - 24, { align: "center" });
  doc.text("Web: grabyourcar.com", W - M - 10, H - 24, { align: "right" });

  pageFooter(1);

  // ════════════════════════════════════════════════════════════
  // PAGE 2 — FOUNDER'S STORY & ABOUT
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageHeader();

  let y = sectionTitle("Founder's Story", 26, "The Vision Behind Grabyourcar");

  // Founder story card
  doc.setFillColor(...lightBg);
  doc.roundedRect(M, y, CW, 62, 4, 4, "F");
  doc.setFillColor(...green);
  doc.roundedRect(M, y, 4, 62, 2, 2, "F");

  // Quote mark
  doc.setTextColor(...green);
  doc.setFontSize(36);
  doc.setFont("helvetica", "bold");
  doc.text('"', M + 10, y + 15);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...darkMid);
  const founderQuote = "I started Grabyourcar with a simple belief — buying a car for your business should be as easy as buying one for yourself. Too many companies were wasting weeks negotiating with multiple dealers, dealing with inconsistent pricing, and managing mountains of paperwork. We built Grabyourcar to be the single, trusted partner that handles everything — from the first enquiry to the last document — so business leaders can focus on what they do best.";
  const fql = doc.splitTextToSize(founderQuote, CW - 22);
  doc.text(fql, M + 10, y + 22);

  // Founder name
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...dark);
  doc.text("Aditya Dhanuka", M + 10, y + 50);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...green);
  doc.text("Founder & CEO, Grabyourcar", M + 10, y + 56);

  y += 70;

  // Mission & Vision side by side
  const mvW = (CW - 6) / 2;

  // Mission
  doc.setFillColor(...dark);
  doc.roundedRect(M, y, mvW, 40, 3, 3, "F");
  doc.setFillColor(...green);
  doc.roundedRect(M, y, mvW, 10, 3, 3, "F");
  doc.rect(M, y + 7, mvW, 3, "F");
  doc.setTextColor(...white);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("OUR MISSION", M + mvW / 2, y + 7, { align: "center" });
  doc.setTextColor(200, 215, 225);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  const missionText = "To simplify corporate vehicle procurement across India by providing transparent pricing, dedicated support, and a seamless buying experience that saves organisations time and money.";
  const ml = doc.splitTextToSize(missionText, mvW - 10);
  doc.text(ml, M + 5, y + 17);

  // Vision
  const vx = M + mvW + 6;
  doc.setFillColor(...dark);
  doc.roundedRect(vx, y, mvW, 40, 3, 3, "F");
  doc.setFillColor(...greenDark);
  doc.roundedRect(vx, y, mvW, 10, 3, 3, "F");
  doc.rect(vx, y + 7, mvW, 3, "F");
  doc.setTextColor(...white);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("OUR VISION", vx + mvW / 2, y + 7, { align: "center" });
  doc.setTextColor(200, 215, 225);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  const visionText = "To become India's most trusted corporate automotive partner, serving 500+ organisations with best-in-class fleet solutions, technology-driven procurement, and unmatched customer satisfaction.";
  const vl = doc.splitTextToSize(visionText, mvW - 10);
  doc.text(vl, vx + 5, y + 17);

  y += 48;

  // Trust stats
  y = sectionTitle("Trust in Numbers", y);

  const stats = [
    { number: "50+", label: "Corporate Clients" },
    { number: "1,000+", label: "Vehicles Delivered" },
    { number: "100+", label: "Cities Covered" },
    { number: "15%", label: "Maximum Discount" },
  ];

  const statW = (CW - 12) / 4;
  stats.forEach((s, i) => {
    const x = M + i * (statW + 4);
    doc.setFillColor(...dark);
    doc.roundedRect(x, y, statW, 28, 3, 3, "F");
    doc.setTextColor(...green);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(s.number, x + statW / 2, y + 13, { align: "center" });
    doc.setTextColor(200, 210, 220);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(s.label, x + statW / 2, y + 21, { align: "center" });
  });

  y += 36;

  // Trusted organisations
  doc.setFillColor(...greenLight);
  doc.roundedRect(M, y, CW, 22, 3, 3, "F");
  doc.setFillColor(...green);
  doc.roundedRect(M, y, CW, 7, 3, 3, "F");
  doc.rect(M, y + 4, CW, 3, "F");
  doc.setTextColor(...white);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("TRUSTED BY LEADING ORGANISATIONS", W / 2, y + 5, { align: "center" });
  const clients = ["Gaur Group", "Orange Group", "Dewan Public School", "Virmani Hospital", "Flight n Fares", "Banshidhar Group", "& 50+ More"];
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...dark);
  doc.text(clients.join("   |   "), W / 2, y + 15, { align: "center", maxWidth: CW - 8 });

  pageFooter(2);

  // ════════════════════════════════════════════════════════════
  // PAGE 3 — WHY CHOOSE US
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageHeader();

  y = sectionTitle("Why Corporates Choose Grabyourcar", 26);

  const benefits = [
    { title: "Priority Vehicle Allocation", desc: "Skip the queue with dedicated inventory access for corporate orders. First preference on new launches and limited editions." },
    { title: "Competitive Corporate Pricing", desc: "Exclusive bulk discounts up to 15% on fleet purchases. Special rates unavailable to retail customers." },
    { title: "Dedicated Account Manager", desc: "Personal relationship manager for seamless coordination. A single point of contact for all your requirements." },
    { title: "Fast Delivery Timelines", desc: "Expedited processing and delivery. Reduce your procurement cycle by 30-45 days versus traditional channels." },
    { title: "Pan-India Network", desc: "Seamless delivery and service support across 100+ cities. Multi-location fleet deployments handled end to end." },
    { title: "Complete Documentation", desc: "End-to-end paperwork — registration, compliance, GST invoicing, insurance coordination, and corporate billing." },
  ];

  const bColW = CW / 2 - 3;
  benefits.forEach((b, i) => {
    const bx = i % 2 === 0 ? M : M + CW / 2 + 3;
    const by = y + Math.floor(i / 2) * 28;
    doc.setFillColor(i % 2 === 0 ? 240 : 245, 253, i % 2 === 0 ? 244 : 250);
    doc.roundedRect(bx, by, bColW, 24, 2, 2, "F");
    doc.setFillColor(...green);
    doc.circle(bx + 8, by + 8, 4, "F");
    doc.setTextColor(...white);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`${i + 1}`, bx + 8, by + 10, { align: "center" });
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(b.title, bx + 15, by + 9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate);
    doc.setFontSize(6.5);
    const dl = doc.splitTextToSize(b.desc, bColW - 17);
    doc.text(dl, bx + 15, by + 15);
  });

  y += Math.ceil(benefits.length / 2) * 28 + 8;

  divider(y);
  y += 8;

  // Industries section on same page
  y = sectionTitle("Industries We Serve", y, "Tailored solutions for every sector");

  const industries = [
    { name: "Real Estate & Construction", desc: "Fleet vehicles for site teams, executives, and client tours." },
    { name: "Healthcare & Pharmaceuticals", desc: "Reliable transportation for medical staff and administration." },
    { name: "Education & Institutions", desc: "School and college fleet management, staff transportation." },
    { name: "IT & Technology", desc: "Employee transportation, executive cars, and campus shuttles." },
    { name: "Hospitality & Tourism", desc: "Guest transfers, tour fleet, and luxury vehicle procurement." },
    { name: "Manufacturing & Logistics", desc: "Utility vehicles, goods transport, and employee commute fleet." },
    { name: "Travel & Aviation", desc: "Airport transfers, executive travel fleet, and tour operators." },
    { name: "Government & Public Sector", desc: "Official vehicles, protocol cars, and government fleet procurement." },
  ];

  const indW = (CW - 6) / 2;
  industries.forEach((ind, i) => {
    const ix = i % 2 === 0 ? M : M + indW + 6;
    const iy = y + Math.floor(i / 2) * 18;
    doc.setFillColor(...lightBg);
    doc.roundedRect(ix, iy, indW, 15, 2, 2, "F");
    doc.setFillColor(...green);
    doc.roundedRect(ix, iy, 3, 15, 1, 1, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(ind.name, ix + 7, iy + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate);
    doc.setFontSize(6.5);
    doc.text(ind.desc, ix + 7, iy + 11, { maxWidth: indW - 12 });
  });

  pageFooter(3);

  // ════════════════════════════════════════════════════════════
  // PAGE 4 — PROCESS & PACKAGES
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageHeader();

  y = sectionTitle("Your Procurement Journey", 26, "From enquiry to delivery in as little as 2 weeks");

  const steps = [
    { num: "01", title: "Consultation", desc: "Understand fleet needs, budget, and timeline." },
    { num: "02", title: "Custom Proposal", desc: "Tailored pricing, models, and financing options." },
    { num: "03", title: "Order Processing", desc: "Priority allocation, paperwork, and coordination." },
    { num: "04", title: "Fleet Delivery", desc: "Multi-location delivery with ongoing support." },
  ];

  const stepW = (CW - 9) / 4;
  steps.forEach((s, i) => {
    const sx = M + i * (stepW + 3);
    doc.setFillColor(...dark);
    doc.roundedRect(sx, y, stepW, 42, 3, 3, "F");
    doc.setFillColor(...green);
    doc.circle(sx + stepW / 2, y + 11, 8, "F");
    doc.setTextColor(...white);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(s.num, sx + stepW / 2, y + 14, { align: "center" });
    if (i < steps.length - 1) {
      doc.setFillColor(...green);
      doc.triangle(sx + stepW + 1, y + 9, sx + stepW + 1, y + 13, sx + stepW + 3.5, y + 11, "F");
    }
    doc.setTextColor(...white);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text(s.title, sx + stepW / 2, y + 26, { align: "center" });
    doc.setTextColor(180, 195, 210);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    const pl = doc.splitTextToSize(s.desc, stepW - 6);
    doc.text(pl, sx + stepW / 2, y + 33, { align: "center", maxWidth: stepW - 6 });
  });

  y += 52;
  divider(y);
  y += 8;

  // Fleet Packages
  y = sectionTitle("Fleet Packages & Pricing", y, "Flexible plans for every organisation size");

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...slate);
  doc.text("*Prices are indicative. Contact us for a customised quote.", M, y);
  y += 8;

  const packages = [
    {
      name: "STARTER FLEET",
      range: "5 - 10 Vehicles",
      discount: "Up to 5% Off",
      headerColor: dark,
      features: ["Dedicated coordinator", "Standard delivery timeline", "Basic documentation support", "Single-brand ordering"],
    },
    {
      name: "GROWTH FLEET",
      range: "11 - 25 Vehicles",
      discount: "Up to 10% Off",
      headerColor: greenDark,
      features: ["Dedicated account manager", "Priority delivery", "Complete documentation", "Insurance coordination", "Multi-brand ordering"],
      popular: true,
    },
    {
      name: "ENTERPRISE FLEET",
      range: "25+ Vehicles",
      discount: "Up to 15% Off",
      headerColor: dark,
      features: ["Senior relationship manager", "Fastest delivery guarantee", "End-to-end support", "Custom financing solutions", "Fleet insurance package", "Pan-India coordination"],
    },
  ];

  const pkgW = (CW - 10) / 3;
  const pkgH = 95;
  packages.forEach((pkg, i) => {
    const px = M + i * (pkgW + 5);
    doc.setFillColor(...lightBg);
    doc.roundedRect(px, y, pkgW, pkgH, 3, 3, "F");
    if (pkg.popular) {
      doc.setDrawColor(...green);
      doc.setLineWidth(0.8);
      doc.roundedRect(px, y, pkgW, pkgH, 3, 3, "S");
      doc.setFillColor(...green);
      doc.roundedRect(px + pkgW / 2 - 16, y - 4, 32, 8, 4, 4, "F");
      doc.setTextColor(...white);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "bold");
      doc.text("MOST POPULAR", px + pkgW / 2, y, { align: "center" });
    }
    doc.setFillColor(...pkg.headerColor);
    doc.roundedRect(px + 1, y + 1, pkgW - 2, 22, 2, 2, "F");
    doc.setTextColor(...white);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(pkg.name, px + pkgW / 2, y + 10, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(pkg.range, px + pkgW / 2, y + 18, { align: "center" });
    doc.setTextColor(...green);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text(pkg.discount, px + pkgW / 2, y + 34, { align: "center" });
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(px + 5, y + 38, px + pkgW - 5, y + 38);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    pkg.features.forEach((f, fi) => {
      doc.setTextColor(...green);
      doc.setFont("helvetica", "bold");
      doc.text("OK", px + 5, y + 46 + fi * 8);
      doc.setTextColor(...dark);
      doc.setFont("helvetica", "normal");
      doc.text(f, px + 12, y + 46 + fi * 8);
    });
  });

  pageFooter(4);

  // ════════════════════════════════════════════════════════════
  // PAGE 5 — FULL COMPARISON TABLE (from website)
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageHeader();

  y = sectionTitle("Corporate Solutions Comparison", 26, "Grabyourcar vs Traditional Dealership Procurement");

  const fullComparison = [
    { feature: "Volume Discounts (Up to 15%)", gyc: "YES", gycNote: "", trad: "Limited", tradNote: "3-5% only" },
    { feature: "Dedicated Account Manager", gyc: "YES", gycNote: "", trad: "NO", tradNote: "" },
    { feature: "Priority Vehicle Allocation", gyc: "YES", gycNote: "", trad: "NO", tradNote: "" },
    { feature: "Multi-Brand Procurement", gyc: "YES", gycNote: "All major brands", trad: "NO", tradNote: "Single brand only" },
    { feature: "Pan-India Delivery Coordination", gyc: "YES", gycNote: "", trad: "Limited", tradNote: "Limited coverage" },
    { feature: "Single Point of Contact", gyc: "YES", gycNote: "", trad: "NO", tradNote: "Multiple dealers" },
    { feature: "Complete Documentation Support", gyc: "YES", gycNote: "", trad: "Limited", tradNote: "" },
    { feature: "Corporate Finance Assistance", gyc: "YES", gycNote: "Multiple options", trad: "Limited", tradNote: "Limited options" },
    { feature: "Fleet Insurance Coordination", gyc: "YES", gycNote: "", trad: "NO", tradNote: "" },
    { feature: "Post-Purchase Fleet Support", gyc: "YES", gycNote: "", trad: "NO", tradNote: "" },
    { feature: "Transparent Pricing Comparison", gyc: "YES", gycNote: "", trad: "NO", tradNote: "" },
    { feature: "Faster Procurement Cycle", gyc: "YES", gycNote: "30-45 days saved", trad: "NO", tradNote: "" },
  ];

  // Table header
  const col1W = 72;
  const col2W = (CW - col1W) / 2;
  doc.setFillColor(...dark);
  doc.roundedRect(M, y, CW, 12, 2, 2, "F");
  doc.rect(M, y + 7, CW, 5, "F");
  doc.setTextColor(...white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Feature", M + 5, y + 8);
  doc.setTextColor(...green);
  doc.text("Grabyourcar", M + col1W + col2W / 2, y + 6, { align: "center" });
  doc.setTextColor(200, 210, 220);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("Corporate Solutions", M + col1W + col2W / 2, y + 11, { align: "center" });
  doc.setTextColor(...white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Traditional", M + col1W + col2W + col2W / 2, y + 6, { align: "center" });
  doc.setTextColor(200, 210, 220);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("Dealership", M + col1W + col2W + col2W / 2, y + 11, { align: "center" });
  y += 12;

  // Table rows
  fullComparison.forEach((row, i) => {
    const rowH = 13;
    const rowY = y + i * rowH;
    if (i % 2 === 0) {
      doc.setFillColor(...lightBg);
      doc.rect(M, rowY, CW, rowH, "F");
    }
    // Vertical separators
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.2);
    doc.line(M + col1W, rowY, M + col1W, rowY + rowH);
    doc.line(M + col1W + col2W, rowY, M + col1W + col2W, rowY + rowH);

    // Feature name
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...dark);
    doc.text(row.feature, M + 5, rowY + 5.5);

    // Grabyourcar column
    const gycX = M + col1W + col2W / 2;
    if (row.gyc === "YES") {
      doc.setFillColor(...green);
      doc.circle(gycX, rowY + 5, 2.5, "F");
      doc.setTextColor(...white);
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.text("OK", gycX, rowY + 6.5, { align: "center" });
    }
    if (row.gycNote) {
      doc.setTextColor(...green);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      doc.text(row.gycNote, gycX, rowY + 10.5, { align: "center" });
    }

    // Traditional column
    const tradX = M + col1W + col2W + col2W / 2;
    if (row.trad === "NO") {
      doc.setFillColor(...red);
      doc.circle(tradX, rowY + 5, 2.5, "F");
      doc.setTextColor(...white);
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.text("X", tradX, rowY + 6.5, { align: "center" });
    } else if (row.trad === "Limited") {
      doc.setFillColor(...amber);
      doc.circle(tradX, rowY + 5, 2.5, "F");
      doc.setTextColor(...white);
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.text("-", tradX, rowY + 6.5, { align: "center" });
    }
    if (row.tradNote) {
      doc.setTextColor(...slate);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      doc.text(row.tradNote, tradX, rowY + 10.5, { align: "center" });
    }
  });

  y += fullComparison.length * 13 + 6;

  // Legend
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");

  doc.setFillColor(...green);
  doc.circle(M + 5, y, 2, "F");
  doc.setTextColor(...slate);
  doc.text("Full Support", M + 10, y + 1);

  doc.setFillColor(...amber);
  doc.circle(M + 40, y, 2, "F");
  doc.text("Limited", M + 45, y + 1);

  doc.setFillColor(...red);
  doc.circle(M + 68, y, 2, "F");
  doc.text("Not Available", M + 73, y + 1);

  pageFooter(5);

  // ════════════════════════════════════════════════════════════
  // PAGE 6 — POPULAR FLEET MODELS
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageHeader();

  y = sectionTitle("Popular Corporate Fleet Models", 26, "Best-selling vehicles across all segments");

  const segments = [
    { segment: "Hatchback", models: ["Maruti Swift", "Hyundai i20", "Tata Altroz", "Maruti Baleno"], range: "Rs 6 - 10 Lakh" },
    { segment: "Sedan", models: ["Maruti Ciaz", "Honda City", "Hyundai Verna", "Skoda Slavia"], range: "Rs 10 - 18 Lakh" },
    { segment: "Compact SUV", models: ["Maruti Brezza", "Hyundai Venue", "Tata Nexon", "Kia Sonet"], range: "Rs 8 - 15 Lakh" },
    { segment: "Mid-Size SUV", models: ["Hyundai Creta", "Kia Seltos", "MG Hector", "VW Taigun"], range: "Rs 12 - 22 Lakh" },
    { segment: "Premium SUV", models: ["Toyota Fortuner", "MG Gloster", "Mahindra XUV700", "Jeep Meridian"], range: "Rs 18 - 50 Lakh" },
    { segment: "MUV / MPV", models: ["Maruti Ertiga", "Toyota Innova", "Kia Carens", "Maruti XL6"], range: "Rs 10 - 25 Lakh" },
    { segment: "Electric Vehicles", models: ["Tata Nexon EV", "MG ZS EV", "Hyundai Ioniq 5", "BYD Atto 3"], range: "Rs 15 - 45 Lakh" },
    { segment: "Luxury", models: ["Mercedes C-Class", "BMW 3 Series", "Audi A4", "Volvo XC40"], range: "Rs 45 - 80 Lakh" },
  ];

  doc.setFillColor(...dark);
  doc.roundedRect(M, y, CW, 10, 2, 2, "F");
  doc.rect(M, y + 5, CW, 5, "F");
  doc.setTextColor(...white);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("Segment", M + 5, y + 7);
  doc.text("Popular Models", M + 42, y + 7);
  doc.text("Price Range (Ex-Showroom)*", W - M - 5, y + 7, { align: "right" });
  y += 10;

  segments.forEach((seg, i) => {
    const rowH = 12;
    const rowY = y + i * rowH;
    if (i % 2 === 0) {
      doc.setFillColor(...lightBg);
      doc.rect(M, rowY, CW, rowH, "F");
    }
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(seg.segment, M + 5, rowY + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate);
    doc.setFontSize(7);
    doc.text(seg.models.join(", "), M + 42, rowY + 5);
    doc.setTextColor(...green);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text(seg.range, W - M - 5, rowY + 5, { align: "right" });
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 170, 180);
    doc.text(`${seg.models.length}+ options available`, M + 42, rowY + 9.5);
  });

  y += segments.length * 12 + 6;
  doc.setFontSize(6.5);
  doc.setTextColor(...slate);
  doc.setFont("helvetica", "italic");
  doc.text("*Ex-showroom prices. On-road prices vary by city. GST additional as applicable.", M, y);
  y += 10;

  // EV highlight
  doc.setFillColor(...greenDark);
  doc.roundedRect(M, y, CW, 28, 4, 4, "F");
  doc.setFillColor(...green);
  doc.roundedRect(M + 3, y + 3, CW - 6, 22, 3, 3, "F");
  doc.setTextColor(...white);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Go Green with a Corporate EV Fleet", W / 2, y + 12, { align: "center" });
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("Tax benefits under Section 80EEB  |  Lower total cost of ownership  |  ESG compliance", W / 2, y + 20, { align: "center" });

  pageFooter(6);

  // ════════════════════════════════════════════════════════════
  // PAGE 7 — SUCCESS STORIES & TESTIMONIALS
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageHeader();

  y = sectionTitle("Success Stories", 26, "Real results for real organisations");

  const cases = [
    {
      company: "Gaur Group - Real Estate",
      fleet: "25 SUVs for site management",
      result: "Delivered in 30 days with 12% discount",
      quote: "Grabyourcar transformed our fleet procurement. What used to take months was completed in weeks with significant cost savings.",
    },
    {
      company: "Dewan Public School - Education",
      fleet: "15 vehicles for staff transportation",
      result: "Complete documentation handled, 8% savings",
      quote: "The dedicated account manager made the entire process hassle-free for our institution. Highly recommended for schools and colleges.",
    },
    {
      company: "Virmani Hospital - Healthcare",
      fleet: "10 sedans + 5 SUVs for medical staff",
      result: "Priority allocation during supply shortage",
      quote: "Even during supply constraints, Grabyourcar ensured our medical team had reliable transportation without delays.",
    },
  ];

  cases.forEach((cs) => {
    doc.setFillColor(...lightBg);
    doc.roundedRect(M, y, CW, 34, 3, 3, "F");
    doc.setFillColor(...green);
    doc.roundedRect(M, y, 4, 34, 2, 2, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(cs.company, M + 9, y + 8);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate);
    doc.text(`Fleet: ${cs.fleet}`, M + 9, y + 14);
    doc.setTextColor(...green);
    doc.setFont("helvetica", "bold");
    doc.text(`Result: ${cs.result}`, M + 9, y + 20);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...slate);
    doc.setFontSize(7);
    const ql = doc.splitTextToSize(`"${cs.quote}"`, CW - 16);
    doc.text(ql, M + 9, y + 26);
    y += 40;
  });

  y += 2;

  // Testimonials
  y = sectionTitle("Client Testimonials", y);

  const testimonials = [
    { name: "Rajesh Gaur", role: "Director, Gaur Group", text: "Best corporate car buying experience. Their team is professional, responsive, and delivers on every promise." },
    { name: "Dr. Virmani", role: "CEO, Virmani Hospital", text: "We have been procuring through Grabyourcar for 3 years now. Consistently excellent service and pricing." },
    { name: "Ankit Sharma", role: "COO, Flight n Fares", text: "The volume discounts and priority delivery have saved us significant time and money on our travel fleet." },
  ];

  const testW = (CW - 8) / 3;
  testimonials.forEach((t, i) => {
    const tx = M + i * (testW + 4);
    doc.setFillColor(...dark);
    doc.roundedRect(tx, y, testW, 44, 3, 3, "F");
    doc.setTextColor(...gold);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("* * * * *", tx + testW / 2, y + 9, { align: "center" });
    doc.setTextColor(200, 215, 225);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "italic");
    const tLines = doc.splitTextToSize(`"${t.text}"`, testW - 8);
    doc.text(tLines, tx + 4, y + 16);
    doc.setDrawColor(60, 70, 85);
    doc.setLineWidth(0.2);
    doc.line(tx + 5, y + 33, tx + testW - 5, y + 33);
    doc.setTextColor(...green);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(t.name, tx + testW / 2, y + 37, { align: "center" });
    doc.setTextColor(160, 170, 180);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(t.role, tx + testW / 2, y + 41, { align: "center" });
  });

  pageFooter(7);

  // ════════════════════════════════════════════════════════════
  // PAGE 8 — FAQs
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageHeader();

  y = sectionTitle("Frequently Asked Questions", 26);

  const faqs = [
    { q: "What is the minimum order for corporate pricing?", a: "We offer corporate pricing starting from 5 vehicles. Higher volumes unlock deeper discounts of up to 15%." },
    { q: "Do you support multi-brand orders?", a: "Yes. Unlike dealerships, we facilitate procurement across all major brands - Maruti, Hyundai, Tata, Toyota, Honda, Kia, MG, and more." },
    { q: "How fast can you deliver?", a: "Our priority allocation reduces delivery timelines by 30-45 days compared to traditional channels. Enterprise orders receive the fastest delivery guarantee." },
    { q: "What documentation do you handle?", a: "We manage everything - registration, insurance coordination, GST invoicing, corporate billing, and compliance documentation." },
    { q: "Do you offer financing options?", a: "Yes, we partner with leading banks and NBFCs to offer competitive corporate fleet financing with flexible EMI options." },
    { q: "Can you deliver across India?", a: "Absolutely. We coordinate seamless delivery across 100+ cities through our pan-India dealer network." },
    { q: "Do you handle EV fleet procurement?", a: "Yes, we specialise in electric vehicle fleet procurement with guidance on subsidies, charging infrastructure, and total cost of ownership analysis." },
    { q: "Is there a dedicated support team post-delivery?", a: "Yes. Every corporate client gets continued support for service scheduling, warranty claims, insurance renewals, and fleet management." },
  ];

  faqs.forEach((faq, i) => {
    const faqBg: [number, number, number] = i % 2 === 0 ? lightBg : white;
    doc.setFillColor(...faqBg);
    doc.roundedRect(M, y, CW, 17, 2, 2, "F");
    doc.setFillColor(...green);
    doc.roundedRect(M + 3, y + 2, 8, 5, 1, 1, "F");
    doc.setTextColor(...white);
    doc.setFontSize(5);
    doc.setFont("helvetica", "bold");
    doc.text("Q", M + 7, y + 5.5, { align: "center" });
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(faq.q, M + 14, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate);
    doc.setFontSize(6.5);
    const al = doc.splitTextToSize(faq.a, CW - 18);
    doc.text(al, M + 14, y + 12);
    y += 19;
  });

  pageFooter(8);

  // ════════════════════════════════════════════════════════════
  // PAGE 9 — CONTACT CTA (with active WhatsApp link)
  // ════════════════════════════════════════════════════════════
  doc.addPage();

  // Full dark background
  doc.setFillColor(...dark);
  doc.rect(0, 0, W, H, "F");

  // Top green bar
  doc.setFillColor(...green);
  doc.rect(0, 0, W, 7, "F");
  doc.setFillColor(...greenDark);
  doc.rect(0, 5, W, 3, "F");

  // Logo (white version for dark bg)
  doc.setFillColor(...green);
  doc.circle(W / 2 - 22, 30, 7, "F");
  doc.setTextColor(...white);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("G", W / 2 - 22, 32.5, { align: "center" });
  doc.setTextColor(...white);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("GRABYOURCAR", W / 2 + 5, 34, { align: "center" });

  // Decorative line
  doc.setFillColor(...green);
  doc.roundedRect(W / 2 - 30, 42, 60, 2, 1, 1, "F");

  // Main CTA text
  doc.setTextColor(...white);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("Ready to Transform", W / 2, 70, { align: "center" });
  doc.text("Your Fleet Procurement?", W / 2, 82, { align: "center" });

  doc.setTextColor(180, 200, 210);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Get a personalised quote for your organisation today.", W / 2, 96, { align: "center" });
  doc.text("Our corporate team responds within 2 hours.", W / 2, 104, { align: "center" });

  // ── GET FREE QUOTE BUTTON (Active WhatsApp Link) ──
  const btnW = 100;
  const btnH = 16;
  const btnX = W / 2 - btnW / 2;
  const btnY = 118;
  doc.setFillColor(...green);
  doc.roundedRect(btnX, btnY, btnW, btnH, 8, 8, "F");
  doc.setTextColor(...white);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("GET A FREE QUOTE TODAY", W / 2, btnY + 11, { align: "center" });

  // Make the button a clickable WhatsApp link
  doc.link(btnX, btnY, btnW, btnH, { url: WHATSAPP_URL });

  // Small note under button
  doc.setTextColor(...green);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("Click the button above to connect instantly via WhatsApp", W / 2, btnY + 22, { align: "center" });

  // Contact details cards
  const cardY = 155;
  const cardW = (CW - 12) / 3;

  // Phone card
  doc.setFillColor(...darkMid);
  doc.roundedRect(M, cardY, cardW, 36, 3, 3, "F");
  doc.setFillColor(...green);
  doc.roundedRect(M, cardY, cardW, 8, 3, 3, "F");
  doc.rect(M, cardY + 5, cardW, 3, "F");
  doc.setTextColor(...white);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("CALL US", M + cardW / 2, cardY + 6, { align: "center" });
  doc.setTextColor(220, 230, 240);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("+91 98559 24442", M + cardW / 2, cardY + 20, { align: "center" });
  doc.setTextColor(160, 170, 180);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text("Mon-Sat, 9 AM - 7 PM", M + cardW / 2, cardY + 28, { align: "center" });

  // Email card
  const emailX = M + cardW + 6;
  doc.setFillColor(...darkMid);
  doc.roundedRect(emailX, cardY, cardW, 36, 3, 3, "F");
  doc.setFillColor(...green);
  doc.roundedRect(emailX, cardY, cardW, 8, 3, 3, "F");
  doc.rect(emailX, cardY + 5, cardW, 3, "F");
  doc.setTextColor(...white);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("EMAIL US", emailX + cardW / 2, cardY + 6, { align: "center" });
  doc.setTextColor(220, 230, 240);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("corporate@", emailX + cardW / 2, cardY + 18, { align: "center" });
  doc.text("grabyourcar.com", emailX + cardW / 2, cardY + 24, { align: "center" });
  doc.setTextColor(160, 170, 180);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text("Response within 2 hours", emailX + cardW / 2, cardY + 31, { align: "center" });

  // Office card
  const offX = emailX + cardW + 6;
  doc.setFillColor(...darkMid);
  doc.roundedRect(offX, cardY, cardW, 36, 3, 3, "F");
  doc.setFillColor(...green);
  doc.roundedRect(offX, cardY, cardW, 8, 3, 3, "F");
  doc.rect(offX, cardY + 5, cardW, 3, "F");
  doc.setTextColor(...white);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("VISIT US", offX + cardW / 2, cardY + 6, { align: "center" });
  doc.setTextColor(220, 230, 240);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("MS 228, 2nd Floor", offX + cardW / 2, cardY + 17, { align: "center" });
  doc.text("DT Mega Mall, Sec 28", offX + cardW / 2, cardY + 23, { align: "center" });
  doc.setTextColor(160, 170, 180);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text("Gurugram, Haryana", offX + cardW / 2, cardY + 30, { align: "center" });

  // WhatsApp link on phone card
  doc.link(M, cardY, cardW, 36, { url: `tel:+919855924442` });
  doc.link(emailX, cardY, cardW, 36, { url: `mailto:corporate@grabyourcar.com` });

  // Bottom tagline
  doc.setTextColor(...green);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Your Trusted Automotive Partner", W / 2, 210, { align: "center" });

  doc.setTextColor(140, 150, 160);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Adis Makethemoney Services Pvt Ltd  |  CIN: U50100HR2024PTC123456", W / 2, 220, { align: "center" });
  doc.text("www.grabyourcar.com  |  All rights reserved 2025-26", W / 2, 226, { align: "center" });

  // Web link
  doc.setTextColor(...green);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("grabyourcar.com/corporate", W / 2, 236, { align: "center" });
  doc.link(W / 2 - 30, 232, 60, 8, { url: "https://grabyourcar.com/corporate" });

  pageFooter(9);

  // Save
  doc.save("Grabyourcar-Corporate-Fleet-Solutions-2025.pdf");
};
