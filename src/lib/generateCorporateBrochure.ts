import jsPDF from "jspdf";

export const generateCorporateBrochure = () => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const primaryColor: [number, number, number] = [34, 197, 94]; // Green
  const darkColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const grayColor: [number, number, number] = [100, 116, 139]; // Slate 500

  // Helper functions
  const drawLine = (y: number) => {
    doc.setDrawColor(...grayColor);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
  };

  // ========== PAGE 1: Cover ==========
  
  // Header gradient simulation (solid background)
  doc.setFillColor(...darkColor);
  doc.rect(0, 0, pageWidth, 100, "F");

  // Brand name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("GRABYOURCAR", pageWidth / 2, 40, { align: "center" });

  // Tagline
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Your Trusted Automotive Partner", pageWidth / 2, 52, { align: "center" });

  // Green accent line
  doc.setFillColor(...primaryColor);
  doc.rect(pageWidth / 2 - 30, 60, 60, 2, "F");

  // Document title
  doc.setTextColor(...darkColor);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Corporate Fleet Solutions", pageWidth / 2, 130, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Premium Vehicle Solutions for Enterprises", pageWidth / 2, 142, { align: "center" });

  // Key highlights box
  const boxY = 160;
  doc.setFillColor(248, 250, 252); // Light gray
  doc.roundedRect(margin, boxY, contentWidth, 70, 3, 3, "F");

  const highlights = [
    "• Volume Discounts up to 15%",
    "• Dedicated Account Manager",
    "• Priority Vehicle Allocation",
    "• Pan-India Dealer Network",
    "• Flexible Financing Options",
    "• End-to-End Documentation",
  ];

  doc.setFontSize(11);
  doc.setTextColor(...darkColor);
  const col1X = margin + 15;
  const col2X = pageWidth / 2 + 10;

  highlights.forEach((item, index) => {
    const x = index < 3 ? col1X : col2X;
    const y = boxY + 20 + (index % 3) * 18;
    doc.text(item, x, y);
  });

  // Contact info at bottom
  doc.setFontSize(10);
  doc.setTextColor(...grayColor);
  doc.text("Contact: +91 98559 24442  |  corporate@grabyourcar.com", pageWidth / 2, pageHeight - 30, { align: "center" });
  doc.text("www.grabyourcar.com", pageWidth / 2, pageHeight - 22, { align: "center" });

  // ========== PAGE 2: Why Choose Us ==========
  doc.addPage();

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 8, "F");

  doc.setTextColor(...darkColor);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Why Choose Grabyourcar?", margin, 30);

  drawLine(35);

  // Benefits
  const benefits = [
    {
      title: "Priority Vehicle Allocation",
      desc: "Skip the queue with dedicated inventory access for corporate orders. Get first preference on new launches and popular models.",
    },
    {
      title: "Competitive Corporate Pricing",
      desc: "Exclusive bulk discounts up to 15% on fleet purchases. Special rates unavailable to retail customers.",
    },
    {
      title: "Dedicated Relationship Support",
      desc: "Personal account manager assigned to handle all your requirements. Single point of contact for seamless coordination.",
    },
    {
      title: "Fast Delivery Timelines",
      desc: "Expedited processing and delivery for time-sensitive business needs. Reduce procurement cycle by 30-45 days.",
    },
    {
      title: "Pan-India Dealer Network",
      desc: "Seamless delivery and service support across 100+ cities. Coordinated multi-location fleet deployments.",
    },
    {
      title: "Complete Documentation",
      desc: "End-to-end paperwork handling from registration to compliance. GST invoicing and corporate billing support.",
    },
  ];

  let yPos = 50;
  doc.setFontSize(12);

  benefits.forEach((benefit, index) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text(`${index + 1}.`, margin, yPos);
    doc.setTextColor(...darkColor);
    doc.text(benefit.title, margin + 8, yPos);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grayColor);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(benefit.desc, contentWidth - 10);
    doc.text(lines, margin + 8, yPos + 6);

    yPos += 12 + lines.length * 5 + 8;
    doc.setFontSize(12);
  });

  // Industries section
  yPos += 5;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text("Industries We Serve", margin, yPos);

  yPos += 10;
  const industries = ["Real Estate", "Education", "Healthcare", "Hospitality", "Travel", "Fleet Operators", "Manufacturing"];
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text(industries.join("  •  "), margin, yPos);

  // Footer
  doc.setFontSize(8);
  doc.text("Grabyourcar Corporate Solutions  |  Page 2", pageWidth / 2, pageHeight - 15, { align: "center" });

  // ========== PAGE 3: Fleet Packages & Pricing ==========
  doc.addPage();

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 8, "F");

  doc.setTextColor(...darkColor);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Fleet Packages & Indicative Pricing", margin, 30);

  drawLine(35);

  // Pricing note
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...grayColor);
  doc.text("*Prices are indicative and subject to model, variant, and market conditions. Contact us for customized quotes.", margin, 45);

  // Package tables
  const packages = [
    {
      name: "Starter Fleet",
      range: "5-10 Vehicles",
      discount: "Up to 5% Off",
      features: ["Dedicated coordinator", "Standard delivery timeline", "Basic documentation support"],
    },
    {
      name: "Growth Fleet",
      range: "11-25 Vehicles",
      discount: "Up to 10% Off",
      features: ["Dedicated account manager", "Priority delivery", "Complete documentation", "Insurance coordination"],
    },
    {
      name: "Enterprise Fleet",
      range: "25+ Vehicles",
      discount: "Up to 15% Off",
      features: ["Senior relationship manager", "Fastest delivery guarantee", "End-to-end support", "Custom financing", "Fleet insurance package"],
    },
  ];

  yPos = 55;
  const packageWidth = (contentWidth - 10) / 3;

  packages.forEach((pkg, index) => {
    const x = margin + index * (packageWidth + 5);

    // Package box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, yPos, packageWidth, 85, 2, 2, "F");

    // Package name
    doc.setFillColor(...(index === 2 ? primaryColor : darkColor));
    doc.roundedRect(x, yPos, packageWidth, 18, 2, 2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(pkg.name, x + packageWidth / 2, yPos + 12, { align: "center" });

    // Range & discount
    doc.setTextColor(...darkColor);
    doc.setFontSize(10);
    doc.text(pkg.range, x + packageWidth / 2, yPos + 28, { align: "center" });

    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text(pkg.discount, x + packageWidth / 2, yPos + 38, { align: "center" });

    // Features
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grayColor);
    doc.setFontSize(8);
    pkg.features.forEach((feature, fIndex) => {
      doc.text(`• ${feature}`, x + 5, yPos + 50 + fIndex * 7);
    });
  });

  // Popular models section
  yPos = 155;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text("Popular Corporate Fleet Models", margin, yPos);

  const models = [
    { segment: "Hatchback", models: "Maruti Swift, Hyundai i20, Tata Altroz", range: "₹6-10 Lakh" },
    { segment: "Sedan", models: "Maruti Ciaz, Honda City, Hyundai Verna", range: "₹10-18 Lakh" },
    { segment: "Compact SUV", models: "Maruti Brezza, Hyundai Venue, Tata Nexon", range: "₹8-15 Lakh" },
    { segment: "SUV", models: "Hyundai Creta, Kia Seltos, MG Hector", range: "₹12-22 Lakh" },
    { segment: "Premium SUV", models: "Toyota Fortuner, MG Gloster, Mahindra XUV700", range: "₹18-50 Lakh" },
    { segment: "MUV", models: "Maruti Ertiga, Toyota Innova, Kia Carens", range: "₹10-25 Lakh" },
  ];

  yPos += 8;
  doc.setFontSize(9);
  
  // Table header
  doc.setFillColor(...darkColor);
  doc.rect(margin, yPos, contentWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("Segment", margin + 5, yPos + 5.5);
  doc.text("Popular Models", margin + 45, yPos + 5.5);
  doc.text("Price Range*", margin + 140, yPos + 5.5);

  yPos += 8;
  doc.setFont("helvetica", "normal");

  models.forEach((model, index) => {
    const rowY = yPos + index * 10;
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, rowY, contentWidth, 10, "F");
    }
    doc.setTextColor(...darkColor);
    doc.text(model.segment, margin + 5, rowY + 6.5);
    doc.setTextColor(...grayColor);
    doc.text(model.models, margin + 45, rowY + 6.5);
    doc.setTextColor(...primaryColor);
    doc.text(model.range, margin + 140, rowY + 6.5);
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text("*Ex-showroom prices. On-road prices vary by location. GST additional.", margin, pageHeight - 25);
  doc.text("Grabyourcar Corporate Solutions  |  Page 3", pageWidth / 2, pageHeight - 15, { align: "center" });

  // ========== PAGE 4: Contact ==========
  doc.addPage();

  // Header
  doc.setFillColor(...darkColor);
  doc.rect(0, 0, pageWidth, 80, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Let's Drive Your Business Forward", pageWidth / 2, 35, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Get in touch with our corporate team for customized solutions", pageWidth / 2, 50, { align: "center" });

  // Contact details
  yPos = 100;

  const contactDetails = [
    { label: "Corporate Desk", value: "+91 98559 24442" },
    { label: "Email", value: "corporate@grabyourcar.com" },
    { label: "Website", value: "www.grabyourcar.com/corporate" },
    { label: "Coverage", value: "Pan-India (100+ Cities)" },
  ];

  contactDetails.forEach((contact) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...grayColor);
    doc.text(contact.label, margin, yPos);

    doc.setFontSize(14);
    doc.setTextColor(...darkColor);
    doc.text(contact.value, margin, yPos + 8);

    yPos += 25;
  });

  // CTA box
  yPos += 10;
  doc.setFillColor(...primaryColor);
  doc.roundedRect(margin, yPos, contentWidth, 40, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Ready to Get Started?", pageWidth / 2, yPos + 15, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Request a callback and our team will reach out within 24 hours", pageWidth / 2, yPos + 28, { align: "center" });

  // Trusted by section
  yPos += 60;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text("Trusted by Leading Organizations", pageWidth / 2, yPos, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  const clients = "Gaur Group • Orange Group • Dewan Public School • Virmani Hospital • Flight n Fares • Banshidhar Group";
  doc.text(clients, pageWidth / 2, yPos + 10, { align: "center" });

  // Footer
  doc.setFontSize(8);
  doc.text("© 2025 Adis Makethemoney Services Pvt Ltd. All rights reserved.", pageWidth / 2, pageHeight - 20, { align: "center" });
  doc.text("This document is for informational purposes only. Prices and offers subject to change.", pageWidth / 2, pageHeight - 12, { align: "center" });

  // Save the PDF
  doc.save("Grabyourcar-Corporate-Fleet-Solutions.pdf");
};
