import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EMIPDFConfig {
  companyName: string;
  tagline: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  founder: string;
  founderTitle: string;
  primaryColor: string;
  accentColor: string;
  partnerBanks: string[];
  disclaimer: string;
  footerCTA: string;
}

const defaultConfig: EMIPDFConfig = {
  companyName: "GRABYOURCAR",
  tagline: "India's Smarter Way to Buy New Cars",
  phone: "+91 95772 00023",
  email: "hello@grabyourcar.com",
  website: "www.grabyourcar.com",
  address: "Mumbai, Maharashtra, India",
  founder: "Anshdeep Singh",
  founderTitle: "Founder & CEO",
  primaryColor: "#22c55e",
  accentColor: "#f59e0b",
  partnerBanks: ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak", "IDFC First", "Yes Bank"],
  disclaimer: "This is an indicative estimate. Actual EMI may vary based on bank policies, credit score, and prevailing interest rates. Processing fee and pre-payment charges may apply.",
  footerCTA: "Get the Best Car Loan - Lowest Interest Rates Guaranteed!",
};

export const useEMIPDFSettings = () => {
  const [config, setConfig] = useState<EMIPDFConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .eq("setting_key", "emi_pdf_config")
        .single();

      if (data && !error) {
        const savedConfig = data.setting_value as unknown as Partial<EMIPDFConfig>;
        setConfig({ ...defaultConfig, ...savedConfig });
      }
    } catch (error) {
      console.log("Using default EMI PDF settings");
    } finally {
      setIsLoading(false);
    }
  };

  return { config, isLoading, defaultConfig };
};
