import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "What is the minimum order quantity for corporate fleet discounts?",
    answer: "Our corporate fleet programs start from 5 vehicles. For orders of 5-10 vehicles, you get up to 5% discount. Orders of 11-25 vehicles receive up to 10% discount, and for 25+ vehicles, discounts can go up to 15%. Contact us for custom quotes on larger fleet requirements.",
  },
  {
    question: "How long does the corporate fleet procurement process take?",
    answer: "Typically, the entire process from initial inquiry to delivery takes 15-45 days depending on vehicle availability and documentation requirements. With our priority allocation for corporate clients, we can significantly reduce waiting periods compared to retail purchases.",
  },
  {
    question: "Do you offer financing options for corporate fleet purchases?",
    answer: "Yes, we partner with leading banks and NBFCs to offer flexible corporate financing solutions. Options include EMI-based financing, lease-to-own arrangements, and operating leases. We can customize payment terms based on your organization's requirements and cash flow preferences.",
  },
  {
    question: "Can you deliver vehicles to multiple locations across India?",
    answer: "Absolutely. We have a pan-India dealer network covering 100+ cities. We specialize in coordinated multi-location fleet deployments and have successfully delivered vehicles across multiple sites simultaneously for our corporate clients.",
  },
  {
    question: "What documentation is required for corporate purchases?",
    answer: "Standard requirements include company registration documents (GST certificate, PAN, incorporation certificate), board resolution or authorized signatory letter, and KYC documents of authorized signatories. Our dedicated team handles all paperwork and provides GST-compliant invoicing.",
  },
  {
    question: "Do you provide after-sales support for corporate fleet?",
    answer: "Yes, corporate clients receive priority after-sales support including dedicated service scheduling, periodic maintenance reminders, extended warranty options, and assistance with insurance claims. We also offer annual maintenance contracts for fleet vehicles.",
  },
  {
    question: "Can we get vehicles with custom configurations or branding?",
    answer: "Yes, we can coordinate with manufacturers for certain customizations like specific color requirements, accessory fitments, or minor modifications. For fleet branding (logos, graphics), we can connect you with our authorized partners who specialize in vehicle branding.",
  },
  {
    question: "What brands and vehicle types are available for corporate fleets?",
    answer: "We offer vehicles from all major manufacturers including Maruti Suzuki, Hyundai, Tata, Mahindra, Toyota, Kia, MG, Honda, Skoda, and Volkswagen. Vehicle types range from hatchbacks and sedans to SUVs and MUVs, covering all corporate requirements from executive cars to utility vehicles.",
  },
];

export const CorporateFAQ = () => {
  return (
    <section className="py-16 md:py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 md:mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground">
              Common questions about corporate fleet procurement
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border/50 rounded-xl px-6 data-[state=open]:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left font-medium text-foreground hover:text-primary hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-10 text-center">
            <p className="text-muted-foreground text-sm">
              Have more questions?{" "}
              <a
                href="tel:+919855924442"
                className="text-primary font-medium hover:underline"
              >
                Call us at +91 98559 24442
              </a>{" "}
              or{" "}
              <a
                href="mailto:corporate@grabyourcar.com"
                className="text-primary font-medium hover:underline"
              >
                email our corporate team
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
