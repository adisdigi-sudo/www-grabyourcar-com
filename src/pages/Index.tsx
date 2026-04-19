import { useState, lazy, Suspense } from "react";
import { GlobalSEO } from "@/components/seo/GlobalSEO";
import { Header } from "@/components/Header";
import { RivianHero } from "@/components/RivianHero";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
const HomeDeferredSections = lazy(() => import("@/components/home/HomeDeferredSections"));

const SectionSkeleton = ({ label }: { label: string }) => (
  <div className="flex min-h-[120px] items-center justify-center text-sm text-muted-foreground">
    {label}
  </div>
);

const Index = () => {
  const [loanPrefill, setLoanPrefill] = useState<string>("");

  const handleGetLoanQuote = (loanDetails: string) => {
    setLoanPrefill(loanDetails);
    document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <SectionErrorBoundary sectionName="global-seo" fallback={null}>
        <GlobalSEO
          pageKey="home"
          title="GrabYourCar — Buy New Cars at Best Price in India | Delhi, Mumbai, Bangalore, Hyderabad, Chennai, Pune, Kolkata, Ahmedabad, Jaipur, Lucknow"
          description="India's most trusted new car buying platform. Compare prices across 50+ brands including Maruti Suzuki, Hyundai, Tata Motors, Mahindra, Kia, Toyota. Get on-road price quotes, zero waiting period delivery, best car loan rates starting 8.5%, comprehensive car insurance deals. Serving Delhi NCR, Mumbai, Bangalore, Hyderabad, Chennai, Pune, Kolkata, Ahmedabad, Jaipur & Lucknow. 500+ happy customers. Free doorstep delivery. Call +91 98559 24442 for best deals."
          path="/"
          keywords="buy new car online India, new car best price Delhi, new car best price Mumbai, new car best price Bangalore, car deals near me, on-road price calculator, zero waiting period cars, car loan EMI calculator, car insurance online, Maruti Suzuki price, Hyundai Creta on-road price, Tata Nexon price, Mahindra XUV700 price, Kia Seltos price, best car deals 2025, new car offers today, car comparison tool India, corporate car buying"
          faqItems={[
            { question: "How to buy a new car at the best price in India?", answer: "GrabYourCar compares prices from 500+ authorized dealers across India to get you the lowest on-road price. We negotiate exclusive discounts, zero waiting period deals, and provide free doorstep delivery. Call +91 98559 24442 or WhatsApp us for instant quotes." },
            { question: "Which cities does GrabYourCar serve?", answer: "GrabYourCar serves all major cities in India including Delhi NCR (Delhi, Gurugram, Noida, Faridabad), Mumbai, Bangalore, Hyderabad, Chennai, Pune, Kolkata, Ahmedabad, Jaipur, and Lucknow with doorstep delivery." },
            { question: "What car brands are available on GrabYourCar?", answer: "GrabYourCar offers new cars from 50+ brands including Maruti Suzuki, Hyundai, Tata Motors, Mahindra, Kia, Toyota, Honda, MG, Skoda, Volkswagen, BMW, Mercedes-Benz, Audi, and more." },
            { question: "Does GrabYourCar provide car loans and insurance?", answer: "Yes! GrabYourCar provides car loans starting at 8.5% from top banks, along with comprehensive car insurance from 15+ leading insurers like HDFC ERGO, ICICI Lombard, Bajaj Allianz." },
            { question: "How does zero waiting period work at GrabYourCar?", answer: "GrabYourCar maintains relationships with 500+ authorized dealers and tracks real-time inventory to source popular models with significantly reduced or zero waiting periods." }
          ]}
        />
      </SectionErrorBoundary>

      <div className="min-h-screen bg-background">
        <SectionErrorBoundary sectionName="header" fallback={null}>
          <Header />
        </SectionErrorBoundary>

        <main>
          <SectionErrorBoundary sectionName="hero">
            <RivianHero />
          </SectionErrorBoundary>

          <Suspense fallback={<SectionSkeleton label="Loading homepage sections..." />}>
            <HomeDeferredSections loanPrefill={loanPrefill} onGetLoanQuote={handleGetLoanQuote} />
          </Suspense>
        </main>
      </div>
    </>
  );
};

export default Index;
