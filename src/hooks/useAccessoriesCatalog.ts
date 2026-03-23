import { useMemo } from "react";
import { useAdminSettings } from "@/hooks/useAdminData";
import {
  getDefaultAccessoriesCatalog,
  getAccessoriesPublicCategories,
  normalizeAccessoriesCatalog,
} from "@/lib/accessoriesCatalog";

const ACCESSORIES_SETTINGS_KEY = "accessories_catalog";

export function useAccessoriesCatalog() {
  const settingsQuery = useAdminSettings(ACCESSORIES_SETTINGS_KEY);

  const catalog = useMemo(() => {
    const settingValue = settingsQuery.data?.setting_value;
    return settingValue ? normalizeAccessoriesCatalog(settingValue) : getDefaultAccessoriesCatalog();
  }, [settingsQuery.data]);

  const categories = useMemo(() => getAccessoriesPublicCategories(catalog), [catalog]);

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