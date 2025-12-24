import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
import {
  Shield,
  Car,
  CheckCircle2,
  Star,
  Phone,
  FileText,
  Zap,
  Award,
  Clock,
  IndianRupee,
} from "lucide-react";
import { toast } from "sonner";

const insuranceProviders = [
  {
    id: 1,
    name: "HDFC ERGO",
    logo: "🏦",
    rating: 4.5,
    claimSettlement: "98%",
    premium: "₹4,999",
    cashless: "10,000+",
    features: ["24x7 Roadside Assistance", "Zero Depreciation", "NCB Protection"],
    highlight: "Best Overall",
  },
  {
    id: 2,
    name: "ICICI Lombard",
    logo: "🏛️",
    rating: 4.4,
    claimSettlement: "97%",
    premium: "₹5,199",
    cashless: "8,500+",
    features: ["Instant Policy", "Personal Accident Cover", "Engine Protection"],
    highlight: "Fast Claims",
  },
  {
    id: 3,
    name: "Bajaj Allianz",
    logo: "⭐",
    rating: 4.3,
    claimSettlement: "96%",
    premium: "₹4,799",
    cashless: "7,000+",
    features: ["Consumables Cover", "Return to Invoice", "Key Replacement"],
    highlight: "Best Price",
  },
  {
    id: 4,
    name: "Tata AIG",
    logo: "🔵",
    rating: 4.2,
    claimSettlement: "95%",
    premium: "₹5,399",
    cashless: "6,500+",
    features: ["Roadside Assistance", "Tyre Protection", "EMI Protection"],
    highlight: "Wide Coverage",
  },
  {
    id: 5,
    name: "New India Assurance",
    logo: "🇮🇳",
    rating: 4.1,
    claimSettlement: "94%",
    premium: "₹4,599",
    cashless: "5,000+",
    features: ["Government Backed", "Pan India Network", "Affordable Premium"],
    highlight: "Trusted",
  },
];

const coverageTypes = [
  {
    title: "Third Party",
    description: "Mandatory by law. Covers damages to third-party vehicle, property, and injuries.",
    price: "From ₹2,094",
    features: ["Legal Liability Cover", "Property Damage", "Personal Injury Cover"],
  },
  {
    title: "Comprehensive",
    description: "Complete protection for your car including own damage and third-party liability.",
    price: "From ₹4,999",
    features: ["Own Damage Cover", "Third Party Cover", "Personal Accident", "Fire & Theft"],
  },
  {
    title: "Zero Depreciation",
    description: "Get full claim amount without depreciation deduction on parts.",
    price: "Add-on ₹1,500",
    features: ["No Depreciation", "Full Parts Value", "Ideal for New Cars"],
  },
];

