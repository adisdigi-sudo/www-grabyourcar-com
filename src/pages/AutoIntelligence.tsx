import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { 
  Sparkles, Car, Newspaper, BookOpen, TrendingUp, 
  ArrowRight, Zap, Calendar, Clock, ChevronRight,
  Star, RefreshCw, Brain, AlertCircle
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAutoIntelligenceSettings } from "@/hooks/useAutoIntelligenceSettings";

// Icon mapping for dynamic sections
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  upcoming: Car,
  news: Newspaper,
  blogs: BookOpen,
  launches: Zap,
};

const colorMap: Record<string, string> = {
  upcoming: "from-blue-500/20 to-blue-600/10",
  news: "from-purple-500/20 to-purple-600/10",
  blogs: "from-amber-500/20 to-amber-600/10",
  launches: "from-green-500/20 to-green-600/10",
};

const stats = [
  { label: "Cars Covered", value: "500+", icon: Car },
  { label: "Expert Articles", value: "200+", icon: BookOpen },
  { label: "Daily Updates", value: "24/7", icon: RefreshCw },
  { label: "AI-Powered", value: "100%", icon: Brain },
];

// Fallback featured content when none configured
const defaultFeaturedContent = [
  {
    id: "1",
    type: "upcoming" as const,
    title: "Mahindra XUV.e8 Electric",
    subtitle: "Expected: Q2 2025 | ₹25-30 Lakh",
    description: "Mahindra's flagship electric SUV with 450+ km range",
    link: "/upcoming-cars",
    badge: "Electric SUV",
    priority: 1,
    isActive: true,
  },
  {
    id: "2",
    type: "news" as const,
    title: "Tata Curvv Coupe SUV Launched",
    subtitle: "Starting at ₹9.99 Lakh",
    description: "India's first coupe-styled SUV creates a new segment",
    link: "/auto-news",
    badge: "Just Launched",
    priority: 2,
    isActive: true,
  },
  {
    id: "3",
    type: "blog" as const,
    title: "Best SUVs Under ₹15 Lakh in 2025",
    subtitle: "Buying Guide | 10 min read",
    description: "Complete comparison of top SUVs with our expert verdict",
    link: "/blog",
    badge: "Expert Guide",
    priority: 3,
    isActive: true,
  },
];

