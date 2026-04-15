import { Quote } from "lucide-react";

export const CorporateSocialProof = () => {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Quote className="h-12 w-12 text-primary/30 mx-auto mb-6" />
          
          <blockquote className="font-heading text-2xl md:text-3xl lg:text-4xl font-semibold text-foreground leading-snug mb-8">
            "From legacy institutions to fast-growing enterprises, organizations trust Grabyourcar 
            for <span className="text-primary">reliable automotive solutions</span> that scale with their business."
          </blockquote>

          <div className="flex items-center justify-center gap-2">
            <div className="h-1 w-12 bg-primary rounded-full" />
            <span className="text-muted-foreground text-sm font-medium">
              Your Trusted Automotive Partner
            </span>
            <div className="h-1 w-12 bg-primary rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
};
