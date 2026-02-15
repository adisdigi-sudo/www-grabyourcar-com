import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    q: "What is the minimum salary required for a car loan?",
    a: "Most banks require a minimum monthly income of ₹15,000-₹25,000 for salaried individuals. Self-employed individuals need to show an annual income of ₹2-3 lakhs. Higher income increases your loan eligibility and may get you better interest rates.",
  },
  {
    q: "Will checking eligibility affect my CIBIL score?",
    a: "No. We perform a soft credit check which does not impact your CIBIL score. A hard inquiry only happens when you formally apply for a loan with a specific bank, which you can choose to do after reviewing your options.",
  },
  {
    q: "What is the maximum car loan tenure available?",
    a: "Most banks offer car loans for up to 7 years (84 months). However, the ideal tenure depends on your financial situation. A shorter tenure means higher EMI but lower total interest paid, while a longer tenure reduces EMI but increases total cost.",
  },
  {
    q: "Can I get a car loan with a low CIBIL score?",
    a: "While a CIBIL score of 750+ gets the best rates, some of our NBFC partners offer car loans for scores as low as 650. We'll match you with the best available options based on your credit profile.",
  },
  {
    q: "What is the processing fee for car loans?",
    a: "Processing fees typically range from 0.25% to 0.50% of the loan amount. Some banks offer zero processing fee during promotional periods. GrabYourCar negotiates the best terms with our banking partners to minimize your upfront costs.",
  },
  {
    q: "How quickly can I get the loan disbursed?",
    a: "With complete documentation, most of our banking partners can disburse the loan within 24-48 hours. Pre-approved customers with existing banking relationships can get disbursement in as little as 4 hours.",
  },
  {
    q: "Can I prepay or foreclose my car loan?",
    a: "Yes, most banks allow prepayment after a minimum lock-in period (usually 6-12 months). As per RBI guidelines, floating rate loans have zero foreclosure charges. Fixed rate loans may have a small foreclosure fee.",
  },
  {
    q: "Is car insurance mandatory for a car loan?",
    a: "Yes, comprehensive car insurance is mandatory for the entire loan tenure. GrabYourCar can help you get the best insurance rates from 15+ insurers, potentially saving you thousands on premiums.",
  },
];

export const CarLoanFAQ = () => {
  return (
    <section className="py-16 md:py-20 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-3 border-primary/30">
              <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
              FAQs
            </Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground">
              Everything you need to know about car loans
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="bg-background rounded-xl border border-border/50 px-5 shadow-sm"
              >
                <AccordionTrigger className="text-left text-sm md:text-base font-semibold text-foreground hover:no-underline py-4">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
