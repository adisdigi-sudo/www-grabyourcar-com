import { useParams, Link, Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getBlogBySlug, blogPosts, BlogPost as BlogPostType } from "@/data/blogData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Clock,
  User,
  Calendar,
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  BookOpen,
  Star,
  Newspaper,
  Lightbulb,
} from "lucide-react";

const categoryConfig = {
  review: { label: "Review", icon: Star, color: "bg-blue-500" },
  guide: { label: "Guide", icon: BookOpen, color: "bg-green-500" },
  news: { label: "News", icon: Newspaper, color: "bg-purple-500" },
  tips: { label: "Tips", icon: Lightbulb, color: "bg-orange-500" },
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogBySlug(slug) : undefined;

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const config = categoryConfig[post.category];
  const relatedPosts = blogPosts
    .filter((p) => p.id !== post.id && p.category === post.category)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Breadcrumb */}
      <section className="py-4 border-b border-border">
        <div className="container mx-auto px-4">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>
        </div>
      </section>

      {/* Hero Image */}
      <section className="relative">
        <div className="aspect-[21/9] max-h-[400px] overflow-hidden">
          <img
            src={post.image}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
      </section>

      {/* Article Content */}
      <article className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-8 -mt-24 relative z-10">
              <Badge className={`${config.color} mb-4`}>{config.label}</Badge>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-foreground mb-6">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {post.author}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {post.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {post.readTime}
                </span>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-8">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Content */}
            <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-heading prose-headings:font-bold prose-h2:text-2xl prose-h3:text-xl prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary">
              {post.content.split("\n").map((paragraph, index) => {
                if (paragraph.startsWith("## ")) {
                  return (
                    <h2 key={index} className="mt-8 mb-4 text-foreground">
                      {paragraph.replace("## ", "")}
                    </h2>
                  );
                }
                if (paragraph.startsWith("### ")) {
                  return (
                    <h3 key={index} className="mt-6 mb-3 text-foreground">
                      {paragraph.replace("### ", "")}
                    </h3>
                  );
                }
                if (paragraph.startsWith("- ")) {
                  return (
                    <li key={index} className="ml-4">
                      {paragraph.replace("- ", "")}
                    </li>
                  );
                }
                if (paragraph.startsWith("| ")) {
                  return null; // Skip table rows for simple rendering
                }
                if (paragraph.startsWith("**") && paragraph.endsWith("**")) {
                  return (
                    <p key={index} className="font-bold text-foreground">
                      {paragraph.replace(/\*\*/g, "")}
                    </p>
                  );
                }
                if (paragraph.trim()) {
                  return <p key={index}>{paragraph}</p>;
                }
                return null;
              })}
            </div>

            {/* Share Section */}
            <div className="mt-12 pt-8 border-t border-border">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Share this article:</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon">
                    <Facebook className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Twitter className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Linkedin className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Author Bio */}
            <Card className="mt-8">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-lg">{post.author}</h3>
                    <p className="text-sm text-muted-foreground">
                      Automotive journalist with 10+ years of experience covering the Indian car market.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-heading font-bold mb-6">Related Articles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                <Link key={relatedPost.id} to={`/blog/${relatedPost.slug}`}>
                  <Card className="overflow-hidden h-full hover:shadow-lg transition-all group">
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={relatedPost.image}
                        alt={relatedPost.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <CardContent className="p-5">
                      <h3 className="font-heading font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                        {relatedPost.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2">{relatedPost.readTime}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-heading font-bold mb-4">Ready to Find Your Dream Car?</h2>
          <p className="text-muted-foreground mb-6">
            Browse our collection of new cars with exclusive deals and offers.
          </p>
          <Link to="/#cars">
            <Button size="lg">Explore Cars</Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BlogPost;