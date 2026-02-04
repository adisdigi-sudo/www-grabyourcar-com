import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ServiceBanner } from "@/components/ServiceBanner";
import EMICalculator from "@/components/EMICalculator";
import {
  CheckCircle2,
  XCircle,
  FileText,
  Building2,
  Calculator,
  Phone,
  ArrowRight,
  Star,
  Clock,
  Percent,
  IndianRupee,
  Download,
} from "lucide-react";

const bankData = [
  {
    name: "HDFC Bank",
    logo: "🏦",
    interestRate: "8.50% - 9.50%",
    minRate: 8.5,
    processingFee: "0.50%",
    maxTenure: "7 years",
    maxAmount: "₹50 Lakhs",
    rating: 4.8,
    features: ["Quick Approval", "Minimal Docs", "Doorstep Service"],
    highlight: "Most Popular",
  },
  {
    name: "SBI Car Loan",
    logo: "🏛️",
    interestRate: "8.65% - 9.80%",
    minRate: 8.65,
    processingFee: "0.40%",
    maxTenure: "7 years",
    maxAmount: "₹1 Crore",
    rating: 4.7,
    features: ["Lowest Processing Fee", "High Loan Amount", "Special Rates for Women"],
    highlight: "Lowest Fees",
  },
  {
    name: "ICICI Bank",
    logo: "🔶",
    interestRate: "8.75% - 10.00%",
    minRate: 8.75,
    processingFee: "0.50%",
    maxTenure: "7 years",
    maxAmount: "₹75 Lakhs",
    rating: 4.6,
    features: ["Pre-approved Offers", "Instant Disbursal", "Flexible EMI"],
    highlight: "Fastest Approval",
  },
  {
    name: "Axis Bank",
    logo: "🟣",
    interestRate: "8.99% - 10.25%",
    minRate: 8.99,
    processingFee: "0.50%",
    maxTenure: "7 years",
    maxAmount: "₹50 Lakhs",
    rating: 4.5,
    features: ["Zero Foreclosure", "Top-up Loan Available", "Online Application"],
    highlight: null,
  },
  {
    name: "Kotak Mahindra",
    logo: "🔴",
    interestRate: "8.85% - 9.75%",
    minRate: 8.85,
    processingFee: "0.50%",
    maxTenure: "5 years",
    maxAmount: "₹40 Lakhs",
    rating: 4.4,
    features: ["Quick Processing", "Easy Documentation", "Part-payment Allowed"],
    highlight: null,
  },
  {
    name: "Bank of Baroda",
    logo: "🟠",
    interestRate: "8.45% - 9.25%",
    minRate: 8.45,
    processingFee: "0.25%",
    maxTenure: "7 years",
    maxAmount: "₹50 Lakhs",
    rating: 4.3,
    features: ["Lowest Interest", "Minimal Processing Fee", "Govt. Bank Trust"],
    highlight: "Best Rate",
  },
];

const documentsList = [
  {
    category: "Identity Proof",
    icon: "🪪",
    documents: ["Aadhaar Card", "PAN Card", "Passport", "Voter ID"],
    mandatory: true,
  },
  {
    category: "Address Proof",
    icon: "🏠",
    documents: ["Aadhaar Card", "Utility Bills", "Rent Agreement", "Passport"],
    mandatory: true,
  },
  {
    category: "Income Proof (Salaried)",
    icon: "💼",
    documents: ["Last 3 months salary slips", "Last 6 months bank statement", "Form 16"],
    mandatory: true,
  },
  {
    category: "Income Proof (Self-Employed)",
    icon: "🏢",
    documents: ["Last 2 years ITR", "Business proof", "Last 6 months bank statement", "GST Registration"],
    mandatory: true,
  },
  {
    category: "Vehicle Documents",
    icon: "🚗",
    documents: ["Proforma Invoice", "Quotation from dealer", "Insurance quote"],
    mandatory: true,
  },
  {
    category: "Photographs",
    icon: "📷",
    documents: ["2 passport size photographs"],
    mandatory: true,
  },
];

