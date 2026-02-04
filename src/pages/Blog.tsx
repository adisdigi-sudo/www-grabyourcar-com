import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { blogPosts, BlogPost } from "@/data/blogData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Search,
  Clock,
  User,
  ArrowRight,
  Star,
  FileText,
  Newspaper,
  Lightbulb,
} from "lucide-react";

const categoryConfig = {
  review: { label: "Review", icon: Star, color: "bg-blue-500" },
  guide: { label: "Guide", icon: BookOpen, color: "bg-green-500" },
  news: { label: "News", icon: Newspaper, color: "bg-purple-500" },
  tips: { label: "Tips", icon: Lightbulb, color: "bg-orange-500" },
};

const Blog = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredPosts = blogPosts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredPost = blogPosts[0];
  const recentPosts = blogPosts.slice(1, 4);

  return (
    <>
      <Helmet>
        <title>Car Blog | Reviews, Guides & Expert Tips | GrabYourCar</title>
        <meta
          name="description"
          content="Read expert car reviews, buying guides, and tips from GrabYourCar. Get insights on new car launches, comparisons, and automotive industry news."
        />
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://grabyourcar.lovable.app/blog" />
        <meta property="og:title" content="Car Blog | Reviews, Guides & Expert Tips | GrabYourCar" />
        <meta property="og:description" content="Read expert car reviews, buying guides, and tips from GrabYourCar." />
        <meta property="og:image" content="https://grabyourcar.lovable.app/og-image.png" />
        <meta property="og:site_name" content="GrabYourCar" />
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://grabyourcar.lovable.app/blog" />
        <meta name="twitter:title" content="Car Blog | Reviews, Guides & Expert Tips" />
        <meta name="twitter:description" content="Read expert car reviews, buying guides, and tips." />
        <meta name="twitter:image" content="https://grabyourcar.lovable.app/og-image.png" />
      </Helmet>

      <div className="min-h-screen bg-background">

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="mb-4" variant="secondary">
              <BookOpen className="h-3 w-3 mr-1" />
              Car Reviews & Guides
            </Badge>
            <h1 className="text-3xl md:text-5xl font-heading font-bold text-foreground mb-4">
              Expert Insights for <span className="text-primary">Smart Car Buyers</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              In-depth car reviews, buying guides, and expert tips to help you make the right choice.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search articles, reviews, guides..."
                className="pl-12 h-12 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-6 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              onClick={() => setSelectedCategory(null)}
            >
              All Posts
            </Button>
            {Object.entries(categoryConfig).map(([key, config]) => (
              <Button
                key={key}
                variant={selectedCategory === key ? "default" : "outline"}
                onClick={() => setSelectedCategory(key)}
              >
                <config.icon className="h-4 w-4 mr-2" />
                {config.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Post */}
      {!searchQuery && !selectedCategory && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-heading font-bold mb-6">Featured Article</h2>
            <Link to={`/blog/${featuredPost.slug}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="grid md:grid-cols-2 gap-0">
                  <div className="aspect-video md:aspect-auto">
                    <img
                      src={featuredPost.image}
                      alt={featuredPost.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-6 md:p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={categoryConfig[featuredPost.category].color}>
                        {categoryConfig[featuredPost.category].label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{featuredPost.date}</span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-heading font-bold mb-3 group-hover:text-primary transition-colors">
                      {featuredPost.title}
                    </h3>
                    <p className="text-muted-foreground mb-4">{featuredPost.excerpt}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {featuredPost.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {featuredPost.readTime}
                      </span>
                    </div>
                  </CardContent>
                </div>
              </Card>
            </Link>
          </div>
        </section>
      )}

      {/* Recent Posts Grid */}
      {!searchQuery && !selectedCategory && (
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-heading font-bold mb-6">Recent Articles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {recentPosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Posts / Filtered Posts */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-heading font-bold mb-6">
            {searchQuery || selectedCategory ? `${filteredPosts.length} Results` : "All Articles"}
          </h2>
          {filteredPosts.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No articles found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-12 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-heading font-bold mb-4">
            Stay Updated with Car News
          </h2>
          <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
            Get the latest car reviews, buying guides, and exclusive offers delivered to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <Input
              placeholder="Enter your email"
              className="bg-primary-foreground text-foreground"
            />
            <Button variant="secondary">Subscribe</Button>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </>
  );
};

const BlogCard = ({ post }: { post: BlogPost }) => {
  const config = categoryConfig[post.category];

  return (
    <Link to={`/blog/${post.slug}`}>
      <Card className="overflow-hidden h-full hover:shadow-lg transition-all group">
        <div className="aspect-video overflow-hidden">
          <img
            src={post.image}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Badge className={config.color}>{config.label}</Badge>
            <span className="text-xs text-muted-foreground">{post.date}</span>
          </div>
          <h3 className="font-heading font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{post.excerpt}</p>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {post.readTime}
            </span>
            <span className="flex items-center gap-1 text-primary font-medium">
              Read More
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default Blog;