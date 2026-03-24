import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ShopRocketEmbedProps {
  /** Override the store ID from admin_settings */
  storeId?: string;
  /** Type of embed: full store, buy button, or cart only */
  embedType?: "store" | "buy-button" | "cart";
  /** Optional product ID for buy-button embed */
  productId?: string;
  className?: string;
}

export function ShopRocketEmbed({
  storeId: propStoreId,
  embedType = "store",
  productId,
  className = "",
}: ShopRocketEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [resolvedStoreId, setResolvedStoreId] = useState(propStoreId || "");
  const [loading, setLoading] = useState(!propStoreId);

  // Fetch store ID from admin_settings if not provided
  useEffect(() => {
    if (propStoreId) return;
    (async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "shoprocket_store_id")
        .maybeSingle();
      if (data?.setting_value) {
        const val = typeof data.setting_value === "string"
          ? data.setting_value
          : (data.setting_value as any)?.value ?? "";
        setResolvedStoreId(val);
      }
      setLoading(false);
    })();
  }, [propStoreId]);

  // Load ShopRocket script when we have a store ID
  useEffect(() => {
    if (!resolvedStoreId) return;

    // Avoid loading the script twice
    const existingScript = document.querySelector(
      'script[src*="shoprocket.io"]'
    );
    if (existingScript) return;

    const script = document.createElement("script");
    script.src = "https://cdn.shoprocket.io/loader.js";
    script.async = true;
    script.setAttribute("data-sr-storeid", resolvedStoreId);
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount is tricky with ShopRocket – leave the script in place
    };
  }, [resolvedStoreId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!resolvedStoreId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">
          ShopRocket store not configured. Set your Store ID in{" "}
          <span className="font-medium text-foreground">
            Accessories → Settings → ShopRocket
          </span>
        </p>
      </div>
    );
  }

  // Render ShopRocket embed divs
  if (embedType === "store") {
    return (
      <div className={className} ref={containerRef}>
        <div
          className="shoprocket-store"
          data-sr-storeid={resolvedStoreId}
        />
      </div>
    );
  }

  if (embedType === "buy-button" && productId) {
    return (
      <div className={className} ref={containerRef}>
        <div
          className="shoprocket-product"
          data-sr-storeid={resolvedStoreId}
          data-sr-product-id={productId}
        />
      </div>
    );
  }

  return null;
}
