import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { 
  Newspaper, Clock, User, Tag, RefreshCw, Sparkles, 
  ArrowRight, TrendingUp, Zap, Car, Lightbulb, BarChart3
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface NewsArticle {
  title: string;
  excerpt: string;
  category: string;
  author: string;
  readTime: string;
  publishedAt: string;
  imageDescription: string;
  featured: boolean;
  tags: string[];
}

const categoryConfig: Record<string, { icon: React.ReactNode; color: string; gradient: string }> = {
  "Launch": { 
    icon: <Car className="h-4 w-4" />, 
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    gradient: "from-blue-500/20 to-blue-600/10"
  },
  "Review": { 
    icon: <BarChart3 className="h-4 w-4" />, 
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    gradient: "from-amber-500/20 to-amber-600/10"
  },
  "Industry": { 
    icon: <TrendingUp className="h-4 w-4" />, 
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    gradient: "from-purple-500/20 to-purple-600/10"
  },
  "EV": { 
    icon: <Zap className="h-4 w-4" />, 
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    gradient: "from-emerald-500/20 to-emerald-600/10"
  },
  "Tips": { 
    icon: <Lightbulb className="h-4 w-4" />, 
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    gradient: "from-rose-500/20 to-rose-600/10"
  },
  "Comparison": { 
    icon: <BarChart3 className="h-4 w-4" />, 
    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    gradient: "from-cyan-500/20 to-cyan-600/10"
  },
};

const categories = ["All", "Launch", "Review", "Industry", "EV", "Tips", "Comparison"];

export default function AutoNews() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const fetchNews = async (category: string = "all") => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('auto-news', {
        body: { category: category === "All" ? "all" : category.toLowerCase() }
      });
      
      if (fnError) throw fnError;
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setArticles(data.articles || []);
      setGeneratedAt(data.generatedAt);
      toast.success("Latest automotive news loaded!");
    } catch (err) {
      console.error("Error fetching news:", err);
      setError(err instanceof Error ? err.message : "Failed to load news");
      toast.error("Failed to load news. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  const filteredArticles = selectedCategory === "All" 
    ? articles 
    : articles.filter(article => article.category === selectedCategory);

  const featuredArticle = articles.find(a => a.featured);
  const regularArticles = filteredArticles.filter(a => !a.featured || selectedCategory !== "All");

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getPlaceholderImage = (category: string, index: number) => {
    const colors = ["6366F1", "8B5CF6", "EC4899", "F59E0B", "10B981", "3B82F6"];
    const color = colors[index % colors.length];
    return `https://placehold.co/800x450/${color}/FFFFFF?text=${encodeURIComponent(category + " News")}`;
  };

  return (
    <>
      <Helmet>
        <title>Auto News India | Latest Car News & Updates | GrabYourCar</title>
        <meta name="description" content="Get the latest automotive news, car reviews, industry updates, and EV news from India. AI-powered news curation for car enthusiasts." />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 md:py-20">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
          <div className="absolute top-10 right-20 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl" />
          
          <div className="container relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-3xl mx-auto"
            >
              <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 px-4 py-1.5">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                AI-Curated News
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-6">
                <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Auto News
                </span>
                <span className="text-primary"> India</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                Your daily dose of automotive intelligence. From breaking launches to expert reviews, 
                stay informed with AI-curated news tailored for the Indian market.
              </p>

              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Button 
                  onClick={() => fetchNews(selectedCategory)} 
                  disabled={loading}
                  size="lg"
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh News
                </Button>
                
                {generatedAt && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {new Date(generatedAt).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Category Tabs */}
        <section className="py-4 border-y border-border/50 bg-muted/30 sticky top-16 z-40 backdrop-blur-sm">
          <div className="container">
            <Tabs value={selectedCategory} onValueChange={handleCategoryChange} className="w-full">
              <TabsList className="w-full justify-start gap-2 bg-transparent overflow-x-auto flex-nowrap">
                {categories.map((category) => (
                  <TabsTrigger
                    key={category}
                    value={category}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shrink-0 gap-1.5"
                  >
                    {category !== "All" && categoryConfig[category]?.icon}
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </section>

        {/* Content */}
        <section className="py-12 md:py-16">
          <div className="container">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <div className="bg-destructive/10 text-destructive rounded-xl p-6 max-w-md mx-auto">
                  <p className="font-medium mb-4">{error}</p>
                  <Button onClick={() => fetchNews()} variant="outline">
                    Try Again
                  </Button>
                </div>
              </motion.div>
            )}

            {loading ? (
              <div className="space-y-8">
                {/* Featured skeleton */}
                <Card className="overflow-hidden">
                  <div className="grid md:grid-cols-2 gap-0">
                    <Skeleton className="h-64 md:h-80" />
                    <div className="p-6 space-y-4">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-10 w-32" />
                    </div>
                  </div>
                </Card>
                
                {/* Grid skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <Skeleton className="h-48 w-full" />
                      <CardContent className="p-5 space-y-3">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedCategory}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-10"
                >
                  {/* Featured Article */}
                  {featuredArticle && selectedCategory === "All" && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-500 border-border/50 bg-card/80 backdrop-blur">
                        <div className="grid md:grid-cols-2 gap-0">
                          <div className="relative h-64 md:h-80 overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
                            <img
                              src={getPlaceholderImage(featuredArticle.category, 0)}
                              alt={featuredArticle.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                            <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Featured
                            </Badge>
                          </div>
                          
                          <div className="p-6 md:p-8 flex flex-col justify-center">
                            <Badge className={`w-fit mb-4 ${categoryConfig[featuredArticle.category]?.color}`}>
                              {categoryConfig[featuredArticle.category]?.icon}
                              <span className="ml-1">{featuredArticle.category}</span>
                            </Badge>
                            
                            <h2 className="text-2xl md:text-3xl font-heading font-bold mb-4 group-hover:text-primary transition-colors">
                              {featuredArticle.title}
                            </h2>
                            
                            <p className="text-muted-foreground mb-6 line-clamp-3">
                              {featuredArticle.excerpt}
                            </p>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                              <span className="flex items-center gap-1.5">
                                <User className="h-4 w-4" />
                                {featuredArticle.author}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                {featuredArticle.readTime}
                              </span>
                            </div>
                            
                            <Button className="w-fit group/btn">
                              Read Full Story
                              <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )}

                  {/* News Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {regularArticles.map((article, index) => (
                      <motion.div
                        key={`${article.title}-${index}`}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.08 }}
                      >
                        <Card className="group h-full overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/80 backdrop-blur flex flex-col">
                          {/* Image */}
                          <div className={`relative h-48 overflow-hidden bg-gradient-to-br ${categoryConfig[article.category]?.gradient || 'from-muted to-muted/50'}`}>
                            <img
                              src={getPlaceholderImage(article.category, index + 1)}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                            <Badge className={`absolute top-3 left-3 ${categoryConfig[article.category]?.color} backdrop-blur-sm`}>
                              {categoryConfig[article.category]?.icon}
                              <span className="ml-1">{article.category}</span>
                            </Badge>
                          </div>

                          <CardContent className="p-5 flex-1 flex flex-col">
                            {/* Title */}
                            <h3 className="text-lg font-heading font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                              {article.title}
                            </h3>
                            
                            {/* Excerpt */}
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                              {article.excerpt}
                            </p>
                            
                            {/* Tags */}
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {article.tags.slice(0, 3).map((tag, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  <Tag className="h-2.5 w-2.5 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            
                            {/* Meta */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border/50">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {article.author}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {article.readTime}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  {filteredArticles.length === 0 && !error && (
                    <div className="text-center py-12">
                      <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No articles found in this category.</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </section>

        {/* Newsletter */}
        <section className="py-16 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto"
            >
              <Newspaper className="h-10 w-10 text-primary mx-auto mb-4" />
              <h2 className="text-2xl md:text-3xl font-heading font-bold mb-4">
                Daily Auto Digest
              </h2>
              <p className="text-muted-foreground mb-6">
                Get the top automotive stories delivered to your inbox every morning.
              </p>
              <div className="flex gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button>Subscribe</Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
