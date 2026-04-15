import { ReactNode, useEffect, useState } from "react";
import { CartProvider } from "@/hooks/useCart";
import { CompareProvider } from "@/hooks/useCompare";
import { useGlobalRealtimeSync } from "@/hooks/useRealtimeSync";
import { VerticalProvider } from "@/hooks/useVerticalAccess";

const PublicRealtimeSyncProvider = ({ children }: { children: ReactNode }) => {
  const [isRealtimeReady, setIsRealtimeReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsRealtimeReady(true);
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useGlobalRealtimeSync(isRealtimeReady);
  return <>{children}</>;
};

interface RouteProviderGateProps {
  children: ReactNode;
  isAdminExperience: boolean;
  requiresWorkspaceProviders?: boolean;
}

export const RouteProviderGate = ({
  children,
  isAdminExperience,
  requiresWorkspaceProviders = true,
}: RouteProviderGateProps) => {
  if (isAdminExperience) {
    return requiresWorkspaceProviders ? <VerticalProvider>{children}</VerticalProvider> : <>{children}</>;
  }

  return (
    <CartProvider>
      <CompareProvider>
        <PublicRealtimeSyncProvider>{children}</PublicRealtimeSyncProvider>
      </CompareProvider>
    </CartProvider>
  );
};