const CarLoans = () => {
  const [eligibility, setEligibility] = useState({
    employmentType: "",
    monthlyIncome: "",
    age: "",
    existingEMI: "",
  });
  const [eligibilityResult, setEligibilityResult] = useState<{
    eligible: boolean;
    maxLoan: number;
    maxEMI: number;
  } | null>(null);

  const checkEligibility = () => {
    const income = parseFloat(eligibility.monthlyIncome) || 0;
    const age = parseInt(eligibility.age) || 0;
    const existingEMI = parseFloat(eligibility.existingEMI) || 0;

    if (income < 15000 || age < 21 || age > 65) {
      setEligibilityResult({ eligible: false, maxLoan: 0, maxEMI: 0 });
      return;
    }

    const maxEMI = (income - existingEMI) * 0.5;
    const maxLoan = maxEMI * 60; // Assuming 5 year tenure

    setEligibilityResult({
      eligible: maxLoan >= 100000,
      maxLoan: Math.round(maxLoan),
      maxEMI: Math.round(maxEMI),
    });
  };

  return (
    <>
      <Helmet>
        <title>Car Loan at Best Rates | Compare EMI & Apply Online | GrabYourCar</title>
        <meta
          name="description"
          content="Compare car loan rates from 15+ banks. Get instant approval starting 8.45% p.a., flexible EMI options, and up to ₹1 Crore financing. Apply online now!"
        />
      </Helmet>
      
      <div className="min-h-screen bg-background">
      <Header />

      {/* Service Banner */}
      <ServiceBanner
        highlightText="Limited Offer"
        title="Get Pre-Approved Car Loan in 30 Minutes!"
        subtitle="Lowest interest rates starting 8.45% p.a. | Zero processing fee for first 100 customers"
        variant="accent"
        showCountdown
        countdownHours={24}
      />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary via-primary/90 to-primary-dark pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center text-white">
            <Badge className="bg-white/20 text-white border-white/30 mb-4">
              Lowest Interest Rates
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Car Loan at Best Rates
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8">
              Compare offers from 15+ banks & NBFCs. Get instant approval with minimal documentation.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-accent" />
                <span>Starting 8.45% p.a.</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-accent" />
                <span>Approval in 30 mins</span>
              </div>
              <div className="flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-accent" />
                <span>Up to ₹1 Crore</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bank Comparison Table */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-3">
              <Building2 className="w-4 h-4 mr-1" />
              Compare Banks
            </Badge>
            <h2 className="text-3xl font-display font-bold text-foreground mb-3">
              Bank-wise Interest Rate Comparison
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Compare interest rates, processing fees, and features across top banks
            </p>
          </div>

          <Card className="overflow-hidden border-0 shadow-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Bank</TableHead>
                    <TableHead className="font-semibold">Interest Rate</TableHead>
                    <TableHead className="font-semibold">Processing Fee</TableHead>
                    <TableHead className="font-semibold">Max Tenure</TableHead>
                    <TableHead className="font-semibold">Max Amount</TableHead>
                    <TableHead className="font-semibold">Rating</TableHead>
                    <TableHead className="font-semibold text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankData.map((bank, index) => (
                    <TableRow key={index} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{bank.logo}</span>
                          <div>
                            <div className="font-semibold text-foreground">{bank.name}</div>
                            {bank.highlight && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                {bank.highlight}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-primary">{bank.interestRate}</span>
                      </TableCell>
                      <TableCell>{bank.processingFee}</TableCell>
                      <TableCell>{bank.maxTenure}</TableCell>
                      <TableCell>{bank.maxAmount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-accent text-accent" />
                          <span className="font-medium">{bank.rating}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" className="gap-1">
                          Apply <ArrowRight className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Bank Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {bankData.slice(0, 3).map((bank, index) => (
              <Card key={index} className="border-0 shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{bank.logo}</span>
                    <div>
                      <CardTitle className="text-lg">{bank.name}</CardTitle>
                      <p className="text-sm text-primary font-semibold">{bank.interestRate}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {bank.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-success" />
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

      {/* EMI Calculator Section */}
      <EMICalculator />

      {/* Eligibility Checker */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <Badge variant="outline" className="mb-3">
                <Calculator className="w-4 h-4 mr-1" />
                Eligibility Check
              </Badge>
              <h2 className="text-3xl font-display font-bold text-foreground mb-3">
                Check Your Loan Eligibility
              </h2>
              <p className="text-muted-foreground">
                Find out how much car loan you can get in just 2 minutes
              </p>
            </div>

            <Card className="border-0 shadow-card">
              <CardContent className="p-6 md:p-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="employment">Employment Type</Label>
                      <Select
                        value={eligibility.employmentType}
                        onValueChange={(value) =>
                          setEligibility({ ...eligibility, employmentType: value })
                        }
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select employment type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="salaried">Salaried</SelectItem>
                          <SelectItem value="self-employed">Self Employed</SelectItem>
                          <SelectItem value="business">Business Owner</SelectItem>
                          <SelectItem value="professional">Professional (Doctor, CA, etc.)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="income">Monthly Income (₹)</Label>
                      <Input
                        id="income"
                        type="number"
                        placeholder="e.g., 50000"
                        className="mt-1.5"
                        value={eligibility.monthlyIncome}
                        onChange={(e) =>
                          setEligibility({ ...eligibility, monthlyIncome: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="age">Your Age</Label>
                      <Input
                        id="age"
                        type="number"
                        placeholder="e.g., 30"
                        className="mt-1.5"
                        value={eligibility.age}
                        onChange={(e) =>
                          setEligibility({ ...eligibility, age: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="existingEMI">Existing EMI (₹)</Label>
                      <Input
                        id="existingEMI"
                        type="number"
                        placeholder="e.g., 10000"
                        className="mt-1.5"
                        value={eligibility.existingEMI}
                        onChange={(e) =>
                          setEligibility({ ...eligibility, existingEMI: e.target.value })
                        }
                      />
                    </div>

                    <Button onClick={checkEligibility} className="w-full" size="lg">
                      Check Eligibility
                    </Button>
                  </div>

                  <div className="flex items-center justify-center">
                    {eligibilityResult ? (
                      <div className="text-center p-6 rounded-2xl bg-muted/50 w-full">
                        {eligibilityResult.eligible ? (
                          <>
                            <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-foreground mb-2">
                              You're Eligible! 🎉
                            </h3>
                            <div className="space-y-3 mt-6">
                              <div className="bg-background rounded-lg p-4">
                                <p className="text-sm text-muted-foreground">Maximum Loan Amount</p>
                                <p className="text-2xl font-bold text-primary">
                                  ₹{eligibilityResult.maxLoan.toLocaleString()}
                                </p>
                              </div>
                              <div className="bg-background rounded-lg p-4">
                                <p className="text-sm text-muted-foreground">Maximum EMI Capacity</p>
                                <p className="text-xl font-bold text-foreground">
                                  ₹{eligibilityResult.maxEMI.toLocaleString()}/month
                                </p>
                              </div>
                            </div>
                            <Button className="mt-6 w-full" size="lg">
                              <Phone className="w-4 h-4 mr-2" />
                              Get Callback
                            </Button>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-foreground mb-2">
                              Not Eligible
                            </h3>
                            <p className="text-muted-foreground mb-6">
                              Based on your inputs, you may not qualify for a car loan. Try with a co-applicant or speak to our experts.
                            </p>
                            <Button variant="outline" className="w-full">
                              <Phone className="w-4 h-4 mr-2" />
                              Talk to Expert
                            </Button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-center p-8">
                        <Calculator className="w-20 h-20 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          Fill in your details to check your loan eligibility instantly
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Document Requirements */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-3">
              <FileText className="w-4 h-4 mr-1" />
              Documentation
            </Badge>
            <h2 className="text-3xl font-display font-bold text-foreground mb-3">
              Documents Required for Car Loan
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Keep these documents ready for faster loan approval
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {documentsList.map((doc, index) => (
              <Card key={index} className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{doc.icon}</span>
                    <div>
                      <CardTitle className="text-lg">{doc.category}</CardTitle>
                      {doc.mandatory && (
                        <Badge variant="destructive" className="text-xs mt-1">
                          Mandatory
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {doc.documents.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <Card className="max-w-2xl mx-auto bg-gradient-to-r from-primary to-primary-dark text-white border-0">
              <CardContent className="p-8">
                <h3 className="text-2xl font-display font-bold mb-3">
                  Need Help with Car Loan?
                </h3>
                <p className="text-white/90 mb-6">
                  Our experts will guide you through the entire loan process and help you get the best rates.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Button variant="secondary" size="lg" className="gap-2">
                    <Phone className="w-5 h-5" />
                    Call: 1800-XXX-XXXX
                  </Button>
                  <Button variant="outline" size="lg" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                    Apply Online
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </>
  );
};

export default CarLoans;
