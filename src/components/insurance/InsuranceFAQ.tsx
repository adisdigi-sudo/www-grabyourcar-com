import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is the difference between Third Party and Comprehensive car insurance?",
    answer: "Third Party insurance is mandatory by law and covers damages you cause to others (their vehicle, property, or injuries). Comprehensive insurance includes Third Party coverage PLUS protection for your own car against accidents, theft, fire, natural disasters, and more. We recommend Comprehensive for complete peace of mind.",
  },
  {
    question: "What is IDV (Insured Declared Value)?",
    answer: "IDV is the current market value of your car and represents the maximum amount you can claim if your car is stolen or totally damaged. It's calculated as the manufacturer's selling price minus depreciation based on your car's age. A higher IDV means higher premium but better coverage.",
  },
  {
    question: "What is No Claim Bonus (NCB)?",
    answer: "NCB is a discount you earn for every claim-free year. It starts at 20% for the first year and can go up to 50% for 5+ consecutive claim-free years. NCB is linked to you, not your car, so you can transfer it when you buy a new vehicle.",
  },
  {
    question: "What are add-on covers and do I need them?",
    answer: "Add-on covers provide extra protection beyond your basic policy. Popular add-ons include Zero Depreciation (full claim without deductions), Engine Protection, Roadside Assistance, and Key Replacement. We recommend Zero Depreciation for cars less than 5 years old.",
  },
  {
    question: "How do I file a car insurance claim?",
    answer: "For cashless claims: Drive to a network garage, show your policy, and the insurer settles the bill directly. For reimbursement claims: Pay the garage, collect all bills, submit them online or via the insurer's app, and get reimbursed in 7-10 days. Always inform your insurer within 24 hours of an incident.",
  },
  {
    question: "Can I transfer my car insurance to a new owner?",
    answer: "Yes, car insurance can be transferred to a new owner within 14 days of the sale. The new owner needs to submit the transfer application along with the sale deed and RC transfer documents. NCB, however, stays with the original policyholder.",
  },
  {
    question: "What documents do I need to buy car insurance?",
    answer: "For new car insurance: RC (Registration Certificate), Invoice, PAN/Aadhaar. For renewal: Previous policy copy, RC, and NOC if applicable. The entire process is online and takes just 2 minutes.",
  },
];

export function InsuranceFAQ() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,hsl(var(--muted)/0.5),transparent)]" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <h2 className="text-3xl md:text-5xl font-heading font-bold mb-4">
            Frequently asked <span className="text-primary">questions</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about car insurance
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border/60 rounded-2xl px-7 data-[state=open]:shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.08)] data-[state=open]:border-primary/20 transition-all duration-300"
              >
                <AccordionTrigger className="text-left hover:no-underline py-6">
                  <span className="font-semibold text-base pr-4">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6 leading-relaxed text-[15px]">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