const CarInsurance = () => {
  const [carValue, setCarValue] = useState([500000]);
  const [carAge, setCarAge] = useState("new");
  const [fuelType, setFuelType] = useState("petrol");
  const [city, setCity] = useState("");
  const [calculatedPremium, setCalculatedPremium] = useState<number | null>(null);

  const calculatePremium = () => {
    if (!city) {
      toast.error("Please enter your city");
      return;
    }

    // Premium calculation logic
    let basePremium = carValue[0] * 0.028; // 2.8% of car value
    
    // Age factor
    if (carAge === "new") basePremium *= 1;
    else if (carAge === "1-2") basePremium *= 0.95;
    else if (carAge === "3-5") basePremium *= 0.85;
    else basePremium *= 0.75;

    // Fuel factor
    if (fuelType === "diesel") basePremium *= 1.1;
    else if (fuelType === "cng") basePremium *= 1.05;
    else if (fuelType === "electric") basePremium *= 0.9;

    setCalculatedPremium(Math.round(basePremium));
    toast.success("Premium calculated successfully!");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="mb-4" variant="secondary">
              <Shield className="h-3 w-3 mr-1" />
              Trusted by 50,000+ Car Owners
            </Badge>
            <h1 className="text-3xl md:text-5xl font-heading font-bold text-foreground mb-4">
              Protect Your Car with the{" "}
              <span className="text-primary">Best Insurance</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Compare quotes from top insurers, get instant policy, and enjoy hassle-free claims with our trusted partners.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>Instant Policy</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>98% Claim Settlement</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>10,000+ Cashless Garages</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Calculator */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-heading font-bold mb-2">
              Calculate Your Premium
            </h2>
            <p className="text-muted-foreground">
              Get an instant estimate for your car insurance premium
            </p>
          </div>

          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6 md:p-8 space-y-6">
              {/* Car Value Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-medium">Car Value (IDV)</Label>
                  <span className="text-lg font-bold text-primary">
                    ₹{carValue[0].toLocaleString()}
                  </span>
                </div>
                <Slider
                  value={carValue}
                  onValueChange={setCarValue}
                  max={5000000}
                  min={100000}
                  step={50000}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>₹1 Lakh</span>
                  <span>₹50 Lakh</span>
                </div>
              </div>

              {/* Car Age */}
              <div className="space-y-2">
                <Label className="text-base font-medium">Car Age</Label>
                <Select value={carAge} onValueChange={setCarAge}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select car age" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Brand New</SelectItem>
                    <SelectItem value="1-2">1-2 Years</SelectItem>
                    <SelectItem value="3-5">3-5 Years</SelectItem>
                    <SelectItem value="5+">5+ Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fuel Type */}
              <div className="space-y-2">
                <Label className="text-base font-medium">Fuel Type</Label>
                <Select value={fuelType} onValueChange={setFuelType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="petrol">Petrol</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="cng">CNG</SelectItem>
                    <SelectItem value="electric">Electric</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label className="text-base font-medium">City</Label>
                <Input
                  placeholder="Enter your city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <Button onClick={calculatePremium} className="w-full" size="lg">
                <IndianRupee className="h-4 w-4 mr-2" />
                Calculate Premium
              </Button>

              {calculatedPremium && (
                <div className="mt-6 p-6 bg-primary/10 rounded-xl text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Estimated Annual Premium
                  </p>
                  <p className="text-4xl font-bold text-primary">
                    ₹{calculatedPremium.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    *Final premium may vary based on additional factors
                  </p>
                  <Button className="mt-4" variant="default">
                    Get Detailed Quotes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Coverage Types */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-heading font-bold mb-2">
              Types of Coverage
            </h2>
            <p className="text-muted-foreground">
              Choose the right coverage for your needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {coverageTypes.map((coverage, index) => (
              <Card key={index} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl">{coverage.title}</CardTitle>
                  <p className="text-2xl font-bold text-primary">{coverage.price}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{coverage.description}</p>
                  <ul className="space-y-2">
                    {coverage.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Provider Comparison Table */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-heading font-bold mb-2">
              Compare Insurance Providers
            </h2>
            <p className="text-muted-foreground">
              Find the best insurer for your car
            </p>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Provider</TableHead>
                    <TableHead className="text-center">Rating</TableHead>
                    <TableHead className="text-center">Claim Settlement</TableHead>
                    <TableHead className="text-center">Starting Premium</TableHead>
                    <TableHead className="text-center">Cashless Garages</TableHead>
                    <TableHead className="min-w-[200px]">Key Features</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insuranceProviders.map((provider) => (
                    <TableRow key={provider.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{provider.logo}</span>
                          <div>
                            <p className="font-semibold">{provider.name}</p>
                            <Badge variant="secondary" className="text-xs">
                              {provider.highlight}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{provider.rating}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-primary">
                          {provider.claimSettlement}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {provider.premium}
                      </TableCell>
                      <TableCell className="text-center">
                        {provider.cashless}
                      </TableCell>
                      <TableCell>
                        <ul className="text-sm space-y-1">
                          {provider.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-primary" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm">Get Quote</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-heading font-bold mb-2">
              Why Buy Insurance Through Us?
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Zap,
                title: "Instant Policy",
                description: "Get your policy issued within minutes",
              },
              {
                icon: Award,
                title: "Best Prices",
                description: "Compare and get the lowest premium",
              },
              {
                icon: Clock,
                title: "Quick Claims",
                description: "Hassle-free claim settlement process",
              },
              {
                icon: Phone,
                title: "24/7 Support",
                description: "Round the clock customer assistance",
              },
            ].map((item, index) => (
              <Card key={index} className="text-center p-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Documents Required */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-heading font-bold mb-2">
                Documents Required
              </h2>
              <p className="text-muted-foreground">
                Keep these documents handy for quick policy issuance
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "Vehicle Registration Certificate (RC)",
                "Previous Insurance Policy (for renewal)",
                "PAN Card / Aadhaar Card",
                "Driving License",
                "Vehicle Invoice (for new cars)",
                "NOC (if applicable)",
              ].map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 bg-card rounded-lg border"
                >
                  <FileText className="h-5 w-5 text-primary" />
                  <span>{doc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-heading font-bold mb-4">
            Ready to Insure Your Car?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Get instant quotes from top insurers and secure your car today with comprehensive coverage.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="secondary" size="lg">
              <Car className="h-4 w-4 mr-2" />
              Get Free Quote
            </Button>
            <Button variant="outline" size="lg" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              <Phone className="h-4 w-4 mr-2" />
              Talk to Expert
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CarInsurance;