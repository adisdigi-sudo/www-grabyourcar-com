import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

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
    <section className="py-12 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge className="mb-4" variant="secondary">
            <HelpCircle className="h-3 w-3 mr-1" />
            FAQs
          </Badge>
          <h2 className="text-2xl md:text-3xl font-heading font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground">
            Everything you need to know about car insurance
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border rounded-xl px-6 data-[state=open]:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left hover:no-underline py-5">
                  <span className="font-medium pr-4">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
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
