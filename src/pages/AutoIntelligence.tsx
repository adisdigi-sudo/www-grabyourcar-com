 import { useState } from "react";
 import { Link } from "react-router-dom";
 import { motion } from "framer-motion";
 import { Helmet } from "react-helmet-async";
 import { 
   Sparkles, Car, Newspaper, BookOpen, TrendingUp, 
   ArrowRight, Zap, Calendar, Clock, ChevronRight,
   Star, RefreshCw, Brain
 } from "lucide-react";
 import { Header } from "@/components/Header";
 import { Footer } from "@/components/Footer";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Card, CardContent } from "@/components/ui/card";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 
 const sections = [
   {
     id: "upcoming",
     label: "Upcoming Cars",
     icon: Car,
     description: "Latest car launches coming to India",
     href: "/upcoming-cars",
     color: "from-blue-500/20 to-blue-600/10",
     badge: "AI-Powered",
   },
   {
     id: "news",
     label: "Auto News",
     icon: Newspaper,
     description: "Breaking automotive news & updates",
     href: "/auto-news",
     color: "from-purple-500/20 to-purple-600/10",
     badge: "Live Feed",
   },
   {
     id: "blogs",
     label: "Expert Blogs",
     icon: BookOpen,
     description: "In-depth reviews, guides & tips",
     href: "/blog",
     color: "from-amber-500/20 to-amber-600/10",
     badge: "Curated",
   },
   {
     id: "launches",
     label: "New Launches",
     icon: Zap,
     description: "Recently launched cars in India",
     href: "/cars?filter=new",
     color: "from-green-500/20 to-green-600/10",
     badge: "Hot",
   },
 ];
 
 const featuredContent = [
   {
     type: "upcoming",
     title: "Mahindra XUV.e8 Electric",
     subtitle: "Expected: Q2 2025 | ₹25-30 Lakh",
     description: "Mahindra's flagship electric SUV with 450+ km range",
     image: "https://placehold.co/600x400/DC2626/FFFFFF?text=XUV.e8",
     badge: "Electric SUV",
   },
   {
     type: "news",
     title: "Tata Curvv Coupe SUV Launched",
     subtitle: "Starting at ₹9.99 Lakh",
     description: "India's first coupe-styled SUV creates a new segment",
     image: "https://placehold.co/600x400/0F766E/FFFFFF?text=Curvv",
     badge: "Just Launched",
   },
   {
     type: "blog",
     title: "Best SUVs Under ₹15 Lakh in 2025",
     subtitle: "Buying Guide | 10 min read",
     description: "Complete comparison of top SUVs with our expert verdict",
     image: "https://placehold.co/600x400/6366F1/FFFFFF?text=SUV+Guide",
     badge: "Expert Guide",
   },
 ];
 
 const stats = [
   { label: "Cars Covered", value: "500+", icon: Car },
   { label: "Expert Articles", value: "200+", icon: BookOpen },
   { label: "Daily Updates", value: "24/7", icon: RefreshCw },
   { label: "AI-Powered", value: "100%", icon: Brain },
 ];
 
 export default function AutoIntelligence() {
   const [activeTab, setActiveTab] = useState("all");
 
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
 
         {/* Section Cards */}
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
 
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {sections.map((section, index) => (
                 <motion.div
                   key={section.id}
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true }}
                   transition={{ delay: index * 0.1 }}
                 >
                   <Link to={section.href}>
                     <Card className={`group h-full overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 bg-gradient-to-br ${section.color}`}>
                       <CardContent className="p-6">
                         <div className="flex items-start justify-between mb-4">
                           <div className="w-14 h-14 rounded-2xl bg-background/80 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                             <section.icon className="h-7 w-7 text-primary" />
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
               ))}
             </div>
           </div>
         </section>
 
         {/* Featured Content */}
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
 
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {featuredContent.map((item, index) => (
                 <motion.div
                   key={item.title}
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true }}
                   transition={{ delay: index * 0.1 }}
                 >
                   <Card className="group h-full overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/80">
                     <div className="relative h-48 overflow-hidden">
                       <img
                         src={item.image}
                         alt={item.title}
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                       <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
                         {item.badge}
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
                 </motion.div>
               ))}
             </div>
 
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
 
         {/* Quick Links */}
         <section className="py-12 md:py-20">
           <div className="container">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* Upcoming Cars Preview */}
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
                       {["Mahindra XUV.e8", "Maruti eVX", "Hyundai Creta EV", "Tata Harrier EV"].map((car) => (
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
 
               {/* Auto News Preview */}
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
                       ].map((news) => (
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
                 <Link to="/upcoming-cars">
                   <Button size="lg" className="gap-2 w-full sm:w-auto">
                     <Car className="h-5 w-5" />
                     Explore Upcoming Cars
                   </Button>
                 </Link>
                 <Link to="/auto-news">
                   <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                     <Newspaper className="h-5 w-5" />
                     Read Latest News
                   </Button>
                 </Link>
               </div>
             </motion.div>
           </div>
         </section>
       </main>
 
       <Footer />
     </>
   );
 }