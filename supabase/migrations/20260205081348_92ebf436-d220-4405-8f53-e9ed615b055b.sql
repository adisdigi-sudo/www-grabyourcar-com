-- AI Content Hub Tables for Automobile Intelligence Section

-- Table for AI-generated blog posts (admin-editable)
CREATE TABLE public.ai_blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'guide',
  tags TEXT[] DEFAULT '{}',
  author TEXT NOT NULL DEFAULT 'GrabYourCar Expert',
  cover_image_url TEXT,
  cover_image_description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_ai_generated BOOLEAN DEFAULT true,
  ai_model TEXT,
  seo_title TEXT,
  seo_description TEXT,
  read_time TEXT DEFAULT '5 min read',
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  updated_by UUID
);

-- Table for cached AI news articles (refreshed periodically)
CREATE TABLE public.ai_news_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  category TEXT NOT NULL,
  source TEXT,
  source_url TEXT,
  author TEXT,
  tags TEXT[] DEFAULT '{}',
  image_url TEXT,
  image_description TEXT,
  is_featured BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'archived')),
  read_time TEXT DEFAULT '3 min read',
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for cached upcoming cars (refreshed periodically)
CREATE TABLE public.ai_upcoming_cars_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  expected_price TEXT,
  launch_date TEXT,
  segment TEXT,
  highlights TEXT[] DEFAULT '{}',
  image_url TEXT,
  image_description TEXT,
  is_featured BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'archived')),
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_news_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_upcoming_cars_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_blog_posts
CREATE POLICY "Anyone can view published blog posts" 
ON public.ai_blog_posts 
FOR SELECT 
USING (status = 'published');

CREATE POLICY "Admins can manage all blog posts" 
ON public.ai_blog_posts 
FOR ALL 
USING (is_admin(auth.uid()));

-- RLS Policies for ai_news_cache
CREATE POLICY "Anyone can view active news" 
ON public.ai_news_cache 
FOR SELECT 
USING (status = 'active');

CREATE POLICY "Admins can manage news cache" 
ON public.ai_news_cache 
FOR ALL 
USING (is_admin(auth.uid()));

-- RLS Policies for ai_upcoming_cars_cache
CREATE POLICY "Anyone can view active upcoming cars" 
ON public.ai_upcoming_cars_cache 
FOR SELECT 
USING (status = 'active');

CREATE POLICY "Admins can manage upcoming cars cache" 
ON public.ai_upcoming_cars_cache 
FOR ALL 
USING (is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_ai_blog_posts_status ON public.ai_blog_posts(status);
CREATE INDEX idx_ai_blog_posts_slug ON public.ai_blog_posts(slug);
CREATE INDEX idx_ai_blog_posts_category ON public.ai_blog_posts(category);
CREATE INDEX idx_ai_news_cache_status ON public.ai_news_cache(status);
CREATE INDEX idx_ai_news_cache_category ON public.ai_news_cache(category);
CREATE INDEX idx_ai_upcoming_cars_cache_status ON public.ai_upcoming_cars_cache(status);
CREATE INDEX idx_ai_upcoming_cars_cache_brand ON public.ai_upcoming_cars_cache(brand);

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_ai_blog_posts_updated_at
BEFORE UPDATE ON public.ai_blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();