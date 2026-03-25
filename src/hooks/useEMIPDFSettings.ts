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
  termsAndConditions: string[];
  validityDays: number;
  footerCTA: string;
  defaultDownPaymentPercent: number;
  defaultInterestRate: number;
  defaultTenure: number;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    youtube?: string;
    linkedin?: string;
  };
}

const defaultConfig: EMIPDFConfig = {
  companyName: "GRABYOURCAR",
  tagline: "India's Smarter Way to Buy New Cars",
  phone: "+91 98559 24442",
  email: "hello@grabyourcar.com",
  website: "www.grabyourcar.com",
  address: "MS 228, 2nd Floor, DT Mega Mall, Sector 28, Gurugram, Haryana – 122001",
  founder: "Anshdeep Singh",
  founderTitle: "Founder & CEO",
  primaryColor: "#22c55e",
  accentColor: "#f59e0b",
  partnerBanks: ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak", "IDFC First", "Yes Bank"],
  disclaimer: "This offer is valid for 7 days from the date of quotation. Ex-Showroom price is subject to change before billing as per manufacturer revision. Insurance and financing are arranged in-house by Grabyourcar.",
  termsAndConditions: [
    "This offer is valid for 7 days from the date of quotation.",
    "Ex-Showroom price is subject to change before billing as per manufacturer revision.",
    "Insurance and financing are arranged in-house by Grabyourcar.",
    "Processing fees and other bank charges may apply as per financing institution.",
  ],
  validityDays: 7,
  footerCTA: "Get the Best Car Loan - Lowest Interest Rates Guaranteed!",
  defaultDownPaymentPercent: 20,
  defaultInterestRate: 8.5,
  defaultTenure: 60,
  socialLinks: {
    instagram: "@grabyourcar",
    facebook: "grabyourcar",
    youtube: "GrabYourCar",
    twitter: "@grabyourcar",
    linkedin: "grabyourcar",
  },
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
        .maybeSingle();

      if (data && !error) {
        const savedConfig = data.setting_value as unknown as Partial<EMIPDFConfig>;
        setConfig({ ...defaultConfig, ...savedConfig });
      }
      // If no data found, use defaults silently
    } catch (error) {
      // Use default settings on any error
    } finally {
      setIsLoading(false);
    }
  };

  return { config, isLoading, defaultConfig };
};
