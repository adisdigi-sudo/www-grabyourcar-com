import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AutoIntelligenceConfig {
  enabled: boolean;
  autoRefreshNews: boolean;
  newsRefreshInterval: number;
  autoGenerateBlogs: boolean;
  blogGenerationFrequency: string;
  upcomingCarsEnabled: boolean;
  newsEnabled: boolean;
  blogsEnabled: boolean;
  aiModel: string;
  newsApiSource: string;
  maxNewsItems: number;
  maxUpcomingCars: number;
  featuredContentEnabled: boolean;
  defaultBlogAuthor: string;
  seoOptimization: boolean;
  contentLanguage: string;
}

export interface FeaturedContentItem {
  id: string;
  type: "upcoming" | "news" | "blog" | "launch";
  title: string;
  subtitle: string;
  description: string;
  link: string;
  badge?: string;
  priority: number;
  isActive: boolean;
}

export interface HubSection {
  id: string;
  label: string;
  description: string;
  href: string;
  badge: string;
  isEnabled: boolean;
  sortOrder: number;
}

const defaultConfig: AutoIntelligenceConfig = {
  enabled: true,
  autoRefreshNews: true,
  newsRefreshInterval: 6,
  autoGenerateBlogs: false,
  blogGenerationFrequency: "weekly",
  upcomingCarsEnabled: true,
  newsEnabled: true,
  blogsEnabled: true,
  aiModel: "gemini-2.5-flash",
  newsApiSource: "gnews",
  maxNewsItems: 12,
  maxUpcomingCars: 10,
  featuredContentEnabled: true,
  defaultBlogAuthor: "GrabYourCar Team",
  seoOptimization: true,
  contentLanguage: "en",
};

const defaultHubSections: HubSection[] = [
  { id: "upcoming", label: "Upcoming Cars", description: "Latest car launches coming to India", href: "/upcoming-cars", badge: "AI-Powered", isEnabled: true, sortOrder: 1 },
  { id: "news", label: "Auto News", description: "Breaking automotive news & updates", href: "/auto-news", badge: "Live Feed", isEnabled: true, sortOrder: 2 },
  { id: "blogs", label: "Expert Blogs", description: "In-depth reviews, guides & tips", href: "/blog", badge: "Curated", isEnabled: true, sortOrder: 3 },
  { id: "launches", label: "New Launches", description: "Recently launched cars in India", href: "/cars?filter=new", badge: "Hot", isEnabled: true, sortOrder: 4 },
];

export function useAutoIntelligenceSettings() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["autoIntelligencePublicSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["auto_intelligence_config", "featured_content", "hub_sections"]);

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const config: AutoIntelligenceConfig = (data?.find(
    (s) => s.setting_key === "auto_intelligence_config"
  )?.setting_value as unknown as AutoIntelligenceConfig) || defaultConfig;

  const rawFeatured = data?.find(
    (s) => s.setting_key === "featured_content"
  )?.setting_value as unknown as FeaturedContentItem[] | undefined;
  const featuredContent: FeaturedContentItem[] = (rawFeatured || []).filter(item => item.isActive);

  const rawSections = data?.find(
    (s) => s.setting_key === "hub_sections"
  )?.setting_value as unknown as HubSection[] | undefined;
  const hubSections: HubSection[] = (rawSections || defaultHubSections)
    .filter(section => section.isEnabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    config,
    featuredContent,
    hubSections,
    isLoading,
    error,
    isHubEnabled: config.enabled,
  };
}
