 import { Helmet } from "react-helmet-async";
 import { Header } from "@/components/Header";
 import { Footer } from "@/components/Footer";
 import { Card, CardContent } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import { 
   Building2, 
   Users, 
   Target, 
   Heart, 
   Award, 
   MapPin,
   Phone,
   Mail,
   Linkedin,
   MessageCircle,
   Car,
   Shield,
   TrendingUp,
   Sparkles
 } from "lucide-react";
 
 // Placeholder data - to be filled by admin
 const founderInfo = {
   name: "[Founder Name]",
   role: "Founder & CEO",
   image: null, // Will be uploaded
   bio: "[A brief biography of the founder will be added here. Share your journey, passion for automobiles, and vision for revolutionizing car buying in India.]",
   linkedin: "#",
 };
 
 const companyStory = {
   founded: "2024",
   headquarters: "Delhi NCR, India",
   mission: "To make car buying in India transparent, hassle-free, and delightful for every customer.",
   vision: "To become India's most trusted and technology-driven automotive platform, empowering millions of car buyers with the best deals and seamless experience.",
   story: `[Your company story will go here. Share how Grabyourcar started - the spark of the idea, the challenges faced, and how you built the platform to solve real problems for car buyers in India.
 
 Talk about:
 - What inspired you to start Grabyourcar
 - The problem you saw in the car buying industry
 - How you're different from traditional dealerships
 - Your commitment to customer satisfaction
 - Key milestones and achievements]`,
 };
 
 const teamMembers = [
   {
     name: "[Team Member 1]",
     role: "Co-Founder & COO",
     image: null,
   },
   {
     name: "[Team Member 2]",
     role: "Head of Sales",
     image: null,
   },
   {
     name: "[Team Member 3]",
     role: "Head of Technology",
     image: null,
   },
 ];
 
 const values = [
   {
     icon: Heart,
     title: "Customer First",
     description: "Every decision we make starts with one question: How does this help our customers?",
   },
   {
     icon: Shield,
     title: "Trust & Transparency",
     description: "No hidden charges, no surprises. What you see is what you get.",
   },
   {
     icon: TrendingUp,
     title: "Best Value",
     description: "We negotiate hard so you don't have to. Guaranteed best prices across India.",
   },
   {
     icon: Sparkles,
     title: "Innovation",
     description: "Leveraging technology to make car buying faster, smarter, and more enjoyable.",
   },
 ];
 
 const milestones = [
   { year: "2024", event: "Grabyourcar founded with a vision to transform car buying" },
   { year: "2024", event: "Partnered with 50+ authorized dealerships across India" },
   { year: "2025", event: "Launched AI-powered car recommendation engine" },
   { year: "2025", event: "Expanded to 15+ major cities" },
 ];
 
 const About = () => {
   return (
     <div className="min-h-screen bg-background">
       <Helmet>
         <title>About Us | Grabyourcar - India's Smarter Way to Buy New Cars</title>
         <meta name="description" content="Learn about Grabyourcar's mission to revolutionize car buying in India. Meet our team and discover our story." />
       </Helmet>
       <Header />
       
       <main className="pt-20">
         {/* Hero Section */}
         <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-16 md:py-24">
           <div className="container mx-auto px-4 text-center">
             <Badge variant="secondary" className="mb-4">
               <Building2 className="w-4 h-4 mr-2" />
               About Grabyourcar
             </Badge>
             <h1 className="font-heading text-3xl md:text-5xl font-bold text-foreground mb-6">
               India's Smarter Way to<br />
               <span className="text-primary">Buy New Cars</span>
             </h1>
             <p className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto mb-8">
               {companyStory.mission}
             </p>
             <div className="flex flex-wrap justify-center gap-6 text-sm">
               <div className="flex items-center gap-2 text-muted-foreground">
                 <Car className="h-5 w-5 text-primary" />
                 <span>87+ Car Models</span>
               </div>
               <div className="flex items-center gap-2 text-muted-foreground">
                 <MapPin className="h-5 w-5 text-primary" />
                 <span>Pan-India Coverage</span>
               </div>
               <div className="flex items-center gap-2 text-muted-foreground">
                 <Users className="h-5 w-5 text-primary" />
                 <span>15,000+ Happy Customers</span>
               </div>
             </div>
           </div>
         </section>
 
         {/* Our Story */}
         <section className="py-16 md:py-20">
           <div className="container mx-auto px-4">
             <div className="max-w-4xl mx-auto">
               <div className="text-center mb-10">
                 <Badge variant="outline" className="mb-4">Our Story</Badge>
                 <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground mb-4">
                   How It All Started
                 </h2>
               </div>
               
               <Card className="border-2 border-primary/20">
                 <CardContent className="p-6 md:p-10">
                   <div className="prose prose-lg max-w-none text-muted-foreground whitespace-pre-line">
                     {companyStory.story}
                   </div>
                   
                   <div className="mt-8 pt-6 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                     <div>
                       <p className="text-2xl font-bold text-primary">{companyStory.founded}</p>
                       <p className="text-sm text-muted-foreground">Founded</p>
                     </div>
                     <div>
                       <p className="text-2xl font-bold text-primary">87+</p>
                       <p className="text-sm text-muted-foreground">Car Models</p>
                     </div>
                     <div>
                       <p className="text-2xl font-bold text-primary">15K+</p>
                       <p className="text-sm text-muted-foreground">Customers</p>
                     </div>
                     <div>
                       <p className="text-2xl font-bold text-primary">₹85L+</p>
                       <p className="text-sm text-muted-foreground">Saved</p>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             </div>
           </div>
         </section>
 
         {/* Vision & Values */}
         <section className="py-16 md:py-20 bg-secondary/30">
           <div className="container mx-auto px-4">
             <div className="text-center mb-12">
               <Badge variant="outline" className="mb-4">Our Values</Badge>
               <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground mb-4">
                 What Drives Us
               </h2>
               <p className="text-muted-foreground max-w-2xl mx-auto">
                 {companyStory.vision}
               </p>
             </div>
             
             <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
               {values.map((value, index) => (
                 <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                   <CardContent className="p-6">
                     <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                       <value.icon className="h-7 w-7 text-primary" />
                     </div>
                     <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                     <p className="text-sm text-muted-foreground">{value.description}</p>
                   </CardContent>
                 </Card>
               ))}
             </div>
           </div>
         </section>
 
         {/* Founder Section */}
         <section className="py-16 md:py-20">
           <div className="container mx-auto px-4">
             <div className="max-w-4xl mx-auto">
               <div className="text-center mb-10">
                 <Badge variant="outline" className="mb-4">Leadership</Badge>
                 <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground">
                   Meet Our Founder
                 </h2>
               </div>
               
               <Card className="overflow-hidden">
                 <CardContent className="p-0">
                   <div className="grid md:grid-cols-5 gap-0">
                     {/* Photo placeholder */}
                     <div className="md:col-span-2 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center min-h-[300px]">
                       {founderInfo.image ? (
                         <img src={founderInfo.image} alt={founderInfo.name} className="w-full h-full object-cover" />
                       ) : (
                         <div className="text-center p-8">
                           <div className="w-32 h-32 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                             <Users className="w-16 h-16 text-muted-foreground/50" />
                           </div>
                           <p className="text-sm text-muted-foreground">Photo to be added</p>
                         </div>
                       )}
                     </div>
                     
                     {/* Info */}
                     <div className="md:col-span-3 p-6 md:p-10 flex flex-col justify-center">
                       <h3 className="font-heading text-2xl font-bold mb-1">{founderInfo.name}</h3>
                       <p className="text-primary font-medium mb-4">{founderInfo.role}</p>
                       <p className="text-muted-foreground mb-6 leading-relaxed">{founderInfo.bio}</p>
                       <div className="flex gap-3">
                         <a href={founderInfo.linkedin} target="_blank" rel="noopener noreferrer">
                           <Button variant="outline" size="sm">
                             <Linkedin className="h-4 w-4 mr-2" />
                             LinkedIn
                           </Button>
                         </a>
                       </div>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             </div>
           </div>
         </section>
 
         {/* Team Section */}
         <section className="py-16 md:py-20 bg-secondary/30">
           <div className="container mx-auto px-4">
             <div className="text-center mb-12">
               <Badge variant="outline" className="mb-4">Our Team</Badge>
               <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground">
                 The People Behind Grabyourcar
               </h2>
             </div>
             
             <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
               {teamMembers.map((member, index) => (
                 <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                   <CardContent className="p-6">
                     <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full mx-auto mb-4 flex items-center justify-center">
                       {member.image ? (
                         <img src={member.image} alt={member.name} className="w-full h-full object-cover rounded-full" />
                       ) : (
                         <Users className="w-10 h-10 text-muted-foreground/50" />
                       )}
                     </div>
                     <h3 className="font-semibold text-lg">{member.name}</h3>
                     <p className="text-sm text-primary">{member.role}</p>
                   </CardContent>
                 </Card>
               ))}
             </div>
           </div>
         </section>
 
         {/* Milestones */}
         <section className="py-16 md:py-20">
           <div className="container mx-auto px-4">
             <div className="text-center mb-12">
               <Badge variant="outline" className="mb-4">
                 <Award className="w-4 h-4 mr-2" />
                 Milestones
               </Badge>
               <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground">
                 Our Journey So Far
               </h2>
             </div>
             
             <div className="max-w-2xl mx-auto">
               {milestones.map((milestone, index) => (
                 <div key={index} className="flex gap-4 mb-6">
                   <div className="flex flex-col items-center">
                     <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                       {milestone.year.slice(-2)}
                     </div>
                     {index < milestones.length - 1 && (
                       <div className="w-0.5 flex-1 bg-primary/20 mt-2" />
                     )}
                   </div>
                   <Card className="flex-1">
                     <CardContent className="p-4">
                       <p className="text-xs text-primary font-medium mb-1">{milestone.year}</p>
                       <p className="text-foreground">{milestone.event}</p>
                     </CardContent>
                   </Card>
                 </div>
               ))}
             </div>
           </div>
         </section>
 
         {/* Contact CTA */}
         <section className="py-16 md:py-20 bg-primary">
           <div className="container mx-auto px-4 text-center">
             <h2 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground mb-4">
               Ready to Grab Your Dream Car?
             </h2>
             <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
               Get in touch with our team for the best deals on new cars across India.
             </p>
             <div className="flex flex-wrap justify-center gap-4">
               <a href="https://wa.me/919577200023?text=Hi%20Grabyourcar!%20I%27m%20interested%20in%20buying%20a%20new%20car." target="_blank" rel="noopener noreferrer">
                 <Button size="lg" variant="whatsapp" className="font-semibold">
                   <MessageCircle className="h-5 w-5 mr-2" />
                   WhatsApp Us
                 </Button>
               </a>
               <a href="tel:+919577200023">
                 <Button size="lg" variant="outline" className="font-semibold bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                   <Phone className="h-5 w-5 mr-2" />
                   Call Now
                 </Button>
               </a>
             </div>
             
             <div className="mt-10 pt-8 border-t border-primary-foreground/20 flex flex-wrap justify-center gap-8 text-sm text-primary-foreground/80">
               <div className="flex items-center gap-2">
                 <MapPin className="h-4 w-4" />
                 <span>{companyStory.headquarters}</span>
               </div>
               <div className="flex items-center gap-2">
                 <Phone className="h-4 w-4" />
                 <span>+91 98559 24442</span>
               </div>
               <div className="flex items-center gap-2">
                 <Mail className="h-4 w-4" />
                 <span>contact@grabyourcar.com</span>
               </div>
             </div>
           </div>
         </section>
       </main>
       
       <Footer />
     </div>
   );
 };
 
 export default About;