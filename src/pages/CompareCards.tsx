import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useCars } from "@/hooks/useCars";
import { Car } from "@/data/cars/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { X, Plus, Car as CarIcon, Fuel, Gauge, Shield, Maximize, Zap, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import logoImg from "@/assets/logo-grabyourcar-new.png";

// Convert image to base64 for PDF embedding
const getLogoBase64 = (): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve("");
    img.src = logoImg;
  });
};

const CompareCars = () => {
  const location = useLocation();
  const preselectedCarIds = (location.state as { preselectedCars?: (string | number)[] })?.preselectedCars;
  
  const { data: allDbCars = [], isLoading } = useCars({ useDatabase: true });

  const [selectedCarIds, setSelectedCarIds] = useState<(string | null)[]>(() => {
    if (preselectedCarIds && preselectedCarIds.length > 0) {
      const ids = preselectedCarIds.slice(0, 3).map(id => String(id));
      while (ids.length < 3) ids.push(null);
      return ids;
    }
    return [null, null, null];
  });

  const selectedCars: (Car | null)[] = selectedCarIds.map(id => 
    id ? allDbCars.find(c => String(c.id) === id) || null : null
  );

  const handleSelectCar = (index: number, carId: string) => {
    const newIds = [...selectedCarIds];
    newIds[index] = carId;
    setSelectedCarIds(newIds);
  };

  const handleRemoveCar = (index: number) => {
    const newIds = [...selectedCarIds];
    newIds[index] = null;
    setSelectedCarIds(newIds);
  };

  const getAvailableCars = (currentIndex: number) => {
    const selectedIds = selectedCarIds
      .filter((_, idx) => idx !== currentIndex)
      .filter(Boolean) as string[];
    return allDbCars.filter(car => !selectedIds.includes(String(car.id)));
  };

  const activeCars = selectedCars.filter(Boolean) as Car[];

  const getSpecValue = (car: Car, category: keyof Car["specifications"], label: string) => {
    const spec = car.specifications[category]?.find((s) => s.label === label);
    return spec?.value || "-";
  };

  const handleDownloadPDF = async () => {
    if (activeCars.length < 2) return;
    try {
      const doc = new jsPDF({ orientation: "landscape" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 16;
      let y = 0;

      // Brand colors
      const brandGreen: [number, number, number] = [16, 185, 129]; // emerald-500
      const darkGray: [number, number, number] = [31, 41, 55];
      const medGray: [number, number, number] = [107, 114, 128];
      const lightBg: [number, number, number] = [243, 244, 246];
      const white: [number, number, number] = [255, 255, 255];

      // ── Header bar ──
      doc.setFillColor(...brandGreen);
      doc.rect(0, 0, pageW, 32, "F");

      // Logo
      const logoBase64 = await getLogoBase64();
      if (logoBase64) {
        doc.addImage(logoBase64, "PNG", margin, 5, 50, 22);
      } else {
        doc.setTextColor(...white);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Grabyourcar", margin, 20);
      }

      // Header right text
      doc.setTextColor(...white);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Car Comparison Report", pageW - margin, 14, { align: "right" });
      doc.setFontSize(7);
      doc.text(`Generated on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, pageW - margin, 21, { align: "right" });
      doc.text("www.grabyourcar.com | +91 98559 24442", pageW - margin, 27, { align: "right" });

      y = 40;

      // ── Car names row with accent background ──
      const colW = (pageW - margin * 2) / (activeCars.length + 1);
      doc.setFillColor(240, 253, 244); // green-50
      doc.roundedRect(margin, y, pageW - margin * 2, 16, 3, 3, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkGray);
      doc.text("Specification", margin + 4, y + 10);
      activeCars.forEach((car, i) => {
        doc.setTextColor(...brandGreen);
        doc.text(`${car.brand} ${car.name}`, margin + colW * (i + 1) + 4, y + 10);
      });
      y += 22;

      // ── Helpers ──
      let rowAlt = false;

      const drawTableRow = (label: string, values: string[], isBold = false) => {
        if (y > pageH - 28) {
          addFooter(doc, pageW, pageH, margin);
          doc.addPage();
          y = 16;
        }
        if (rowAlt) {
          doc.setFillColor(...lightBg);
          doc.rect(margin, y - 4, pageW - margin * 2, 9, "F");
        }
        rowAlt = !rowAlt;
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...darkGray);
        doc.text(label, margin + 4, y + 2, { maxWidth: colW - 8 });
        values.forEach((val, i) => {
          doc.setTextColor(isBold ? brandGreen[0] : medGray[0], isBold ? brandGreen[1] : medGray[1], isBold ? brandGreen[2] : medGray[2]);
          doc.text(val || "—", margin + colW * (i + 1) + 4, y + 2, { maxWidth: colW - 8 });
        });
        y += 9;
      };

      const drawSectionHeader = (title: string) => {
        if (y > pageH - 40) {
          addFooter(doc, pageW, pageH, margin);
          doc.addPage();
          y = 16;
        }
        y += 4;
        doc.setFillColor(...brandGreen);
        doc.roundedRect(margin, y - 5, pageW - margin * 2, 12, 2, 2, "F");
        doc.setTextColor(...white);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(title, margin + 6, y + 3);
        y += 14;
        rowAlt = false;
      };

      const addFooter = (d: jsPDF, pw: number, ph: number, m: number) => {
        d.setDrawColor(...brandGreen);
        d.setLineWidth(0.5);
        d.line(m, ph - 14, pw - m, ph - 14);
        d.setFontSize(7);
        d.setTextColor(...medGray);
        d.setFont("helvetica", "normal");
        d.text("Grabyourcar — India's Smarter Way to Buy New Cars", m, ph - 8);
        d.text("hello@grabyourcar.com | www.grabyourcar.com", pw - m, ph - 8, { align: "right" });
      };

      // ── Sections ──
      drawSectionHeader("💰  Price & Availability");
      drawTableRow("Price Range", activeCars.map(c => c.price || "—"), true);
      drawTableRow("Discount", activeCars.map(c => c.discount || "—"));
      drawTableRow("Availability", activeCars.map(c => c.availability || "—"));
      drawTableRow("Fuel Types", activeCars.map(c => c.fuelTypes?.join(", ") || "—"));
      drawTableRow("Transmission", activeCars.map(c => c.transmission?.join(", ") || "—"));

      drawSectionHeader("⚙️  Engine Specifications");
      ["Engine Type", "Displacement", "Max Power", "Max Torque", "Fuel Tank Capacity"].forEach(label => {
        drawTableRow(label, activeCars.map(c => getSpecValue(c, "engine", label)));
      });

      drawSectionHeader("📐  Dimensions");
      ["Length", "Width", "Height", "Wheelbase", "Ground Clearance", "Boot Space"].forEach(label => {
        drawTableRow(label, activeCars.map(c => getSpecValue(c, "dimensions", label)));
      });

      drawSectionHeader("🏎️  Performance");
      ["Mileage (Petrol)", "Mileage (Diesel)", "Top Speed", "0-100 kmph"].forEach(label => {
        drawTableRow(label, activeCars.map(c => getSpecValue(c, "performance", label)));
      });

      drawSectionHeader("✨  Features");
      ["Airbags", "Infotainment", "Sunroof", "Connectivity", "Sound System", "Cruise Control"].forEach(label => {
        drawTableRow(label, activeCars.map(c => getSpecValue(c, "features", label)));
      });

      drawSectionHeader("🎁  Offers & Discounts");
      ["cashback", "exchange", "accessory", "finance"].forEach(type => {
        const vals = activeCars.map(c => {
          const offer = c.offers?.find(o => o.type === type);
          return offer ? `${offer.discount} — ${offer.title}` : "—";
        });
        drawTableRow(type.charAt(0).toUpperCase() + type.slice(1), vals);
      });

      // ── Diagonal watermark on every page ──
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        addFooter(doc, pageW, pageH, margin);
        doc.saveGraphicsState();
        // @ts-ignore
        doc.setGState(new doc.GState({ opacity: 0.04 }));
        doc.setTextColor(...brandGreen);
        doc.setFontSize(60);
        doc.setFont("helvetica", "bold");
        doc.text("GRABYOURCAR", pageW / 2, pageH / 2, { align: "center", angle: 35 });
        doc.restoreGraphicsState();
      }

      const fileName = `GrabYourCar-Compare-${activeCars.map(c => c.name?.replace(/\s+/g, "-")).join("-vs-")}.pdf`;
      doc.save(fileName);
      toast.success("Comparison PDF downloaded!");
    } catch {
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-8 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="mb-3 md:mb-4" variant="secondary">
              Compare Up To 3 Cars
            </Badge>
            <h1 className="text-2xl md:text-5xl font-heading font-bold text-foreground mb-3 md:mb-4">
              Compare Cars Side by Side
            </h1>
            <p className="text-sm md:text-lg text-muted-foreground">
              Select up to 3 cars to compare specifications, features, and prices.
            </p>
          </div>
        </div>
      </section>

      {/* Car Selection */}
      <section className="py-6 md:py-8 border-b border-border">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading cars...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              {selectedCars.map((car, index) => (
                <Card key={index} className="relative overflow-hidden">
                  <CardContent className="p-3 md:p-4">
                    {car ? (
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {car.image && (
                              <img
                                src={car.image}
                                alt={car.name}
                                className="w-full h-24 md:h-32 object-cover rounded-lg mb-2 md:mb-3"
                              />
                            )}
                            <h3 className="font-heading font-semibold text-sm md:text-lg">{car.name}</h3>
                            <p className="text-primary font-bold text-sm md:text-base">{car.price}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 md:h-8 md:w-8"
                            onClick={() => handleRemoveCar(index)}
                          >
                            <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 md:py-8 space-y-3 md:space-y-4">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted flex items-center justify-center">
                          <Plus className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                        </div>
                        <Select onValueChange={(value) => handleSelectCar(index, value)}>
                          <SelectTrigger className="w-full text-sm">
                            <SelectValue placeholder="Select a car" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableCars(index).map((c) => (
                              <SelectItem key={String(c.id)} value={String(c.id)}>
                                {c.brand} {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Download button */}
          {activeCars.length >= 2 && (
            <div className="flex justify-center mt-4 md:mt-6">
              <Button onClick={handleDownloadPDF} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Download Comparison PDF
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Comparison Content */}
      {activeCars.length >= 2 && (
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4 space-y-6 md:space-y-12">
            {/* Price Comparison */}
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <CarIcon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  Price & Availability
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 md:p-6 md:pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px] md:w-[200px] text-xs md:text-sm">Feature</TableHead>
                        {activeCars.map((car) => (
                          <TableHead key={String(car.id)} className="text-center min-w-[100px] text-xs md:text-sm">
                            {car.name}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium text-xs md:text-sm">Price Range</TableCell>
                        {activeCars.map((car) => (
                          <TableCell key={String(car.id)} className="text-center font-semibold text-primary text-xs md:text-sm">
                            {car.price}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium text-xs md:text-sm">Discount</TableCell>
                        {activeCars.map((car) => (
                          <TableCell key={String(car.id)} className="text-center text-xs md:text-sm">
                            {car.discount ? <Badge variant="destructive" className="text-[10px] md:text-xs">{car.discount}</Badge> : "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium text-xs md:text-sm">Availability</TableCell>
                        {activeCars.map((car) => (
                          <TableCell key={String(car.id)} className="text-center text-xs md:text-sm">
                            <Badge variant={car.isLimited ? "secondary" : "default"} className="text-[10px] md:text-xs">
                              {car.availability}
                            </Badge>
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium text-xs md:text-sm">Fuel Types</TableCell>
                        {activeCars.map((car) => (
                          <TableCell key={String(car.id)} className="text-center text-xs md:text-sm">
                            {car.fuelTypes?.join(", ") || "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium text-xs md:text-sm">Transmission</TableCell>
                        {activeCars.map((car) => (
                          <TableCell key={String(car.id)} className="text-center text-xs md:text-sm">
                            {car.transmission?.join(", ") || "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Engine Specifications */}
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Fuel className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  Engine Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 md:p-6 md:pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px] md:w-[200px] text-xs md:text-sm">Specification</TableHead>
                        {activeCars.map((car) => (
                          <TableHead key={String(car.id)} className="text-center min-w-[100px] text-xs md:text-sm">
                            {car.name}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {["Engine Type", "Displacement", "Max Power", "Max Torque", "Fuel Tank Capacity"].map(
                        (label) => (
                          <TableRow key={label}>
                            <TableCell className="font-medium text-xs md:text-sm">{label}</TableCell>
                            {activeCars.map((car) => (
                              <TableCell key={String(car.id)} className="text-center text-xs md:text-sm">
                                {getSpecValue(car, "engine", label)}
                              </TableCell>
                            ))}
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Dimensions */}
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Maximize className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  Dimensions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 md:p-6 md:pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px] md:w-[200px] text-xs md:text-sm">Dimension</TableHead>
                        {activeCars.map((car) => (
                          <TableHead key={String(car.id)} className="text-center min-w-[100px] text-xs md:text-sm">
                            {car.name}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {["Length", "Width", "Height", "Wheelbase", "Ground Clearance", "Boot Space"].map(
                        (label) => (
                          <TableRow key={label}>
                            <TableCell className="font-medium text-xs md:text-sm">{label}</TableCell>
                            {activeCars.map((car) => (
                              <TableCell key={String(car.id)} className="text-center text-xs md:text-sm">
                                {getSpecValue(car, "dimensions", label)}
                              </TableCell>
                            ))}
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Performance */}
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Gauge className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 md:p-6 md:pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px] md:w-[200px] text-xs md:text-sm">Metric</TableHead>
                        {activeCars.map((car) => (
                          <TableHead key={String(car.id)} className="text-center min-w-[100px] text-xs md:text-sm">
                            {car.name}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {["Mileage (Petrol)", "Mileage (Diesel)", "Top Speed", "0-100 kmph"].map((label) => (
                        <TableRow key={label}>
                          <TableCell className="font-medium text-xs md:text-sm">{label}</TableCell>
                          {activeCars.map((car) => (
                            <TableCell key={String(car.id)} className="text-center text-xs md:text-sm">
                              {getSpecValue(car, "performance", label)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Zap className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  Features
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 md:p-6 md:pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px] md:w-[200px] text-xs md:text-sm">Feature</TableHead>
                        {activeCars.map((car) => (
                          <TableHead key={String(car.id)} className="text-center min-w-[100px] text-xs md:text-sm">
                            {car.name}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {["Airbags", "Infotainment", "Sunroof", "Connectivity", "Sound System", "Cruise Control"].map(
                        (label) => (
                          <TableRow key={label}>
                            <TableCell className="font-medium text-xs md:text-sm">{label}</TableCell>
                            {activeCars.map((car) => (
                              <TableCell key={String(car.id)} className="text-center text-xs md:text-sm">
                                {getSpecValue(car, "features", label)}
                              </TableCell>
                            ))}
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Offers */}
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Shield className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  Offers & Discounts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 md:p-6 md:pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px] md:w-[200px] text-xs md:text-sm">Offer Type</TableHead>
                        {activeCars.map((car) => (
                          <TableHead key={String(car.id)} className="text-center min-w-[100px] text-xs md:text-sm">
                            {car.name}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {["cashback", "exchange", "accessory", "finance"].map((type) => (
                        <TableRow key={type}>
                          <TableCell className="font-medium capitalize text-xs md:text-sm">{type}</TableCell>
                          {activeCars.map((car) => {
                            const offer = car.offers?.find((o) => o.type === type);
                            return (
                              <TableCell key={String(car.id)} className="text-center text-xs md:text-sm">
                                {offer ? (
                                  <div>
                                    <p className="font-semibold text-primary text-xs md:text-sm">{offer.discount}</p>
                                    <p className="text-[10px] md:text-xs text-muted-foreground">{offer.title}</p>
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Empty State */}
      {activeCars.length < 2 && !isLoading && (
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 md:mb-6">
                <CarIcon className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
              </div>
              <h2 className="text-xl md:text-2xl font-heading font-semibold mb-2">Select Cars to Compare</h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Please select at least 2 cars from the options above to see a detailed comparison.
              </p>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default CompareCars;
