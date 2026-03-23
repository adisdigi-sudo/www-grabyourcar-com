import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminSettings } from "@/hooks/useAdminData";
import {
  getDefaultAccessoriesCatalog,
  getAccessoriesPublicCategories,
  normalizeAccessoriesCatalog,
} from "@/lib/accessoriesCatalog";

const ACCESSORIES_SETTINGS_KEY = "accessories_catalog";

export function useAccessoriesCatalog() {
  const queryClient = useQueryClient();
  const settingsQuery = useAdminSettings(ACCESSORIES_SETTINGS_KEY);

  const catalog = useMemo(() => {
    const settingValue = Array.isArray(settingsQuery.data)
      ? undefined
      : settingsQuery.data?.setting_value;
    return settingValue ? normalizeAccessoriesCatalog(settingValue) : getDefaultAccessoriesCatalog();
  }, [settingsQuery.data]);

  const categories = useMemo(() => getAccessoriesPublicCategories(catalog), [catalog]);

  useEffect(() => {
    const channel = supabase
      .channel("accessories-catalog-settings")
      .on(
        "postgres_changes",
        { event: '*', schema: 'public', table: 'admin_settings' },
        (payload) => {
          const next = payload.new as { setting_key?: string } | null;
          const prev = payload.old as { setting_key?: string } | null;
          if (next?.setting_key === ACCESSORIES_SETTINGS_KEY || prev?.setting_key === ACCESSORIES_SETTINGS_KEY) {
            queryClient.invalidateQueries({ queryKey: ["admin-settings", ACCESSORIES_SETTINGS_KEY] });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    ...settingsQuery,
    catalog,
    products: catalog.products,
    categories,
    saveCatalog: (value: unknown) => settingsQuery.updateSetting.mutateAsync({
      key: ACCESSORIES_SETTINGS_KEY,
      value,
    }),
    isSaving: settingsQuery.updateSetting.isPending,
  };
}

export { ACCESSORIES_SETTINGS_KEY };