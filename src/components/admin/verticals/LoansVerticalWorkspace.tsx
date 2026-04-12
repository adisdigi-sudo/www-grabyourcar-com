import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Banknote } from "lucide-react";
import { LoanWorkspace } from "../loans/LoanWorkspace";

export function LoansVerticalWorkspace() {
  return <LoanWorkspace initialView="pipeline" />;
  );
}
