
-- Enable realtime for tables that admin manages but aren't yet in the publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.accessory_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.accessory_wishlist;
ALTER PUBLICATION supabase_realtime ADD TABLE public.car_colors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.car_variants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.car_specifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.car_features;
ALTER PUBLICATION supabase_realtime ADD TABLE public.car_brochures;
ALTER PUBLICATION supabase_realtime ADD TABLE public.car_offers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.car_images;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cars;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rental_services;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rental_vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_blog_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_news_cache;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homepage_content;
