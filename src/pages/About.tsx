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
 
 // Team Photos
 import anshdeepPhoto from "@/assets/team/anshdeep-singh.jpg";
 import ishangeePhoto from "@/assets/team/ishangee-sharma.jpg";
 import paragPhoto from "@/assets/team/parag-goel.jpg";
 
 // Leadership & Company Information
 const founderInfo = {
   name: "Anshdeep Singh",
   role: "Founder & CEO",
   image: anshdeepPhoto,
   bio: "Anshdeep Singh is the Founder & CEO of Grabyourcar, an emerging automotive platform dedicated to transforming the new car buying experience in India. With a strong entrepreneurial vision and deep passion for automobiles, he recognized the challenges customers face — from long waiting periods to inconsistent pricing and limited dealership access. Through Grabyourcar, he aims to create a smarter, faster, and more transparent vehicle purchasing journey by leveraging technology and a growing dealer network.",
   linkedin: "https://www.linkedin.com/in/anshdeep-singh-033407236",
 };
 
 const companyStory = {
   founded: "2023",
   headquarters: "Gurugram, Haryana",
   mission: "To simplify and modernize the way India buys new cars — making car buying smarter, quicker, and completely hassle-free.",
   vision: "To become a trusted automotive platform that empowers customers with better options, stronger deals, and end-to-end support throughout their journey.",
   story: `Grabyourcar was founded with a clear purpose — to simplify and modernize the way India buys new cars.
 
 The idea emerged from recognizing a common frustration among buyers: long waiting periods, lack of pricing transparency, and the difficulty of comparing real dealership offers. Traditional car buying often left customers with limited choices and unnecessary delays.
 
 The turning point came when we saw how technology could bridge this gap — connecting customers to multiple dealerships, creating price advantages, and enabling faster vehicle deliveries.
 
 Built on the principles of trust, transparency, and efficiency, Grabyourcar is committed to making car buying smarter, quicker, and completely hassle-free.`,
 };
 
 const teamMembers = [
   {
     name: "Ishangee Sharma",
     role: "Head of Operations",
     image: ishangeePhoto,
     bio: "Ishangee oversees operations, ensuring efficiency across processes, partner coordination, and customer fulfillment.",
     linkedin: "https://www.linkedin.com/in/ishangee-sharma-657176146",
   },
   {
     name: "Parag Goel",
     role: "Head of Sales",
     image: paragPhoto,
     bio: "Parag leads the sales strategy at Grabyourcar, driving customer acquisition and building strong relationships with dealership partners.",
     linkedin: null,
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
   { year: "2023", event: "Grabyourcar founded with a vision to transform car buying in India" },
   { year: "2023", event: "Established headquarters in Gurugram, Haryana" },
   { year: "2024", event: "Built expanding dealer network across key markets" },
   { year: "2024", event: "Crossed 500+ happy customers milestone" },
   { year: "2025", event: "Launched AI-powered car recommendation and comparison tools" },
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
                   <span>Delhi NCR & Pan-India</span>
                 </div>
                 <div className="flex items-center gap-2 text-muted-foreground">
                   <Users className="h-5 w-5 text-primary" />
                   <span>500+ Happy Customers</span>
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
                         <p className="text-2xl font-bold text-primary">500+</p>
                         <p className="text-sm text-muted-foreground">Customers</p>
                       </div>
                       <div>
                         <p className="text-2xl font-bold text-primary">₹25L+</p>
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
 
           {/* Leadership Section */}
           <section className="py-16 md:py-20">
           <div className="container mx-auto px-4">
             <div className="max-w-4xl mx-auto">
               <div className="text-center mb-10">
                 <Badge variant="outline" className="mb-4">Leadership</Badge>
                   <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground">
                     Meet Our Leadership Team
                   </h2>
               </div>
               
               <Card className="overflow-hidden">
                 <CardContent className="p-0">
                   <div className="grid md:grid-cols-5 gap-0">
                     {/* Founder Photo */}
                       <div className="md:col-span-2 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center min-h-[300px] overflow-hidden">
                         {founderInfo.image ? (
                           <img 
                             src={founderInfo.image} 
                             alt={founderInfo.name} 
                             className="w-full h-full object-cover"
                           />
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
                 <Badge variant="outline" className="mb-4">Core Team</Badge>
                 <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground">
                   The People Behind Grabyourcar
                 </h2>
               </div>
               
               <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                   {teamMembers.map((member, index) => (
                     <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                       <CardContent className="p-6">
                         <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full mx-auto mb-4 overflow-hidden">
                           {member.image ? (
                             <img 
                               src={member.image} 
                               alt={member.name} 
                               className="w-full h-full object-cover"
                             />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center">
                               <Users className="w-10 h-10 text-muted-foreground/50" />
                             </div>
                           )}
                         </div>
                         <h3 className="font-semibold text-lg">{member.name}</h3>
                         <p className="text-sm text-primary mb-2">{member.role}</p>
                         <p className="text-xs text-muted-foreground mb-3">{member.bio}</p>
                         {member.linkedin && (
                           <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs text-primary hover:underline">
                             <Linkedin className="h-3 w-3 mr-1" />
                             LinkedIn
                           </a>
                         )}
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
               <div className="flex justify-center">
                 <a href="https://wa.me/919855924442?text=Hi%20Grabyourcar!%20I%27m%20interested%20in%20buying%20a%20new%20car%20and%20would%20like%20to%20know%20about%20the%20best%20offers." target="_blank" rel="noopener noreferrer">
                   <Button size="lg" className="font-semibold bg-primary-foreground text-primary hover:bg-primary-foreground/90 px-8">
                     <MessageCircle className="h-5 w-5 mr-2" />
                     Talk to Our Expert
                   </Button>
                 </a>
               </div>
             
               <div className="mt-10 pt-8 border-t border-primary-foreground/20">
                 <p className="text-xs text-primary-foreground/60 text-center mb-4">
                   MS 228, 2nd Floor, DT Mega Mall, Sector 28, Gurugram, Haryana – 122001
                 </p>
                 <div className="flex flex-wrap justify-center gap-8 text-sm text-primary-foreground/80">
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
                     <span>founder@grabyourcar.com</span>
                   </div>
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