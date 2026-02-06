import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

// Query keys for admin data - centralized for easy invalidation
export const ADMIN_QUERY_KEYS = {
  dashboard: 'adminDashboardStats',
  leads: 'admin-leads',
  cars: 'admin-cars',
  carDetails: 'admin-car-details',
  homepageContent: 'homepageContent',
  blogPosts: 'ai-blog-posts',
  newsCache: 'ai-news-cache',
  upcomingCars: 'ai-upcoming-cars',
  hsrpBookings: 'hsrp-bookings',
  rentalBookings: 'rental-bookings',
  accessoryOrders: 'accessory-orders',
  inquiries: 'inquiries',
  settings: 'admin-settings',
  carColors: 'car-colors',
  carVariants: 'car-variants',
  carSpecs: 'car-specifications',
  carImages: 'car-images',
  cityPricing: 'city-pricing',
  states: 'indian-states',
  cities: 'indian-cities',
} as const;

// Hook to invalidate all admin data
export function useInvalidateAdminData() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    Object.values(ADMIN_QUERY_KEYS).forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  };

  const invalidate = (keys: (keyof typeof ADMIN_QUERY_KEYS)[]) => {
    keys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEYS[key]] });
    });
  };

  return { invalidateAll, invalidate };
}

// Hook for admin settings with auto-refresh
export function useAdminSettings(settingKey?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [ADMIN_QUERY_KEYS.settings, settingKey],
    queryFn: async () => {
      if (settingKey) {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('*')
          .eq('setting_key', settingKey)
          .maybeSingle();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('*');
        if (error) throw error;
        return data;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          setting_key: key,
          setting_value: value,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'setting_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEYS.settings] });
      toast.success('Settings saved!');
    },
    onError: (error) => {
      toast.error('Failed to save settings');
      console.error(error);
    },
  });

  return { ...query, updateSetting };
}

// Hook for cars list with real-time updates
export function useAdminCars(options?: { brand?: string; limit?: number }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [ADMIN_QUERY_KEYS.cars, options],
    queryFn: async () => {
      let q = supabase
        .from('cars')
        .select('*')
        .order('brand')
        .order('name');
      
      if (options?.brand) {
        q = q.eq('brand', options.brand);
      }
      if (options?.limit) {
        q = q.limit(options.limit);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-cars-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cars' },
        () => {
          queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEYS.cars] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

// Hook for leads with real-time updates
export function useAdminLeads(options?: { status?: string; limit?: number }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [ADMIN_QUERY_KEYS.leads, options],
    queryFn: async () => {
      let q = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (options?.status) {
        q = q.eq('status', options.status);
      }
      if (options?.limit) {
        q = q.limit(options.limit);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 10, // 10 seconds - leads update frequently
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-leads-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => {
          queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEYS.leads] });
          queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEYS.dashboard] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

// Hook for homepage content with auto-refresh
export function useAdminHomepageContent() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [ADMIN_QUERY_KEYS.homepageContent],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homepage_content')
        .select('*')
        .order('section_type')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
  });

  const saveMutation = useMutation({
    mutationFn: async (content: any) => {
      if (content.id) {
        const { error } = await supabase
          .from('homepage_content')
          .update(content)
          .eq('id', content.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('homepage_content')
          .insert(content);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEYS.homepageContent] });
      toast.success('Content saved - changes are live!');
    },
    onError: (error) => {
      toast.error('Failed to save content');
      console.error(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('homepage_content')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEYS.homepageContent] });
      toast.success('Content deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete content');
      console.error(error);
    },
  });

  return { ...query, saveMutation, deleteMutation };
}

// Hook for AI blog posts
export function useAdminBlogPosts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [ADMIN_QUERY_KEYS.blogPosts],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_blog_posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
  });

  const generateBlog = useMutation({
    mutationFn: async ({ topic, category }: { topic: string; category: string }) => {
      const { data, error } = await supabase.functions.invoke('generate-blog', {
        body: { topic, category, saveToDraft: true },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEYS.blogPosts] });
      toast.success('Blog generated and saved as draft!');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to generate blog');
    },
  });

  const updatePost = useMutation({
    mutationFn: async (post: any) => {
      const { error } = await supabase
        .from('ai_blog_posts')
        .update({ ...post, updated_at: new Date().toISOString() })
        .eq('id', post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEYS.blogPosts] });
      toast.success('Post updated!');
    },
    onError: (error) => {
      toast.error('Failed to update post');
      console.error(error);
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_blog_posts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEYS.blogPosts] });
      toast.success('Post deleted!');
    },
    onError: (error) => {
      toast.error('Failed to delete post');
      console.error(error);
    },
  });

  return { ...query, generateBlog, updatePost, deletePost };
}

// Hook for AI car enhancement
export function useAICarEnhancement() {
  const queryClient = useQueryClient();

  const enhanceCar = useMutation({
    mutationFn: async ({ carId, enhanceType }: { carId: string; enhanceType: string }) => {
      const { data, error } = await supabase.functions.invoke('enhance-car-data', {
        body: { carId, enhanceType },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Enhancement failed');
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEYS.cars] });
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEYS.carDetails, variables.carId] });
      toast.success('Car data enhanced with AI!');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'AI enhancement failed');
    },
  });

  return { enhanceCar };
}

// Hook for refreshing AI news
export function useAdminAINews() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [ADMIN_QUERY_KEYS.newsCache],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_news_cache')
        .select('*')
        .eq('status', 'active')
        .order('fetched_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const refreshNews = useMutation({
    mutationFn: async (category?: string) => {
      const { data, error } = await supabase.functions.invoke('auto-news', {
        body: { category: category || 'all', forceRefresh: true },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEYS.newsCache] });
      toast.success('News refreshed with latest updates!');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to refresh news');
    },
  });

  return { ...query, refreshNews };
}

// Generic mutation wrapper with auto-invalidation
export function useAdminMutation<T, V>(
  mutationFn: (variables: V) => Promise<T>,
  invalidateKeys: (keyof typeof ADMIN_QUERY_KEYS)[],
  successMessage?: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      invalidateKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEYS[key]] });
      });
      if (successMessage) {
        toast.success(successMessage);
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Operation failed');
      console.error(error);
    },
  });
}
