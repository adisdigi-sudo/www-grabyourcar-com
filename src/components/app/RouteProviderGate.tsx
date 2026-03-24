import { ReactNode } from "react";
import { CartProvider } from "@/hooks/useCart";
import { CompareProvider } from "@/hooks/useCompare";
import { useGlobalRealtimeSync } from "@/hooks/useRealtimeSync";
import { VerticalProvider } from "@/hooks/useVerticalAccess";

const PublicRealtimeSyncProvider = ({ children }: { children: ReactNode }) => {
  useGlobalRealtimeSync();
  return <>{children}</>;
};

interface RouteProviderGateProps {
  children: ReactNode;
  isAdminExperience: boolean;
}

export const RouteProviderGate = ({ children, isAdminExperience }: RouteProviderGateProps) => {
  if (isAdminExperience) {
    return <VerticalProvider>{children}</VerticalProvider>;
  }

  return (
    <CartProvider>
      <CompareProvider>
        <PublicRealtimeSyncProvider>{children}</PublicRealtimeSyncProvider>
      </CompareProvider>
    </CartProvider>
  );
};