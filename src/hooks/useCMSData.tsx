import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

// Query keys for CMS data
export const CMS_QUERY_KEYS = {
  siteSettings: 'cms-site-settings',
  navMenu: 'cms-nav-menu',
  homepageSections: 'cms-homepage-sections',
  banners: 'cms-banners',
  testimonials: 'cms-testimonials',
  faqs: 'cms-faqs',
  servicePricing: 'cms-service-pricing',
  insurancePartners: 'cms-insurance-partners',
  financePartners: 'cms-finance-partners',
  pages: 'cms-pages',
} as const;

// ================== SITE SETTINGS ==================
export function useSiteSettings(category?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [CMS_QUERY_KEYS.siteSettings, category],
    queryFn: async () => {
      let q = supabase.from('site_settings').select('*').order('sort_order');
      if (category) q = q.eq('category', category);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60,
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('site-settings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
        queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.siteSettings] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from('site_settings')
        .update({ setting_value: JSON.stringify(value), updated_at: new Date().toISOString() })
        .eq('setting_key', key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.siteSettings] });
      toast.success('Setting updated!');
    },
    onError: () => toast.error('Failed to update setting'),
  });

  const upsertSetting = useMutation({
    mutationFn: async ({ key, value, category, label, fieldType }: { 
      key: string; value: any; category?: string; label?: string; fieldType?: string 
    }) => {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          setting_key: key,
          setting_value: JSON.stringify(value),
          category: category || 'general',
          label: label || key,
          field_type: fieldType || 'text',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'setting_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.siteSettings] });
      toast.success('Setting saved!');
    },
    onError: () => toast.error('Failed to save setting'),
  });

  // Helper to get setting value
  const getSetting = (key: string): any => {
    const setting = query.data?.find(s => s.setting_key === key);
    if (!setting) return null;
    try {
      return JSON.parse(setting.setting_value as string);
    } catch {
      return setting.setting_value;
    }
  };

  return { ...query, updateSetting, upsertSetting, getSetting };
}

// ================== NAVIGATION MENU ==================
export function useNavMenu(location?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [CMS_QUERY_KEYS.navMenu, location],
    queryFn: async () => {
      let q = supabase.from('navigation_menu').select('*').order('sort_order');
      if (location) q = q.eq('menu_location', location);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    const channel = supabase
      .channel('nav-menu-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'navigation_menu' }, () => {
        queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.navMenu] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const saveMutation = useMutation({
    mutationFn: async (item: any) => {
      if (item.id) {
        const { error } = await supabase.from('navigation_menu').update(item).eq('id', item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('navigation_menu').insert(item);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.navMenu] });
      toast.success('Menu item saved!');
    },
    onError: () => toast.error('Failed to save menu item'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('navigation_menu').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.navMenu] });
      toast.success('Menu item deleted!');
    },
    onError: () => toast.error('Failed to delete menu item'),
  });

  return { ...query, saveMutation, deleteMutation };
}

// ================== HOMEPAGE SECTIONS ==================
export function useHomepageSections() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [CMS_QUERY_KEYS.homepageSections],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homepage_sections')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    const channel = supabase
      .channel('homepage-sections-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homepage_sections' }, () => {
        queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.homepageSections] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const saveMutation = useMutation({
    mutationFn: async (section: any) => {
      if (section.id) {
        const { error } = await supabase.from('homepage_sections').update(section).eq('id', section.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('homepage_sections').insert(section);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.homepageSections] });
      toast.success('Section updated!');
    },
    onError: () => toast.error('Failed to save section'),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('homepage_sections').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.homepageSections] });
      toast.success('Section visibility updated!');
    },
  });

  const reorder = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => 
        supabase.from('homepage_sections').update({ sort_order: index + 1 }).eq('id', id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.homepageSections] });
      toast.success('Section order updated!');
    },
  });

  return { ...query, saveMutation, toggleActive, reorder };
}

// ================== BANNERS ==================
export function useBanners(position?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [CMS_QUERY_KEYS.banners, position],
    queryFn: async () => {
      let q = supabase.from('banners').select('*').order('sort_order');
      if (position) q = q.eq('position', position);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    const channel = supabase
      .channel('banners-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, () => {
        queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.banners] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const saveMutation = useMutation({
    mutationFn: async (banner: any) => {
      if (banner.id) {
        const { error } = await supabase.from('banners').update(banner).eq('id', banner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('banners').insert(banner);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.banners] });
      toast.success('Banner saved!');
    },
    onError: () => toast.error('Failed to save banner'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('banners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.banners] });
      toast.success('Banner deleted!');
    },
    onError: () => toast.error('Failed to delete banner'),
  });

  return { ...query, saveMutation, deleteMutation };
}

// ================== TESTIMONIALS ==================
export function useTestimonials() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [CMS_QUERY_KEYS.testimonials],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    const channel = supabase
      .channel('testimonials-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'testimonials' }, () => {
        queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.testimonials] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const saveMutation = useMutation({
    mutationFn: async (testimonial: any) => {
      if (testimonial.id) {
        const { error } = await supabase.from('testimonials').update(testimonial).eq('id', testimonial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('testimonials').insert(testimonial);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.testimonials] });
      toast.success('Testimonial saved!');
    },
    onError: () => toast.error('Failed to save testimonial'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('testimonials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.testimonials] });
      toast.success('Testimonial deleted!');
    },
    onError: () => toast.error('Failed to delete testimonial'),
  });

  return { ...query, saveMutation, deleteMutation };
}

