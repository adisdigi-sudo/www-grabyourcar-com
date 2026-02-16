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

  const TOTAL_PAGES = 7;

  // ── Helpers ──────────────────────────────────────────────

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

  const topBar = () => {
    doc.setFillColor(...green);
    doc.rect(0, 0, W, 4, "F");
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

  // Feature grid (2 columns, clean layout)
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

    // Green check circle
    doc.setFillColor(...green);
    doc.circle(x - 4, fy - 2, 2.5, "F");
    doc.setTextColor(...white);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("✓", x - 4, fy - 0.5, { align: "center" });

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
  doc.text("Trusted by 50+ Corporate Organizations Across India", W / 2, 235, { align: "center" });

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
  // PAGE 2 — ABOUT & WHY CHOOSE US
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  topBar();

  let y = sectionTitle("About Grabyourcar", 16, "India's Premier Corporate Automotive Partner");

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...slate);
  const aboutText =
    "Grabyourcar is a leading automotive marketplace serving corporate groups, educational institutions, healthcare organisations, and enterprises across India. We specialise in seamless bulk vehicle procurement with dedicated relationship management, priority allocation, and competitive pricing that saves your organisation time and money.";
  const aboutLines = doc.splitTextToSize(aboutText, CW);
  doc.text(aboutLines, M, y);
  y += aboutLines.length * 5 + 8;

  // Trust stats
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

  y += 30;

  // Why Choose Us
  y = sectionTitle("Why Corporates Choose Grabyourcar", y);

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
    const by = y + Math.floor(i / 2) * 26;

    doc.setFillColor(i % 2 === 0 ? 240 : 245, 253, i % 2 === 0 ? 244 : 250);
    doc.roundedRect(bx, by, bColW, 22, 2, 2, "F");

    // Number badge
    doc.setFillColor(...green);
    doc.circle(bx + 8, by + 7, 4, "F");
    doc.setTextColor(...white);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`${i + 1}`, bx + 8, by + 9, { align: "center" });

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(b.title, bx + 15, by + 8);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate);
    doc.setFontSize(6.5);
    const dl = doc.splitTextToSize(b.desc, bColW - 17);
    doc.text(dl, bx + 15, by + 14);
  });

  pageFooter(2);

  // ════════════════════════════════════════════════════════════
  // PAGE 3 — INDUSTRIES & PROCESS
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  topBar();

  y = sectionTitle("Industries We Serve", 16, "Tailored solutions for every sector");

  const industries = [
    { name: "Real Estate & Construction", desc: "Fleet vehicles for site teams, executives, and client tours. Bulk SUVs, sedans, and utility vehicles." },
    { name: "Healthcare & Pharmaceuticals", desc: "Reliable transportation for medical staff, ambulance fleet, and hospital administration." },
    { name: "Education & Institutions", desc: "School and college fleet management, staff transportation, and administrative vehicles." },
    { name: "IT & Technology", desc: "Employee transportation, executive cars, and campus shuttle fleet management." },
    { name: "Hospitality & Tourism", desc: "Guest transfers, tour fleet, and luxury vehicle procurement for premium hospitality." },
    { name: "Manufacturing & Logistics", desc: "Utility vehicles, goods transport, and employee commute fleet solutions." },
    { name: "Travel & Aviation", desc: "Airport transfers, executive travel fleet, and tour operator vehicle procurement." },
    { name: "Government & Public Sector", desc: "Official vehicles, protocol cars, and large-scale government fleet procurement." },
  ];

  const indW = (CW - 6) / 2;
  industries.forEach((ind, i) => {
    const ix = i % 2 === 0 ? M : M + indW + 6;
    const iy = y + Math.floor(i / 2) * 28;

    doc.setFillColor(...lightBg);
    doc.roundedRect(ix, iy, indW, 24, 2, 2, "F");
    doc.setFillColor(...green);
    doc.roundedRect(ix, iy, 3, 24, 1, 1, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(ind.name, ix + 7, iy + 8);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate);
    doc.setFontSize(7);
    const il = doc.splitTextToSize(ind.desc, indW - 12);
    doc.text(il, ix + 7, iy + 14);
  });

  y += Math.ceil(industries.length / 2) * 28 + 6;

  divider(y);
  y += 6;

  // 4-Step Process
  y = sectionTitle("Your Procurement Journey", y, "From enquiry to delivery in as little as 2 weeks");

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

    // Number circle
    doc.setFillColor(...green);
    doc.circle(sx + stepW / 2, y + 11, 8, "F");
    doc.setTextColor(...white);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(s.num, sx + stepW / 2, y + 14, { align: "center" });

    // Arrow between steps
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

  pageFooter(3);

  // ════════════════════════════════════════════════════════════
  // PAGE 4 — FLEET PACKAGES & COMPARISON
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  topBar();

  y = sectionTitle("Fleet Packages & Pricing", 16, "Flexible plans designed for every organisation size");

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...slate);
  doc.text("*Prices are indicative and subject to model, variant, and market conditions. Contact us for a customised quote.", M, y);
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
  const pkgH = 100;
  packages.forEach((pkg, i) => {
    const px = M + i * (pkgW + 5);

    // Card background
    doc.setFillColor(...lightBg);
    doc.roundedRect(px, y, pkgW, pkgH, 3, 3, "F");

    // Border for popular
    if (pkg.popular) {
      doc.setDrawColor(...green);
      doc.setLineWidth(0.8);
      doc.roundedRect(px, y, pkgW, pkgH, 3, 3, "S");
      // Badge
      doc.setFillColor(...green);
      doc.roundedRect(px + pkgW / 2 - 16, y - 4, 32, 8, 4, 4, "F");
      doc.setTextColor(...white);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "bold");
      doc.text("MOST POPULAR", px + pkgW / 2, y, { align: "center" });
    }

    // Header
    doc.setFillColor(...pkg.headerColor);
    doc.roundedRect(px + 1, y + 1, pkgW - 2, 22, 2, 2, "F");
    doc.setTextColor(...white);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(pkg.name, px + pkgW / 2, y + 10, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(pkg.range, px + pkgW / 2, y + 18, { align: "center" });

    // Discount
    doc.setTextColor(...green);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text(pkg.discount, px + pkgW / 2, y + 34, { align: "center" });

    // Divider
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(px + 5, y + 38, px + pkgW - 5, y + 38);

    // Features
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate);
    pkg.features.forEach((f, fi) => {
      doc.setTextColor(...green);
      doc.setFont("helvetica", "bold");
      doc.text("✓", px + 5, y + 46 + fi * 8);
      doc.setTextColor(...dark);
      doc.setFont("helvetica", "normal");
      doc.text(f, px + 10, y + 46 + fi * 8);
    });
  });

  y += pkgH + 10;

  // Comparison table
  y = sectionTitle("Grabyourcar vs Traditional Dealerships", y);

  const compHeaders = ["Feature", "Grabyourcar", "Traditional"];
  const compRows = [
    ["Corporate Discount", "Up to 15%", "2 - 3%"],
    ["Account Manager", "Dedicated", "Not Available"],
    ["Delivery Timeline", "30-45 Days Faster", "Standard"],
    ["Multi-Brand Access", "All Major Brands", "Single Brand Only"],
    ["Documentation", "End-to-End Support", "Limited"],
    ["Post-Sale Support", "Priority Service", "Standard"],
  ];

  // Header row
  doc.setFillColor(...dark);
  doc.roundedRect(M, y, CW, 9, 2, 2, "F");
  doc.rect(M, y + 5, CW, 4, "F");
  doc.setTextColor(...white);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text(compHeaders[0], M + 5, y + 6);
  doc.text(compHeaders[1], M + 68, y + 6);
  doc.text(compHeaders[2], M + 130, y + 6);
  y += 9;

  compRows.forEach((row, i) => {
    const rowY = y + i * 8;
    if (i % 2 === 0) {
      doc.setFillColor(...lightBg);
      doc.rect(M, rowY, CW, 8, "F");
    }
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...dark);
    doc.text(row[0], M + 5, rowY + 5.5);
    doc.setTextColor(...green);
    doc.setFont("helvetica", "bold");
    doc.text(row[1], M + 68, rowY + 5.5);
    doc.setTextColor(...slate);
    doc.setFont("helvetica", "normal");
    doc.text(row[2], M + 130, rowY + 5.5);
  });

  pageFooter(4);

  // ════════════════════════════════════════════════════════════
  // PAGE 5 — POPULAR FLEET MODELS
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  topBar();

  y = sectionTitle("Popular Corporate Fleet Models", 16, "Best-selling vehicles across all segments");

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

  // Table header
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
  doc.roundedRect(M, y, CW, 32, 4, 4, "F");
  // Inner accent
  doc.setFillColor(...green);
  doc.roundedRect(M + 3, y + 3, CW - 6, 26, 3, 3, "F");
  doc.setFillColor(22, 163, 74, 0.8);
  doc.roundedRect(M + 3, y + 3, CW - 6, 26, 3, 3, "F");

  doc.setTextColor(...white);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Go Green with a Corporate EV Fleet", W / 2, y + 13, { align: "center" });
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("Special incentives and subsidies available for corporate electric vehicle fleet adoption.", W / 2, y + 20, { align: "center" });
  doc.text("Tax benefits under Section 80EEB  |  Lower total cost of ownership  |  ESG compliance", W / 2, y + 26, { align: "center" });

  pageFooter(5);

  // ════════════════════════════════════════════════════════════
  // PAGE 6 — SUCCESS STORIES & TESTIMONIALS
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  topBar();

  y = sectionTitle("Success Stories", 16, "Real results for real organisations");

  const cases = [
    {
      company: "Gaur Group — Real Estate",
      fleet: "25 SUVs for site management",
      result: "Delivered in 30 days with 12% discount",
      quote: "Grabyourcar transformed our fleet procurement. What used to take months was completed in weeks with significant cost savings.",
    },
    {
      company: "Dewan Public School — Education",
      fleet: "15 vehicles for staff transportation",
      result: "Complete documentation handled, 8% savings",
      quote: "The dedicated account manager made the entire process hassle-free for our institution. Highly recommended for schools and colleges.",
    },
    {
      company: "Virmani Hospital — Healthcare",
      fleet: "10 sedans + 5 SUVs for medical staff",
      result: "Priority allocation during supply shortage",
      quote: "Even during supply constraints, Grabyourcar ensured our medical team had reliable transportation without delays.",
    },
  ];

  cases.forEach((cs) => {
    doc.setFillColor(...lightBg);
    doc.roundedRect(M, y, CW, 36, 3, 3, "F");

    // Green left accent
    doc.setFillColor(...green);
    doc.roundedRect(M, y, 4, 36, 2, 2, "F");

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
    doc.text(ql, M + 9, y + 27);

    y += 42;
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

    // Stars
    doc.setTextColor(...gold);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const stars = Array(5).fill("*").join(" ");
    doc.text(stars, tx + testW / 2, y + 9, { align: "center" });

    doc.setTextColor(200, 215, 225);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "italic");
    const tLines = doc.splitTextToSize(`"${t.text}"`, testW - 8);
    doc.text(tLines, tx + 4, y + 16);

    // Divider
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

  pageFooter(6);

  // ════════════════════════════════════════════════════════════
  // PAGE 7 — FAQs & CONTACT CTA
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  topBar();

  y = sectionTitle("Frequently Asked Questions", 16);

  const faqs = [
    { q: "What is the minimum order for corporate pricing?", a: "We offer corporate pricing starting from 5 vehicles. Higher volumes unlock deeper discounts of up to 15%." },
    { q: "Do you support multi-brand orders?", a: "Yes. Unlike dealerships, we facilitate procurement across all major brands — Maruti, Hyundai, Tata, Toyota, Honda, Kia, MG, and more." },
    { q: "How fast can you deliver?", a: "Our priority allocation reduces delivery timelines by 30-45 days compared to traditional channels. Enterprise orders receive the fastest delivery guarantee." },
    { q: "What documentation do you handle?", a: "We manage everything — registration, insurance coordination, GST invoicing, corporate billing, and compliance documentation." },
    { q: "Do you offer financing options?", a: "Yes, we partner with leading banks and NBFCs to offer competitive corporate fleet financing with flexible EMI options." },
    { q: "Can you deliver across India?", a: "Absolutely. We coordinate seamless delivery across 100+ cities through our pan-India dealer network." },
  ];

  faqs.forEach((faq, i) => {
    const faqBg: [number, number, number] = i % 2 === 0 ? lightBg : white;
    doc.setFillColor(...faqBg);
    doc.roundedRect(M, y, CW, 17, 2, 2, "F");

    // Q indicator
    doc.setFillColor(...green);
    doc.roundedRect(M + 3, y + 2, 8, 5, 1, 1, "F");
    doc.setTextColor(...white);
    doc.setFontSize(5);
    doc.setFont("helvetica", "bold");
    doc.text("Q", M + 7, y + 5.5, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(faq.q, M + 14, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate);
    doc.setFontSize(7);
    const al = doc.splitTextToSize(faq.a, CW - 18);
    doc.text(al, M + 14, y + 12);

    y += 19;
  });

  y += 6;

  // Big CTA
  doc.setFillColor(...dark);
  doc.roundedRect(M, y, CW, 58, 5, 5, "F");

  // Inner green border
  doc.setDrawColor(...green);
  doc.setLineWidth(0.6);
  doc.roundedRect(M + 3, y + 3, CW - 6, 52, 4, 4, "S");

  doc.setTextColor(...white);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Ready to Transform Your", W / 2, y + 18, { align: "center" });
  doc.text("Fleet Procurement?", W / 2, y + 28, { align: "center" });

  // CTA button
  doc.setFillColor(...green);
  doc.roundedRect(W / 2 - 40, y + 34, 80, 14, 7, 7, "F");
  doc.setTextColor(...white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("GET A FREE QUOTE TODAY", W / 2, y + 43, { align: "center" });

  y += 66;

  // Contact row (no emojis — plain text labels)
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...dark);
  doc.text("Call: +91 98559 24442", M, y);
  doc.text("Email: corporate@grabyourcar.com", W / 2 - 10, y);

  y += 7;
  doc.setTextColor(...green);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("WhatsApp us for an instant response  |  grabyourcar.com/corporate", M, y);

  pageFooter(7);

  // Save
  doc.save("Grabyourcar-Corporate-Fleet-Solutions-2025.pdf");
};
