import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Star, Quote } from "lucide-react";
import { motion } from "framer-motion";

interface HomepageContent {
  id: string;
  section_type: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  link_text: string | null;
  is_active: boolean;
  sort_order: number;
}

export const DynamicHeroBanners = () => {
  const { data: banners } = useQuery({
    queryKey: ['homepage-hero-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homepage_content')
        .select('*')
        .eq('section_type', 'hero_banner')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as HomepageContent[];
    },
  });

  if (!banners?.length) return null;

  return (
    <section className="py-8 bg-gradient-to-r from-primary/5 to-primary/10">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((banner, index) => (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow">
                {banner.image_url && (
                  <div className="aspect-video relative overflow-hidden">
                    <img 
                      src={banner.image_url} 
                      alt={banner.title || 'Banner'} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-4">
                  {banner.title && (
                    <h3 className="font-bold text-lg mb-2">{banner.title}</h3>
                  )}
                  {banner.subtitle && (
                    <p className="text-muted-foreground text-sm mb-3">{banner.subtitle}</p>
                  )}
                  {banner.link_url && (
                    <Button asChild size="sm" variant="outline">
                      <Link to={banner.link_url}>
                        {banner.link_text || 'Learn More'}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const DynamicPromoBanners = () => {
  const { data: promos } = useQuery({
    queryKey: ['homepage-promo-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homepage_content')
        .select('*')
        .eq('section_type', 'promo_banner')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as HomepageContent[];
    },
  });

  if (!promos?.length) return null;

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <div className="space-y-4">
          {promos.map((promo) => (
            <motion.div
              key={promo.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-6 text-primary-foreground"
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {promo.image_url && (
                    <img 
                      src={promo.image_url} 
                      alt="" 
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    {promo.title && (
                      <h3 className="font-bold text-xl">{promo.title}</h3>
                    )}
                    {promo.subtitle && (
                      <p className="opacity-90">{promo.subtitle}</p>
                    )}
                  </div>
                </div>
                {promo.link_url && (
                  <Button asChild variant="secondary" size="lg">
                    <Link to={promo.link_url}>
                      {promo.link_text || 'View Offer'}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const DynamicFeaturedCars = () => {
  const { data: featured } = useQuery({
    queryKey: ['homepage-featured-cars'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homepage_content')
        .select('*')
        .eq('section_type', 'featured_cars')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as HomepageContent[];
    },
  });

  if (!featured?.length) return null;

  return (
    <section className="py-12 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-2">Featured</Badge>
          <h2 className="text-3xl font-bold">Editor's Picks</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((car, index) => (
            <motion.div
              key={car.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden group hover:shadow-xl transition-all">
                {car.image_url && (
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <img 
                      src={car.image_url} 
                      alt={car.title || 'Featured Car'} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-primary">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    </div>
                  </div>
                )}
                <CardContent className="p-4">
                  {car.title && (
                    <h3 className="font-bold text-lg">{car.title}</h3>
                  )}
                  {car.subtitle && (
                    <p className="text-primary font-semibold">{car.subtitle}</p>
                  )}
                  {car.description && (
                    <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                      {car.description}
                    </p>
                  )}
                  {car.link_url && (
                    <Button asChild variant="link" className="p-0 mt-2">
                      <Link to={car.link_url}>
                        {car.link_text || 'View Details'} →
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const DynamicTestimonials = () => {
  const { data: testimonials } = useQuery({
    queryKey: ['homepage-testimonials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homepage_content')
        .select('*')
        .eq('section_type', 'testimonial')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as HomepageContent[];
    },
  });

  if (!testimonials?.length) return null;

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold">What Our Customers Say</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full">
                <CardContent className="p-6">
                  <Quote className="h-8 w-8 text-primary/30 mb-4" />
                  {testimonial.description && (
                    <p className="text-muted-foreground mb-4 italic">
                      "{testimonial.description}"
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    {testimonial.image_url && (
                      <img 
                        src={testimonial.image_url} 
                        alt="" 
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}
                    <div>
                      {testimonial.title && (
                        <p className="font-semibold">{testimonial.title}</p>
                      )}
                      {testimonial.subtitle && (
                        <p className="text-sm text-muted-foreground">{testimonial.subtitle}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const DynamicCTABanners = () => {
  const { data: ctas } = useQuery({
    queryKey: ['homepage-cta-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homepage_content')
        .select('*')
        .eq('section_type', 'cta')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as HomepageContent[];
    },
  });

  if (!ctas?.length) return null;

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        {ctas.map((cta) => (
          <motion.div
            key={cta.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card border rounded-2xl p-8 text-center"
          >
            {cta.title && (
              <h2 className="text-3xl font-bold mb-2">{cta.title}</h2>
            )}
            {cta.subtitle && (
              <p className="text-xl text-muted-foreground mb-4">{cta.subtitle}</p>
            )}
            {cta.description && (
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                {cta.description}
              </p>
            )}
            {cta.link_url && (
              <Button asChild size="lg">
                <Link to={cta.link_url}>
                  {cta.link_text || 'Get Started'}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
};