// ================== FAQS ==================
export function useFAQs(category?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [CMS_QUERY_KEYS.faqs, category],
    queryFn: async () => {
      let q = supabase.from('faqs').select('*').order('sort_order');
      if (category) q = q.eq('category', category);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    const channel = supabase
      .channel('faqs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'faqs' }, () => {
        queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.faqs] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const saveMutation = useMutation({
    mutationFn: async (faq: any) => {
      if (faq.id) {
        const { error } = await supabase.from('faqs').update(faq).eq('id', faq.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('faqs').insert(faq);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.faqs] });
      toast.success('FAQ saved!');
    },
    onError: () => toast.error('Failed to save FAQ'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('faqs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.faqs] });
      toast.success('FAQ deleted!');
    },
    onError: () => toast.error('Failed to delete FAQ'),
  });

  return { ...query, saveMutation, deleteMutation };
}

// ================== SERVICE PRICING ==================
export function useServicePricing(serviceType?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [CMS_QUERY_KEYS.servicePricing, serviceType],
    queryFn: async () => {
      let q = supabase.from('service_pricing').select('*').order('sort_order');
      if (serviceType) q = q.eq('service_type', serviceType);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    const channel = supabase
      .channel('service-pricing-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_pricing' }, () => {
        queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.servicePricing] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const saveMutation = useMutation({
    mutationFn: async (pricing: any) => {
      // Auto-calculate final price
      const finalPrice = pricing.base_price * (1 + (pricing.gst_rate || 18) / 100) - (pricing.discount_amount || 0);
      const data = { ...pricing, final_price: finalPrice };
      
      if (pricing.id) {
        const { error } = await supabase.from('service_pricing').update(data).eq('id', pricing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('service_pricing').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.servicePricing] });
      toast.success('Pricing saved!');
    },
    onError: () => toast.error('Failed to save pricing'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('service_pricing').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.servicePricing] });
      toast.success('Pricing deleted!');
    },
    onError: () => toast.error('Failed to delete pricing'),
  });

  return { ...query, saveMutation, deleteMutation };
}

// ================== INSURANCE PARTNERS ==================
export function useInsurancePartners() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [CMS_QUERY_KEYS.insurancePartners],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_partners')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    const channel = supabase
      .channel('insurance-partners-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insurance_partners' }, () => {
        queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.insurancePartners] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const saveMutation = useMutation({
    mutationFn: async (partner: any) => {
      if (partner.id) {
        const { error } = await supabase.from('insurance_partners').update(partner).eq('id', partner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('insurance_partners').insert(partner);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.insurancePartners] });
      toast.success('Insurance partner saved!');
    },
    onError: () => toast.error('Failed to save partner'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('insurance_partners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.insurancePartners] });
      toast.success('Partner deleted!');
    },
    onError: () => toast.error('Failed to delete partner'),
  });

  return { ...query, saveMutation, deleteMutation };
}

// ================== FINANCE PARTNERS ==================
export function useFinancePartners() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [CMS_QUERY_KEYS.financePartners],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_partners')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    const channel = supabase
      .channel('finance-partners-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_partners' }, () => {
        queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.financePartners] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const saveMutation = useMutation({
    mutationFn: async (partner: any) => {
      if (partner.id) {
        const { error } = await supabase.from('finance_partners').update(partner).eq('id', partner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('finance_partners').insert(partner);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.financePartners] });
      toast.success('Finance partner saved!');
    },
    onError: () => toast.error('Failed to save partner'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('finance_partners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.financePartners] });
      toast.success('Partner deleted!');
    },
    onError: () => toast.error('Failed to delete partner'),
  });

  return { ...query, saveMutation, deleteMutation };
}

// ================== STATIC PAGES ==================
export function usePages() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [CMS_QUERY_KEYS.pages],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('title');
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    const channel = supabase
      .channel('pages-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, () => {
        queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.pages] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const saveMutation = useMutation({
    mutationFn: async (page: any) => {
      if (page.id) {
        const { error } = await supabase.from('pages').update(page).eq('id', page.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pages').insert(page);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.pages] });
      toast.success('Page saved!');
    },
    onError: () => toast.error('Failed to save page'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEYS.pages] });
      toast.success('Page deleted!');
    },
    onError: () => toast.error('Failed to delete page'),
  });

  return { ...query, saveMutation, deleteMutation };
}
