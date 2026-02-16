import { Button } from "@/components/ui/button";
import { FileDown, FileText } from "lucide-react";
import { generateCorporateBrochure } from "@/lib/generateCorporateBrochure";
import { toast } from "sonner";

export const CorporateBrochureDownload = () => {
  const handleDownload = () => {
    try {
      generateCorporateBrochure();
      toast.success("Brochure downloaded!", {
        description: "Check your downloads folder for the PDF.",
      });
    } catch (error) {
      toast.error("Failed to generate brochure. Please try again.");
    }
  };

  return (
    <section className="py-12 md:py-16 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <FileText className="h-8 w-8 text-primary" />
          </div>

          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3">
            Download Corporate Brochure
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Get detailed information about our fleet solutions, pricing packages, 
            and popular corporate vehicle models in a comprehensive PDF.
          </p>

          <Button
            onClick={handleDownload}
            variant="cta"
            size="lg"
            className="gap-2"
          >
            <FileDown className="h-5 w-5" />
            Download PDF Brochure
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            PDF • 9 Pages • Complete Corporate Fleet Solutions
          </p>
        </div>
      </div>
    </section>
  );
};