export default function AutoIntelligence() {
  const { config, featuredContent, hubSections, isLoading, isHubEnabled } = useAutoIntelligenceSettings();

  // Use default featured content if none configured
  const displayFeaturedContent = featuredContent.length > 0 ? featuredContent : defaultFeaturedContent;

  // Show disabled message if hub is disabled
  if (!isLoading && !isHubEnabled) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
          <div className="text-center p-8">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Auto Intelligence Hub</h1>
            <p className="text-muted-foreground mb-6">This section is currently unavailable. Please check back later.</p>
            <Link to="/">
              <Button>Return to Homepage</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Automobile Intelligence Hub | AI-Powered Car News & Insights | GrabYourCar</title>
        <meta 
          name="description" 
          content="Your AI-powered automotive intelligence hub. Get the latest car launches, expert reviews, auto news, and buying guides tailored for India." 
        />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 md:py-28">
          {/* Background Effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-primary/5 via-transparent to-accent/5 blur-2xl" />
          </div>

          <div className="container relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-4xl mx-auto"
            >
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 px-5 py-2 text-sm">
                <Brain className="h-4 w-4 mr-2" />
                AI-Powered Automotive Intelligence
              </Badge>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-6 leading-tight">
                Your{" "}
                <span className="text-primary relative">
                  Automobile Intelligence
                  <Sparkles className="absolute -top-2 -right-4 h-5 w-5 text-amber-500 animate-pulse" />
                </span>
                <br />
                Hub
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                Stay ahead with AI-curated automotive news, expert insights, and real-time updates 
                tailored exclusively for the Indian market.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-3xl mx-auto">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-4 text-center"
                  >
                    <stat.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section Cards - Dynamic from backend */}
        <section className="py-12 md:py-20">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
                Explore <span className="text-primary">Intelligence Sections</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Dive deep into automotive knowledge with our specialized sections
              </p>
            </motion.div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {hubSections.map((section, index) => {
                  const IconComponent = iconMap[section.id] || Car;
                  const colorClass = colorMap[section.id] || "from-gray-500/20 to-gray-600/10";
                  
                  return (
                    <motion.div
                      key={section.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link to={section.href}>
                        <Card className={`group h-full overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 bg-gradient-to-br ${colorClass}`}>
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="w-14 h-14 rounded-2xl bg-background/80 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                <IconComponent className="h-7 w-7 text-primary" />
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {section.badge}
                              </Badge>
                            </div>

                            <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                              {section.label}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              {section.description}
                            </p>

                            <div className="flex items-center text-primary font-medium text-sm">
                              Explore
                              <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Featured Content - Dynamic from backend */}
        {config.featuredContentEnabled && (
          <section className="py-12 md:py-20 bg-muted/30">
            <div className="container">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <Badge className="mb-4 bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <Star className="h-3.5 w-3.5 mr-1.5" />
                  Featured Content
                </Badge>
                <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
                  Trending in <span className="text-primary">Auto World</span>
                </h2>
              </motion.div>

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-72 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {displayFeaturedContent.slice(0, 3).map((item, index) => (
                    <motion.div
                      key={item.id || item.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link to={item.link || "#"}>
                        <Card className="group h-full overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/80">
                          <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Brain className="h-16 w-16 text-primary/30" />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
                              {item.badge || item.type}
                            </Badge>
                          </div>
                          <CardContent className="p-5">
                            <h3 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors line-clamp-2">
                              {item.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2">{item.subtitle}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="text-center mt-10">
                <Link to="/upcoming-cars">
                  <Button size="lg" className="gap-2">
                    View All Content
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Quick Links - Show based on config */}
        <section className="py-12 md:py-20">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Upcoming Cars Preview - Show if enabled */}
              {config.upcomingCarsEnabled && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full bg-gradient-to-br from-blue-500/10 via-background to-background border-blue-500/20">
                    <CardContent className="p-6 md:p-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <Car className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">Upcoming Cars</h3>
                          <p className="text-sm text-muted-foreground">What's launching in 2025</p>
                        </div>
                      </div>

                      <div className="space-y-4 mb-6">
                        {["Mahindra XUV.e8", "Maruti eVX", "Hyundai Creta EV", "Tata Harrier EV"].slice(0, config.maxUpcomingCars > 4 ? 4 : config.maxUpcomingCars).map((car) => (
                          <div key={car} className="flex items-center gap-3 p-3 bg-card/50 rounded-lg">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{car}</span>
                            <Badge variant="outline" className="ml-auto text-xs">2025</Badge>
                          </div>
                        ))}
                      </div>

                      <Link to="/upcoming-cars">
                        <Button variant="outline" className="w-full gap-2">
                          View All Upcoming Cars
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Auto News Preview - Show if enabled */}
              {config.newsEnabled && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full bg-gradient-to-br from-purple-500/10 via-background to-background border-purple-500/20">
                    <CardContent className="p-6 md:p-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                          <TrendingUp className="h-6 w-6 text-purple-500" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">Latest News</h3>
                          <p className="text-sm text-muted-foreground">AI-curated automotive updates</p>
                        </div>
                      </div>

                      <div className="space-y-4 mb-6">
                        {[
                          "Tata Motors EV Sales Up 50% in January",
                          "New CAFE Norms to Impact Car Prices",
                          "Maruti Announces New EV Platform",
                          "Hyundai Ioniq 5 Gets Price Cut"
                        ].slice(0, 4).map((news) => (
                          <div key={news} className="flex items-center gap-3 p-3 bg-card/50 rounded-lg">
                            <Newspaper className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium line-clamp-1">{news}</span>
                          </div>
                        ))}
                      </div>

                      <Link to="/auto-news">
                        <Button variant="outline" className="w-full gap-2">
                          Read All News
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto"
            >
              <h2 className="text-2xl md:text-3xl font-heading font-bold mb-4">
                Stay Informed, Make Smarter Decisions
              </h2>
              <p className="text-muted-foreground mb-8">
                Our AI continuously monitors the Indian automotive landscape to bring you 
                the most relevant and timely information.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {config.upcomingCarsEnabled && (
                  <Link to="/upcoming-cars">
                    <Button size="lg" className="gap-2 w-full sm:w-auto">
                      <Car className="h-5 w-5" />
                      Explore Upcoming Cars
                    </Button>
                  </Link>
                )}
                {config.newsEnabled && (
                  <Link to="/auto-news">
                    <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                      <Newspaper className="h-5 w-5" />
                      Read Latest News
                    </Button>
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
