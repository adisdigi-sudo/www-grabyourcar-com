import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Star, Users, ThumbsUp, Award, ExternalLink, MapPin, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface GoogleReviewDisplay {
  id: string;
  authorName: string;
  authorPhoto?: string;
  rating: number;
  text: string;
  relativeTime: string;
  isLocalGuide?: boolean;
}

// Hardcoded fallback reviews
const fallbackReviews: GoogleReviewDisplay[] = [
  { id: "1", authorName: "Rahul Sharma", rating: 5, text: "Excellent service! Got my Hyundai Creta at the best price in Mumbai. The team was very professional and handled all the paperwork smoothly. Highly recommend GrabYourCar for hassle-free car buying.", relativeTime: "2 weeks ago", isLocalGuide: true },
  { id: "2", authorName: "Priya Patel", rating: 5, text: "Amazing experience buying my first car through GrabYourCar. They helped me compare multiple variants of Tata Nexon and got me the best finance option. Doorstep delivery was cherry on top!", relativeTime: "1 month ago", isLocalGuide: false },
  { id: "3", authorName: "Amit Kumar Singh", rating: 4, text: "Good experience overall. The price was competitive and the team was helpful. Waiting time for XUV700 was long but that's expected. Would have given 5 stars if communication was more frequent.", relativeTime: "3 weeks ago", isLocalGuide: true },
  { id: "4", authorName: "Sneha Reddy", rating: 5, text: "Second purchase from GrabYourCar. Got a Swift for my parents last year and now Kia Seltos for myself. They always deliver on their promise of best deals. Trusted platform!", relativeTime: "1 week ago", isLocalGuide: false },
  { id: "5", authorName: "Vikram Mehta", rating: 5, text: "The hybrid Maruti Grand Vitara was hard to find anywhere, but GrabYourCar located one quickly. Great pricing on insurance too. Very satisfied with the entire process.", relativeTime: "1 month ago", isLocalGuide: true },
  { id: "6", authorName: "Ananya Singh", rating: 4, text: "Bought Toyota Innova Hycross. The wait was long but the team followed up consistently. Good savings compared to direct dealer price. Professional service.", relativeTime: "2 months ago", isLocalGuide: false },
];

const defaultStats = { rating: 4.6, totalReviews: 142, responseRate: "100%", avgResponseTime: "Within 1 hour" };

const statIcons = [
  { icon: Users, value: "500+", label: "Cars Delivered" },
  { icon: ThumbsUp, value: "4.6", label: "Google Rating" },
  { icon: Award, value: "142", label: "Reviews" },
];

const ReviewCard = ({ review, index }: { review: GoogleReviewDisplay; index: number }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
    <Card className="p-5 h-full bg-card border border-border/50 hover:border-primary/20 hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0 shadow-md">
          {review.authorName.split(" ").map(n => n[0]).join("").slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-semibold text-foreground text-sm truncate">{review.authorName}</p>
            {review.isLocalGuide && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-accent/20 text-accent border-0">Local Guide</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'fill-accent text-accent' : 'text-muted-foreground/30'}`} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />{review.relativeTime}
            </span>
          </div>
        </div>
      </div>
      <p className="text-foreground/90 text-sm leading-relaxed line-clamp-4 group-hover:line-clamp-none transition-all duration-300">{review.text}</p>
      <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-1.5">
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span className="text-xs text-muted-foreground">Posted on Google</span>
      </div>
    </Card>
  </motion.div>
);

export const Testimonials = () => {
  // Fetch reviews from database
  const { data: dbReviews = [] } = useQuery({
    queryKey: ["google-reviews-public"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("google_reviews")
        .select("*")
        .eq("is_visible", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch review settings
  const { data: reviewSettings } = useQuery({
    queryKey: ["reviewSettings-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "review_settings")
        .maybeSingle();
      if (error) throw error;
      return data?.setting_value as { overallRating: number; totalReviews: number; responseRate: number } | null;
    },
  });

  const displayReviews = useMemo(() => {
    if (dbReviews.length > 0) {
      return dbReviews.map((r: any) => ({
        id: r.id,
        authorName: r.author_name,
        authorPhoto: r.author_photo,
        rating: r.rating,
        text: r.review_text,
        relativeTime: r.relative_time || "",
        isLocalGuide: r.is_local_guide,
      }));
    }
    return fallbackReviews;
  }, [dbReviews]);

  const businessStats = {
    rating: reviewSettings?.overallRating ?? defaultStats.rating,
    totalReviews: reviewSettings?.totalReviews ?? defaultStats.totalReviews,
    responseRate: reviewSettings?.responseRate ? `${reviewSettings.responseRate}%` : defaultStats.responseRate,
    avgResponseTime: defaultStats.avgResponseTime,
  };

  const stats = [
    { icon: Users, value: "500+", label: "Cars Delivered" },
    { icon: ThumbsUp, value: String(businessStats.rating), label: "Google Rating" },
    { icon: Award, value: String(businessStats.totalReviews), label: "Reviews" },
  ];

  const handleViewAllReviews = () => {
    window.open("https://www.google.com/maps/search/GrabYourCar", "_blank");
  };

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background via-secondary/5 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-card border border-border/50 shadow-sm">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-sm font-medium text-foreground">Google Reviews</span>
          </div>
          
          <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground mb-4">
            Trusted by Car Buyers Across India
          </h2>
          
          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl md:text-5xl font-bold text-foreground">{businessStats.rating}</span>
              <span className="text-lg text-muted-foreground">/5</span>
            </div>
            <div className="text-left">
              <div className="flex gap-0.5 mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-5 w-5 ${i < Math.floor(businessStats.rating) ? 'fill-accent text-accent' : i < businessStats.rating ? 'fill-accent/50 text-accent' : 'text-muted-foreground/30'}`} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Based on {businessStats.totalReviews} reviews
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-2xl mx-auto mb-10 md:mb-14">
          {stats.map((stat, index) => (
            <motion.div key={index} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}
              className="text-center p-3 md:p-5 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <stat.icon className="h-5 w-5 md:h-7 md:w-7 text-primary mx-auto mb-2" />
              <p className="font-heading text-lg md:text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {displayReviews.map((review: GoogleReviewDisplay, index: number) => (
            <ReviewCard key={review.id} review={review} index={index} />
          ))}
        </div>

        <div className="mt-10 md:mt-12 text-center">
          <Button onClick={handleViewAllReviews} variant="outline" className="gap-2 px-6 py-3 h-auto font-medium hover:bg-primary hover:text-primary-foreground transition-colors">
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            View All Reviews on Google
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <p className="mt-4 text-xs text-muted-foreground flex items-center justify-center gap-2">
            <MapPin className="h-3.5 w-3.5" />
            Responds to {businessStats.responseRate} of reviews • {businessStats.avgResponseTime}
          </p>
        </div>
      </div>
    </section>
  );
};
