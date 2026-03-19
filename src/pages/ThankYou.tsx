import { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, ArrowRight, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackLeadConversion } from "@/lib/adTracking";
import { PHONE_NUMBER } from "@/config/contact";
import { getWhatsAppLink } from "@/config/contact";
import { Helmet } from "react-helmet-async";

const ThankYou = () => {
  const [params] = useSearchParams();
  const source = params.get("source") || "form";
  const car = params.get("car");

  useEffect(() => {
    // Fire conversion on mount — user only arrives here after successful submit
    trackLeadConversion(`thank_you_${source}`, car ? { car } : undefined);
  }, [source, car]);

  return (
    <>
      <Helmet>
        <title>Thank You | GrabYourCar</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>

          <h1 className="text-3xl font-heading font-bold text-foreground">
            Thank You! 🎉
          </h1>
          <p className="text-muted-foreground">
            {car
              ? `Your enquiry for ${car} has been received.`
              : "Your request has been received."}
            {" "}Our car expert will contact you within <strong>30 minutes</strong>.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <a href={`tel:${PHONE_NUMBER}`}>
              <Button variant="outline" className="w-full sm:w-auto gap-2">
                <Phone className="h-4 w-4" /> Call Us Now
              </Button>
            </a>
            <a href={getWhatsAppLink("Hi, I just submitted an enquiry!")} target="_blank" rel="noopener noreferrer">
              <Button variant="whatsapp" className="w-full sm:w-auto gap-2">
                <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
              </Button>
            </a>
          </div>

          <Link to="/cars">
            <Button variant="ghost" className="gap-2 mt-4">
              Browse More Cars <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
};

export default ThankYou;
