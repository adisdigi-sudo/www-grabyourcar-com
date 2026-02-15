import { useState, useMemo } from "react";
import { GlobalSEO } from "@/components/seo/GlobalSEO";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CarLoanHero } from "@/components/car-loan/CarLoanHero";
import { CarLoanEligibilityForm } from "@/components/car-loan/CarLoanEligibilityForm";
import { CarLoanBankComparison } from "@/components/car-loan/CarLoanBankComparison";
import { CarLoanEMICalculator } from "@/components/car-loan/CarLoanEMICalculator";
import { CarLoanTrustSection } from "@/components/car-loan/CarLoanTrustSection";
import { CarLoanFAQ } from "@/components/car-loan/CarLoanFAQ";
import { CarLoanCrossSell } from "@/components/car-loan/CarLoanCrossSell";
import { CrossSellWidget } from "@/components/CrossSellWidget";

const CarLoan = () => {
  const [eligibilityResult, setEligibilityResult] = useState<{
    eligible: boolean;
    maxLoan: number;
    maxEMI: number;
    creditScore?: number;
  } | null>(null);

  return (
    <>
      <GlobalSEO
        pageKey="car_loan"
        title="Car Loan Online | Instant Approval from 8.45% | GrabYourCar"
        description="Apply for car loan online. Compare rates from 15+ banks, get instant eligibility check, and same-day approval. Starting 8.45% p.a. with zero processing fee."
        path="/car-loan"
      />

      <div className="min-h-screen bg-background">
        <Header />

        {/* Hero Section */}
        <CarLoanHero />

        {/* Eligibility Form - Multi-step OTP verified */}
        <CarLoanEligibilityForm onEligibilityResult={setEligibilityResult} />

        {/* Bank Comparison */}
        <CarLoanBankComparison />

        {/* EMI Calculator */}
        <CarLoanEMICalculator />

        {/* Cross-sell (after eligibility) */}
        {eligibilityResult?.eligible && (
          <CarLoanCrossSell maxBudget={eligibilityResult.maxLoan} />
        )}

        {/* Trust & Security */}
        <CarLoanTrustSection />

        {/* FAQ */}
        <CarLoanFAQ />

        {/* Cross Sell Widget */}
        <div className="py-12 bg-muted/20">
          <div className="container mx-auto px-4">
            <CrossSellWidget context="loans" />
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
};

export default CarLoan;
