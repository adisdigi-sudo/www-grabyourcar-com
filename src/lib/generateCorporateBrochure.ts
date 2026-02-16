import jsPDF from "jspdf";

export const generateCorporateBrochure = () => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = doc.internal.pageSize.getWidth();   // 210
  const H = doc.internal.pageSize.getHeight();   // 297
  const M = 18; // margin
  const CW = W - M * 2; // content width

  // Brand palette
  const green: [number, number, number] = [34, 197, 94];
  const dark: [number, number, number] = [15, 23, 42];
  const slate: [number, number, number] = [100, 116, 139];
  const lightBg: [number, number, number] = [248, 250, 252];
  const white: [number, number, number] = [255, 255, 255];
  const greenDark: [number, number, number] = [22, 163, 74];

  const line = (y: number, color = slate) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.line(M, y, W - M, y);
  };

  const pageFooter = (page: number, total: number) => {
    doc.setFillColor(...dark);
    doc.rect(0, H - 14, W, 14, "F");
    doc.setTextColor(...white);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("© 2025 Adis Makethemoney Services Pvt Ltd  |  www.grabyourcar.com  |  +91 98559 24442", W / 2, H - 6, { align: "center" });
    doc.setFontSize(6);
    doc.text(`Page ${page} of ${total}`, W - M, H - 6, { align: "right" });
  };

  const sectionTitle = (text: string, y: number) => {
    doc.setFillColor(...green);
    doc.rect(M, y, 4, 10, "F");
    doc.setTextColor(...dark);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(text, M + 8, y + 8);
    return y + 16;
  };

  const TOTAL_PAGES = 7;

  // ============================================================
  // PAGE 1 — COVER
  // ============================================================
  // Full dark cover
  doc.setFillColor(...dark);
  doc.rect(0, 0, W, H, "F");

  // Green accent bar top
  doc.setFillColor(...green);
  doc.rect(0, 0, W, 6, "F");

  // Logo area
  doc.setTextColor(...white);
  doc.setFontSize(36);
  doc.setFont("helvetica", "bold");
  doc.text("GRABYOURCAR", W / 2, 55, { align: "center" });

  // Green accent line under logo
  doc.setFillColor(...green);
  doc.rect(W / 2 - 35, 62, 70, 2.5, "F");

  // Subtitle
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 210, 220);
  doc.text("Your Trusted Automotive Partner", W / 2, 74, { align: "center" });

  // Main title
  doc.setTextColor(...white);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("Corporate Fleet", W / 2, 110, { align: "center" });
  doc.text("Solutions", W / 2, 122, { align: "center" });

  // Green badge
  doc.setFillColor(...green);
  doc.roundedRect(W / 2 - 40, 132, 80, 12, 6, 6, "F");
  doc.setTextColor(...white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("ENTERPRISE EDITION 2025", W / 2, 140, { align: "center" });

  // Feature highlights in 2 columns
  const coverFeatures = [
    "✓ Volume Discounts up to 15%",
    "✓ Dedicated Account Manager",
    "✓ Priority Vehicle Allocation",
    "✓ Pan-India Dealer Network",
    "✓ Flexible Corporate Financing",
    "✓ End-to-End Documentation",
  ];

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 210, 220);
  coverFeatures.forEach((f, i) => {
    const x = i < 3 ? M + 20 : W / 2 + 10;
    const y = 168 + (i % 3) * 14;
    doc.text(f, x, y);
  });

  // Bottom contact bar
  doc.setFillColor(...green);
  doc.rect(0, H - 40, W, 26, "F");
  doc.setTextColor(...white);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("+91 98559 24442", M + 15, H - 25);
  doc.text("corporate@grabyourcar.com", W / 2, H - 25, { align: "center" });
  doc.text("grabyourcar.com/corporate", W - M - 15, H - 25, { align: "right" });

  pageFooter(1, TOTAL_PAGES);

  // ============================================================
  // PAGE 2 — ABOUT & TRUST
  // ============================================================
  doc.addPage();
  doc.setFillColor(...green);
  doc.rect(0, 0, W, 4, "F");

  let y = sectionTitle("About Grabyourcar", 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...slate);
  const aboutText = "Grabyourcar is a leading automotive marketplace proudly serving corporate groups, educational institutions, healthcare organizations, and enterprises across India. We specialize in seamless bulk vehicle procurement with dedicated relationship management, priority allocation, and competitive pricing that saves your organization time and money.";
  const aboutLines = doc.splitTextToSize(aboutText, CW);
  doc.text(aboutLines, M, y);
  y += aboutLines.length * 5 + 10;

  // Trust stats in boxes
  const stats = [
    { number: "50+", label: "Corporate Clients" },
    { number: "1000+", label: "Vehicles Delivered" },
    { number: "100+", label: "Cities Covered" },
    { number: "15%", label: "Max Discount" },
  ];

  const statW = (CW - 15) / 4;
  stats.forEach((s, i) => {
    const x = M + i * (statW + 5);
    doc.setFillColor(...dark);
    doc.roundedRect(x, y, statW, 30, 3, 3, "F");
    doc.setTextColor(...green);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(s.number, x + statW / 2, y + 14, { align: "center" });
    doc.setTextColor(...white);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(s.label, x + statW / 2, y + 22, { align: "center" });
  });

  y += 42;

  // Trusted by section
  y = sectionTitle("Trusted by Leading Organizations", y);
  doc.setFillColor(...lightBg);
  doc.roundedRect(M, y, CW, 28, 3, 3, "F");
  const clients = [
    "Gaur Group", "Orange Group", "Dewan Public School",
    "Virmani Hospital", "Flight n Fares", "Banshidhar Group",
    "More 50+ Organizations..."
  ];
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...dark);
  doc.text(clients.join("   •   "), W / 2, y + 11, { align: "center", maxWidth: CW - 10 });
  doc.setFontSize(8);
  doc.setTextColor(...green);
  doc.setFont("helvetica", "bold");
  doc.text("And many more trusted partners across India", W / 2, y + 21, { align: "center" });

  y += 38;

  // Why Choose Us highlights
  y = sectionTitle("Why Choose Grabyourcar?", y);

  const benefits = [
    { title: "Priority Vehicle Allocation", desc: "Skip the queue with dedicated inventory access for corporate orders. First preference on new launches." },
    { title: "Competitive Corporate Pricing", desc: "Exclusive bulk discounts up to 15% on fleet purchases. Special rates unavailable to retail customers." },
    { title: "Dedicated Account Manager", desc: "Personal relationship manager for seamless coordination. Single point of contact for all requirements." },
    { title: "Fast Delivery Timelines", desc: "Expedited processing and delivery. Reduce procurement cycle by 30-45 days vs traditional channels." },
    { title: "Pan-India Network", desc: "Seamless delivery and service support across 100+ cities. Multi-location fleet deployments." },
    { title: "Complete Documentation", desc: "End-to-end paperwork — registration, compliance, GST invoicing, and corporate billing support." },
  ];

  benefits.forEach((b, i) => {
    const bx = i % 2 === 0 ? M : M + CW / 2 + 3;
    const by = y + Math.floor(i / 2) * 28;
    const bw = CW / 2 - 3;

    doc.setFillColor(i % 2 === 0 ? 240 : 245, i % 2 === 0 ? 253 : 250, i % 2 === 0 ? 244 : 252);
    doc.roundedRect(bx, by, bw, 24, 2, 2, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(`${i + 1}. ${b.title}`, bx + 4, by + 8);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate);
    doc.setFontSize(7.5);
    const descLines = doc.splitTextToSize(b.desc, bw - 8);
    doc.text(descLines, bx + 4, by + 14);
  });

  pageFooter(2, TOTAL_PAGES);

  // ============================================================
  // PAGE 3 — INDUSTRIES WE SERVE
  // ============================================================
  doc.addPage();
  doc.setFillColor(...green);
  doc.rect(0, 0, W, 4, "F");

  y = sectionTitle("Industries We Serve", 18);

  const industries = [
    { name: "Real Estate & Construction", desc: "Fleet vehicles for site teams, executives, and client tours. Bulk SUVs, sedans, and utility vehicles.", icon: "🏗️" },
    { name: "Healthcare & Pharma", desc: "Reliable transportation for medical staff, ambulance fleet, and hospital administration.", icon: "🏥" },
    { name: "Education & Institutions", desc: "School and college fleet management, staff transportation, and administrative vehicles.", icon: "🎓" },
    { name: "IT & Technology", desc: "Employee transportation, executive cars, and campus shuttle fleet management.", icon: "💻" },
    { name: "Hospitality & Tourism", desc: "Guest transfers, tour fleet, and luxury vehicle procurement for premium hospitality.", icon: "🏨" },
    { name: "Manufacturing & Logistics", desc: "Utility vehicles, goods transport, and employee commute fleet solutions.", icon: "🏭" },
    { name: "Travel & Aviation", desc: "Airport transfers, executive travel fleet, and tour operator vehicle procurement.", icon: "✈️" },
    { name: "Government & PSUs", desc: "Official vehicles, protocol cars, and large-scale government fleet procurement.", icon: "🏛️" },
  ];

  const indW = (CW - 8) / 2;
  industries.forEach((ind, i) => {
    const ix = i % 2 === 0 ? M : M + indW + 8;
    const iy = y + Math.floor(i / 2) * 32;

    doc.setFillColor(...lightBg);
    doc.roundedRect(ix, iy, indW, 28, 2, 2, "F");

    // Green left accent
    doc.setFillColor(...green);
    doc.rect(ix, iy + 3, 2, 22, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(`${ind.icon}  ${ind.name}`, ix + 6, iy + 10);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate);
    doc.setFontSize(7.5);
    const iLines = doc.splitTextToSize(ind.desc, indW - 12);
    doc.text(iLines, ix + 6, iy + 17);
  });

  y += Math.ceil(industries.length / 2) * 32 + 8;

  // Process section
  y = sectionTitle("Our 4-Step Process", y);

  const processSteps = [
    { step: "01", title: "Initial Consultation", desc: "Understand your fleet needs, budget, and timeline requirements." },
    { step: "02", title: "Custom Proposal", desc: "Tailored pricing, model recommendations, and financing options." },
    { step: "03", title: "Order & Procurement", desc: "Priority allocation, paperwork handling, and order processing." },
    { step: "04", title: "Delivery & Support", desc: "Coordinated multi-location delivery with ongoing relationship support." },
  ];

  const stepW = (CW - 9) / 4;
  processSteps.forEach((ps, i) => {
    const sx = M + i * (stepW + 3);

    doc.setFillColor(...dark);
    doc.roundedRect(sx, y, stepW, 44, 2, 2, "F");

    // Step number circle
    doc.setFillColor(...green);
    doc.circle(sx + stepW / 2, y + 10, 7, "F");
    doc.setTextColor(...white);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(ps.step, sx + stepW / 2, y + 13, { align: "center" });

    doc.setTextColor(...white);
    doc.setFontSize(8);
    doc.text(ps.title, sx + stepW / 2, y + 24, { align: "center" });

    doc.setTextColor(180, 190, 200);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    const pLines = doc.splitTextToSize(ps.desc, stepW - 6);
    doc.text(pLines, sx + stepW / 2, y + 31, { align: "center", maxWidth: stepW - 6 });
  });

  pageFooter(3, TOTAL_PAGES);

  // ============================================================
  // PAGE 4 — FLEET PACKAGES & PRICING
  // ============================================================
  doc.addPage();
  doc.setFillColor(...green);
  doc.rect(0, 0, W, 4, "F");

  y = sectionTitle("Fleet Packages & Pricing", 18);

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...slate);
  doc.text("*Prices are indicative and subject to model, variant, and market conditions. Contact us for customized quotes.", M, y);
  y += 10;

  const packages = [
    {
      name: "STARTER FLEET",
      range: "5-10 Vehicles",
      discount: "Up to 5% Off",
      color: dark,
      features: ["Dedicated coordinator", "Standard delivery timeline", "Basic documentation support", "Single-brand ordering"],
    },
    {
      name: "GROWTH FLEET",
      range: "11-25 Vehicles",
      discount: "Up to 10% Off",
      color: greenDark,
      features: ["Dedicated account manager", "Priority delivery", "Complete documentation", "Insurance coordination", "Multi-brand ordering"],
      popular: true,
    },
    {
      name: "ENTERPRISE FLEET",
      range: "25+ Vehicles",
      discount: "Up to 15% Off",
      color: dark,
      features: ["Senior relationship manager", "Fastest delivery guarantee", "End-to-end support", "Custom financing solutions", "Fleet insurance package", "Pan-India coordination"],
    },
  ];

  const pkgW = (CW - 12) / 3;
  packages.forEach((pkg, i) => {
    const px = M + i * (pkgW + 6);
    const pkgH = 95;

    // Card background
    doc.setFillColor(...lightBg);
    doc.roundedRect(px, y, pkgW, pkgH, 3, 3, "F");

    // Popular badge
    if (pkg.popular) {
      doc.setFillColor(...green);
      doc.roundedRect(px + pkgW / 2 - 18, y - 4, 36, 8, 4, 4, "F");
      doc.setTextColor(...white);
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.text("MOST POPULAR", px + pkgW / 2, y, { align: "center" });
    }

    // Header
    doc.setFillColor(...pkg.color);
    doc.roundedRect(px, y, pkgW, 20, 3, 3, "F");
    doc.rect(px, y + 10, pkgW, 10, "F"); // square bottom corners

    doc.setTextColor(...white);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(pkg.name, px + pkgW / 2, y + 9, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(pkg.range, px + pkgW / 2, y + 16, { align: "center" });

    // Discount
    doc.setTextColor(...green);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(pkg.discount, px + pkgW / 2, y + 32, { align: "center" });

    // Features
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate);
    pkg.features.forEach((f, fi) => {
      doc.text(`✓  ${f}`, px + 5, y + 42 + fi * 8);
    });
  });

  y += 108;

  // Comparison table vs traditional
  y = sectionTitle("Grabyourcar vs Traditional Dealerships", y);

  const compHeaders = ["Feature", "Grabyourcar", "Traditional"];
  const compRows = [
    ["Corporate Discount", "Up to 15%", "2-3%"],
    ["Account Manager", "Dedicated", "Not Available"],
    ["Delivery Timeline", "30-45 Days Faster", "Standard"],
    ["Multi-Brand Access", "All Brands", "Single Brand"],
    ["Documentation", "End-to-End", "Limited"],
    ["Post-Sale Support", "Priority", "Standard"],
  ];

  // Header row
  doc.setFillColor(...dark);
  doc.rect(M, y, CW, 9, "F");
  doc.setTextColor(...white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(compHeaders[0], M + 5, y + 6);
  doc.text(compHeaders[1], M + 70, y + 6);
  doc.text(compHeaders[2], M + 130, y + 6);
  y += 9;

  compRows.forEach((row, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(...lightBg);
      doc.rect(M, y, CW, 9, "F");
    }
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...dark);
    doc.text(row[0], M + 5, y + 6);
    doc.setTextColor(...green);
    doc.setFont("helvetica", "bold");
    doc.text(row[1], M + 70, y + 6);
    doc.setTextColor(...slate);
    doc.setFont("helvetica", "normal");
    doc.text(row[2], M + 130, y + 6);
    y += 9;
  });

  pageFooter(4, TOTAL_PAGES);

  // ============================================================
  // PAGE 5 — POPULAR FLEET MODELS
  // ============================================================
  doc.addPage();
  doc.setFillColor(...green);
  doc.rect(0, 0, W, 4, "F");

  y = sectionTitle("Popular Corporate Fleet Models", 18);

  const segments = [
    { segment: "Hatchback", models: ["Maruti Swift", "Hyundai i20", "Tata Altroz", "Maruti Baleno"], range: "₹6 - 10 Lakh" },
    { segment: "Sedan", models: ["Maruti Ciaz", "Honda City", "Hyundai Verna", "Skoda Slavia"], range: "₹10 - 18 Lakh" },
    { segment: "Compact SUV", models: ["Maruti Brezza", "Hyundai Venue", "Tata Nexon", "Kia Sonet"], range: "₹8 - 15 Lakh" },
    { segment: "Mid SUV", models: ["Hyundai Creta", "Kia Seltos", "MG Hector", "VW Taigun"], range: "₹12 - 22 Lakh" },
    { segment: "Premium SUV", models: ["Toyota Fortuner", "MG Gloster", "Mahindra XUV700", "Jeep Meridian"], range: "₹18 - 50 Lakh" },
    { segment: "MUV / MPV", models: ["Maruti Ertiga", "Toyota Innova", "Kia Carens", "Maruti XL6"], range: "₹10 - 25 Lakh" },
    { segment: "Electric", models: ["Tata Nexon EV", "MG ZS EV", "Hyundai Ioniq 5", "BYD Atto 3"], range: "₹15 - 45 Lakh" },
    { segment: "Luxury", models: ["Mercedes C-Class", "BMW 3 Series", "Audi A4", "Volvo XC40"], range: "₹45 - 80 Lakh" },
  ];

  // Table header
  doc.setFillColor(...dark);
  doc.roundedRect(M, y, CW, 10, 2, 2, "F");
  doc.rect(M, y + 5, CW, 5, "F");
  doc.setTextColor(...white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Segment", M + 5, y + 7);
  doc.text("Popular Models", M + 45, y + 7);
  doc.text("Price Range*", W - M - 5, y + 7, { align: "right" });
  y += 10;

  segments.forEach((seg, i) => {
    const rowH = 14;
    if (i % 2 === 0) {
      doc.setFillColor(...lightBg);
      doc.rect(M, y, CW, rowH, "F");
    }

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(seg.segment, M + 5, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate);
    doc.setFontSize(7);
    doc.text(seg.models.join(", "), M + 45, y + 6);

    doc.setTextColor(...green);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(seg.range, W - M - 5, y + 6, { align: "right" });

    // Sub note
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 170, 180);
    doc.text(`${seg.models.length}+ options available`, M + 45, y + 11);

    y += rowH;
  });

  y += 8;
  doc.setFontSize(7);
  doc.setTextColor(...slate);
  doc.setFont("helvetica", "italic");
  doc.text("*Ex-showroom prices. On-road prices vary by city. GST additional as applicable.", M, y);

  y += 15;

  // EV Fleet highlight box
  doc.setFillColor(22, 163, 74);
  doc.roundedRect(M, y, CW, 30, 3, 3, "F");
  doc.setTextColor(...white);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("⚡ Go Green with Corporate EV Fleet", W / 2, y + 12, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Special incentives and subsidies available for corporate electric vehicle fleet adoption.", W / 2, y + 21, { align: "center" });
  doc.text("Tax benefits under Section 80EEB  •  Lower total cost of ownership  •  ESG compliance", W / 2, y + 27, { align: "center" });

  pageFooter(5, TOTAL_PAGES);

  // ============================================================
  // PAGE 6 — CASE STUDIES & TESTIMONIALS
  // ============================================================
  doc.addPage();
  doc.setFillColor(...green);
  doc.rect(0, 0, W, 4, "F");

  y = sectionTitle("Success Stories", 18);

  const cases = [
    {
      company: "Gaur Group — Real Estate",
      fleet: "25 SUVs for site management",
      result: "Delivered in 30 days with 12% discount",
      quote: "Grabyourcar transformed our fleet procurement. What used to take months was done in weeks.",
    },
    {
      company: "Dewan Public School — Education",
      fleet: "15 vehicles for staff transportation",
      result: "Complete documentation handled, 8% savings",
      quote: "The dedicated account manager made the entire process hassle-free for our institution.",
    },
    {
      company: "Virmani Hospital — Healthcare",
      fleet: "10 sedans + 5 SUVs for medical staff",
      result: "Priority allocation during chip shortage",
      quote: "Even during supply constraints, Grabyourcar ensured our medical team had reliable transportation.",
    },
  ];

  cases.forEach((cs, i) => {
    doc.setFillColor(i % 2 === 0 ? 240 : 248, 253, i % 2 === 0 ? 244 : 252);
    doc.roundedRect(M, y, CW, 38, 3, 3, "F");

    // Green left bar
    doc.setFillColor(...green);
    doc.rect(M, y + 3, 3, 32, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(cs.company, M + 8, y + 9);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate);
    doc.text(`Fleet: ${cs.fleet}`, M + 8, y + 16);
    doc.setTextColor(...green);
    doc.setFont("helvetica", "bold");
    doc.text(`Result: ${cs.result}`, M + 8, y + 23);

    doc.setFont("helvetica", "italic");
    doc.setTextColor(...slate);
    doc.setFontSize(7.5);
    doc.text(`"${cs.quote}"`, M + 8, y + 31);

    y += 44;
  });

  y += 5;

  // Testimonials
  y = sectionTitle("Client Testimonials", y);

  const testimonials = [
    { name: "Rajesh Gaur", role: "Director, Gaur Group", text: "Best corporate car buying experience. Their team is professional, responsive, and delivers on promises." },
    { name: "Dr. Virmani", role: "CEO, Virmani Hospital", text: "We've been procuring through Grabyourcar for 3 years now. Consistently excellent service and pricing." },
    { name: "Ankit Sharma", role: "COO, Flight n Fares", text: "The volume discounts and priority delivery have saved us significant time and money on our travel fleet." },
  ];

  const testW = (CW - 8) / 3;
  testimonials.forEach((t, i) => {
    const tx = M + i * (testW + 4);
    doc.setFillColor(...dark);
    doc.roundedRect(tx, y, testW, 42, 2, 2, "F");

    // Stars
    doc.setTextColor(250, 204, 21);
    doc.setFontSize(8);
    doc.text("★★★★★", tx + testW / 2, y + 8, { align: "center" });

    doc.setTextColor(200, 210, 220);
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    const tLines = doc.splitTextToSize(`"${t.text}"`, testW - 8);
    doc.text(tLines, tx + 4, y + 15);

    doc.setTextColor(...green);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(t.name, tx + testW / 2, y + 34, { align: "center" });
    doc.setTextColor(160, 170, 180);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(t.role, tx + testW / 2, y + 39, { align: "center" });
  });

  pageFooter(6, TOTAL_PAGES);

  // ============================================================
  // PAGE 7 — FAQ + CONTACT CTA
  // ============================================================
  doc.addPage();
  doc.setFillColor(...green);
  doc.rect(0, 0, W, 4, "F");

  y = sectionTitle("Frequently Asked Questions", 18);

  const faqs = [
    { q: "What is the minimum order for corporate pricing?", a: "We offer corporate pricing starting from 5 vehicles. Higher volumes unlock deeper discounts up to 15%." },
    { q: "Do you support multi-brand orders?", a: "Yes! Unlike dealerships, we facilitate procurement across all major brands — Maruti, Hyundai, Tata, Toyota, Honda, Kia, MG, and more." },
    { q: "How fast can you deliver?", a: "Our priority allocation reduces delivery timelines by 30-45 days compared to traditional channels. Enterprise orders get fastest delivery guarantee." },
    { q: "What documentation do you handle?", a: "We manage everything — registration, insurance coordination, GST invoicing, corporate billing, and compliance documentation." },
    { q: "Do you offer financing options?", a: "Yes, we partner with leading banks and NBFCs to offer competitive corporate fleet financing with flexible EMI options." },
    { q: "Can you deliver across India?", a: "Absolutely. We coordinate seamless delivery across 100+ cities with our pan-India dealer network." },
  ];

  faqs.forEach((faq, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(...lightBg);
    } else {
      doc.setFillColor(...white);
    }
    doc.roundedRect(M, y, CW, 18, 1, 1, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(`Q: ${faq.q}`, M + 4, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate);
    doc.setFontSize(7);
    const aLines = doc.splitTextToSize(`A: ${faq.a}`, CW - 10);
    doc.text(aLines, M + 4, y + 12);

    y += 20;
  });

  y += 8;

  // Big CTA
  doc.setFillColor(...dark);
  doc.roundedRect(M, y, CW, 55, 4, 4, "F");

  doc.setTextColor(...white);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Ready to Transform Your", W / 2, y + 16, { align: "center" });
  doc.text("Fleet Procurement?", W / 2, y + 26, { align: "center" });

  doc.setFillColor(...green);
  doc.roundedRect(W / 2 - 38, y + 32, 76, 12, 6, 6, "F");
  doc.setTextColor(...white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("GET A FREE QUOTE TODAY", W / 2, y + 40, { align: "center" });

  // Contact row
  y += 62;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...dark);
  doc.text("📞  +91 98559 24442", M, y);
  doc.text("📧  corporate@grabyourcar.com", W / 2 - 15, y);
  doc.text("🌐  grabyourcar.com", W - M - 30, y);

  y += 8;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...green);
  doc.text("💬  WhatsApp us for instant response", M, y);

  pageFooter(7, TOTAL_PAGES);

  // Save
  doc.save("Grabyourcar-Corporate-Fleet-Solutions-2025.pdf");
};
