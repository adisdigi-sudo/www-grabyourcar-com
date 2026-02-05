 import { useState } from "react";
 import { 
   Car, 
   MessageCircle, 
   IndianRupee, 
   Clock, 
   FileText, 
   TestTube2, 
   Gift, 
   Calculator, 
   Shield, 
   Users,
   Sparkles,
   ChevronRight,
   Phone
 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { cn } from "@/lib/utils";
 import { motion, AnimatePresence } from "framer-motion";
 import { supabase } from "@/integrations/supabase/client";
 
 const WHATSAPP_NUMBER = "919577200023";
 
 // Comprehensive WhatsApp message templates for the lead engine
 export const leadEngineMessages = {
   // Car Purchase Journey
   unlockBestDeal: (carName?: string) => 
     carName 
       ? `Hi GrabYourCar! 🚗\n\nI want to *unlock the best deal* on *${carName}*.\n\nPlease share:\n✅ Best on-road price\n✅ Current offers & discounts\n✅ Available stock/waiting period\n\nThanks!`
       : `Hi GrabYourCar! 🚗\n\nI want to *unlock the best deal* on a new car.\n\nPlease help me find the right car with the best price!\n\nThanks!`,
   
   getOnRoadPrice: (carName?: string, variant?: string, city?: string) => 
     carName
       ? `Hi GrabYourCar! 💰\n\nI need the *complete on-road price* for:\n\n🚗 Car: *${carName}*${variant ? `\n📋 Variant: *${variant}*` : ''}${city ? `\n📍 City: *${city}*` : ''}\n\nPlease share detailed price breakup:\n• Ex-showroom\n• RTO & Taxes\n• Insurance\n• Accessories (if any)\n\nThanks!`
       : `Hi GrabYourCar! 💰\n\nI need help with *on-road pricing* for a new car.\n\nPlease share detailed price breakup options.\n\nThanks!`,
   
   checkWaitingPeriod: (carName?: string, variant?: string) =>
     carName
       ? `Hi GrabYourCar! ⏰\n\nWhat's the *current waiting period* for:\n\n🚗 *${carName}*${variant ? ` - ${variant}` : ''}\n\nAlso, do you have any *ready stock* available?\n\nThanks!`
       : `Hi GrabYourCar! ⏰\n\nI want to check *waiting periods* for popular cars.\n\nAlso interested in *ready stock* options.\n\nThanks!`,
   
   bookTestDrive: (carName?: string, city?: string) =>
     carName
       ? `Hi GrabYourCar! 🚗\n\nI'd like to *book a test drive* for:\n\n🚗 *${carName}*${city ? `\n📍 City: *${city}*` : ''}\n\nPlease share available slots and nearest showroom details.\n\nThanks!`
       : `Hi GrabYourCar! 🚗\n\nI'd like to *book a test drive*.\n\nPlease help me schedule at the nearest showroom.\n\nThanks!`,
   
   downloadBrochure: (carName?: string) =>
     carName
       ? `Hi GrabYourCar! 📄\n\nPlease share the *official brochure* for *${carName}*.\n\nAlso include:\n• Variant comparison\n• Features list\n• Color options\n\nThanks!`
       : `Hi GrabYourCar! 📄\n\nI need *car brochures* for comparison.\n\nPlease share options based on my requirements.\n\nThanks!`,
   
   getOffers: (carName?: string) =>
     carName
       ? `Hi GrabYourCar! 🎁\n\nWhat are the *latest offers* on *${carName}*?\n\n• Cash discounts\n• Exchange bonus\n• Free accessories\n• Finance offers\n\nThanks!`
       : `Hi GrabYourCar! 🎁\n\nWhat are the *best offers* available on new cars right now?\n\nThanks!`,
   
   speakToExpert: (carName?: string) =>
     carName
       ? `Hi GrabYourCar! 👋\n\nI need *expert advice* on *${carName}*.\n\nI have questions about:\n• Best variant for my needs\n• Ownership costs\n• Comparison with alternatives\n\nPlease connect me with a car expert.\n\nThanks!`
       : `Hi GrabYourCar! 👋\n\nI need *expert advice* to choose the right car.\n\nPlease connect me with a car expert.\n\nThanks!`,
   
   // Finance & Insurance
   calculateEMI: (carName?: string, loanAmount?: number) =>
     carName
       ? `Hi GrabYourCar! 🏦\n\nI need *EMI details* for *${carName}*${loanAmount ? ` (Loan: ₹${(loanAmount/100000).toFixed(1)}L)` : ''}.\n\nPlease share:\n• Best interest rates\n• EMI options\n• Required documents\n• Bank partners\n\nThanks!`
       : `Hi GrabYourCar! 🏦\n\nI need help with *car loan/EMI calculation*.\n\nPlease share the best financing options.\n\nThanks!`,
   
   getInsurance: (carName?: string) =>
     carName
       ? `Hi GrabYourCar! 🛡️\n\nI need *insurance quotes* for *${carName}*.\n\nPlease share:\n• Best premium rates\n• Coverage comparison\n• Add-on options\n\nThanks!`
       : `Hi GrabYourCar! 🛡️\n\nI need help with *car insurance*.\n\nPlease share the best quotes and coverage options.\n\nThanks!`,
   
   // Corporate
   corporateInquiry: (companyName?: string, quantity?: number) =>
     `Hi GrabYourCar! 🏢\n\nI'm interested in *corporate/fleet purchase*.\n\n${companyName ? `🏢 Company: *${companyName}*\n` : ''}${quantity ? `📊 Quantity: *${quantity}+ vehicles*\n` : ''}\nPlease share:\n• Bulk discounts\n• Fleet management options\n• Leasing solutions\n\nThanks!`,
   
   // Variant Comparison
   compareVariants: (carName?: string) =>
     carName
       ? `Hi GrabYourCar! 📊\n\nI need help *comparing variants* of *${carName}*.\n\nPlease share:\n• Price differences\n• Feature comparison\n• Best value variant\n\nThanks!`
       : `Hi GrabYourCar! 📊\n\nI need help *comparing car variants*.\n\nPlease guide me!\n\nThanks!`,
 };
 
 // Get WhatsApp URL with encoded message
 export const getWhatsAppUrl = (message: string): string => {
   return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
 };
 
 // Track WhatsApp click
 const trackWhatsAppClick = async (trigger: string, context?: string) => {
   try {
     await supabase.from('analytics_events').insert({
       event_type: 'whatsapp_lead_engine',
       page_url: window.location.pathname,
       device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
       event_data: {
         trigger,
         context: context || 'general',
         timestamp: new Date().toISOString(),
       },
     });
   } catch (error) {
     console.error('Failed to track WhatsApp click:', error);
   }
 };
 
 // Intelligent trigger types
 type TriggerType = 
   | 'unlockBestDeal'
   | 'getOnRoadPrice'
   | 'checkWaitingPeriod'
   | 'bookTestDrive'
   | 'downloadBrochure'
   | 'getOffers'
   | 'speakToExpert'
   | 'calculateEMI'
   | 'getInsurance'
   | 'corporateInquiry'
   | 'compareVariants';
 
 interface TriggerConfig {
   label: string;
   shortLabel: string;
   icon: React.ElementType;
   color: string;
   description: string;
 }
 
 const triggerConfigs: Record<TriggerType, TriggerConfig> = {
   unlockBestDeal: {
     label: "Unlock Best Deal",
     shortLabel: "Best Deal",
     icon: Sparkles,
     color: "from-primary to-success",
     description: "Get exclusive discounts & offers",
   },
   getOnRoadPrice: {
     label: "Get On-Road Price",
     shortLabel: "On-Road Price",
     icon: IndianRupee,
     color: "from-success to-primary",
     description: "Complete price breakup for your city",
   },
   checkWaitingPeriod: {
     label: "Check Waiting Period",
     shortLabel: "Waiting Period",
     icon: Clock,
     color: "from-accent to-primary",
     description: "Know delivery timeline & stock",
   },
   bookTestDrive: {
     label: "Book Test Drive",
     shortLabel: "Test Drive",
     icon: Car,
     color: "from-primary to-accent",
     description: "Schedule at nearest showroom",
   },
   downloadBrochure: {
     label: "Get Brochure",
     shortLabel: "Brochure",
     icon: FileText,
     color: "from-muted-foreground to-foreground",
     description: "Download official specifications",
   },
   getOffers: {
     label: "View Current Offers",
     shortLabel: "Offers",
     icon: Gift,
     color: "from-destructive to-accent",
     description: "Discounts, exchange bonus & more",
   },
   speakToExpert: {
     label: "Speak to Car Expert",
     shortLabel: "Expert",
     icon: Users,
     color: "from-primary to-success",
     description: "Get personalized guidance",
   },
   calculateEMI: {
     label: "Calculate EMI",
     shortLabel: "EMI",
     icon: Calculator,
     color: "from-success to-accent",
     description: "Best loan rates & EMI options",
   },
   getInsurance: {
     label: "Get Insurance Quote",
     shortLabel: "Insurance",
     icon: Shield,
     color: "from-primary to-success",
     description: "Compare & save on premiums",
   },
   corporateInquiry: {
     label: "Corporate Inquiry",
     shortLabel: "Corporate",
     icon: Users,
     color: "from-foreground to-muted-foreground",
     description: "Fleet & bulk purchase deals",
   },
   compareVariants: {
     label: "Compare Variants",
     shortLabel: "Compare",
     icon: Car,
     color: "from-accent to-primary",
     description: "Find the best value variant",
   },
 };
 
 interface WhatsAppTriggerButtonProps {
   trigger: TriggerType;
   carName?: string;
   variant?: string;
   city?: string;
   loanAmount?: number;
   size?: "sm" | "default" | "lg";
   fullWidth?: boolean;
   showDescription?: boolean;
   className?: string;
 }
 
 /**
  * Intelligent WhatsApp Trigger Button
  */
 export const WhatsAppTriggerButton = ({
   trigger,
   carName,
   variant,
   city,
   loanAmount,
   size = "default",
   fullWidth = false,
   showDescription = false,
   className,
 }: WhatsAppTriggerButtonProps) => {
   const config = triggerConfigs[trigger];
   const Icon = config.icon;
   
   // Get the appropriate message based on trigger type
   const getMessage = (): string => {
     switch (trigger) {
       case 'unlockBestDeal':
         return leadEngineMessages.unlockBestDeal(carName);
       case 'getOnRoadPrice':
         return leadEngineMessages.getOnRoadPrice(carName, variant, city);
       case 'checkWaitingPeriod':
         return leadEngineMessages.checkWaitingPeriod(carName, variant);
       case 'bookTestDrive':
         return leadEngineMessages.bookTestDrive(carName, city);
       case 'downloadBrochure':
         return leadEngineMessages.downloadBrochure(carName);
       case 'getOffers':
         return leadEngineMessages.getOffers(carName);
       case 'speakToExpert':
         return leadEngineMessages.speakToExpert(carName);
       case 'calculateEMI':
         return leadEngineMessages.calculateEMI(carName, loanAmount);
       case 'getInsurance':
         return leadEngineMessages.getInsurance(carName);
       case 'corporateInquiry':
         return leadEngineMessages.corporateInquiry();
       case 'compareVariants':
         return leadEngineMessages.compareVariants(carName);
       default:
         return leadEngineMessages.unlockBestDeal(carName);
     }
   };
 
   const handleClick = () => {
     trackWhatsAppClick(trigger, carName || 'general');
   };
 
   const sizeClasses = {
     sm: "h-9 text-sm px-3",
     default: "h-10 px-4",
     lg: "h-12 text-base px-6",
   };
 
   return (
     <a
       href={getWhatsAppUrl(getMessage())}
       target="_blank"
       rel="noopener noreferrer"
       onClick={handleClick}
       className={cn(fullWidth && "w-full", "block")}
     >
       <Button
         variant="whatsapp"
         className={cn(
           sizeClasses[size],
           fullWidth && "w-full",
           "font-semibold gap-2 hover:scale-[1.02] transition-all",
           className
         )}
       >
         <Icon className={cn(size === "sm" ? "h-4 w-4" : "h-5 w-5")} />
         <span>{size === "sm" ? config.shortLabel : config.label}</span>
         <ChevronRight className={cn(size === "sm" ? "h-3 w-3" : "h-4 w-4", "opacity-60")} />
       </Button>
       {showDescription && (
         <p className="text-xs text-muted-foreground mt-1 text-center">
           {config.description}
         </p>
       )}
     </a>
   );
 };
 
 interface WhatsAppQuickActionsProps {
   carName?: string;
   variant?: string;
   city?: string;
   triggers?: TriggerType[];
   layout?: "horizontal" | "vertical" | "grid";
   size?: "sm" | "default";
   className?: string;
 }
 
 /**
  * Quick Actions Grid - Multiple WhatsApp triggers in a compact layout
  */
 export const WhatsAppQuickActions = ({
   carName,
   variant,
   city,
   triggers = ['unlockBestDeal', 'getOnRoadPrice', 'checkWaitingPeriod', 'bookTestDrive'],
   layout = "horizontal",
   size = "sm",
   className,
 }: WhatsAppQuickActionsProps) => {
   const layoutClasses = {
     horizontal: "flex flex-wrap gap-2",
     vertical: "flex flex-col gap-2",
     grid: "grid grid-cols-2 gap-2",
   };
 
   return (
     <div className={cn(layoutClasses[layout], className)}>
       {triggers.map((trigger) => (
         <WhatsAppTriggerButton
           key={trigger}
           trigger={trigger}
           carName={carName}
           variant={variant}
           city={city}
           size={size}
           fullWidth={layout === "vertical" || layout === "grid"}
         />
       ))}
     </div>
   );
 };
 
 interface WhatsAppConversionCardProps {
   carName?: string;
   variant?: string;
   exShowroomPrice?: number;
   className?: string;
 }
 
 /**
  * Full Conversion Card - Premium WhatsApp lead capture
  */
 export const WhatsAppConversionCard = ({
   carName,
   variant,
   exShowroomPrice,
   className,
 }: WhatsAppConversionCardProps) => {
   const [hoveredTrigger, setHoveredTrigger] = useState<TriggerType | null>(null);
 
   const primaryTriggers: TriggerType[] = ['unlockBestDeal', 'getOnRoadPrice', 'bookTestDrive'];
   const secondaryTriggers: TriggerType[] = ['checkWaitingPeriod', 'getOffers', 'calculateEMI'];
 
   return (
     <Card className={cn("border-2 border-success/30 overflow-hidden", className)}>
       {/* Header */}
       <div className="bg-gradient-to-r from-[#25D366] to-[#128C7E] p-4 text-white">
         <div className="flex items-center gap-3">
           <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
             <MessageCircle className="h-6 w-6" />
           </div>
           <div>
             <h3 className="font-bold text-lg">Complete Your Journey on WhatsApp</h3>
             <p className="text-sm text-white/80">Instant responses • Expert guidance • Best deals</p>
           </div>
         </div>
       </div>
 
       <CardContent className="p-4 space-y-4">
         {/* Primary Actions */}
         <div className="space-y-2">
           <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
             Quick Actions
           </p>
           <div className="grid gap-2">
             {primaryTriggers.map((trigger) => {
               const config = triggerConfigs[trigger];
               const Icon = config.icon;
               
               return (
                 <a
                   key={trigger}
                   href={getWhatsAppUrl(
                     trigger === 'unlockBestDeal' ? leadEngineMessages.unlockBestDeal(carName) :
                     trigger === 'getOnRoadPrice' ? leadEngineMessages.getOnRoadPrice(carName, variant) :
                     leadEngineMessages.bookTestDrive(carName)
                   )}
                   target="_blank"
                   rel="noopener noreferrer"
                   onClick={() => trackWhatsAppClick(trigger, carName)}
                   onMouseEnter={() => setHoveredTrigger(trigger)}
                   onMouseLeave={() => setHoveredTrigger(null)}
                   className="group"
                 >
                   <motion.div
                     whileHover={{ scale: 1.02 }}
                     whileTap={{ scale: 0.98 }}
                     className={cn(
                       "flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
                       "border-success/20 hover:border-success hover:bg-success/5"
                     )}
                   >
                     <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                       <Icon className="h-5 w-5 text-success" />
                     </div>
                     <div className="flex-1">
                       <p className="font-semibold text-sm">{config.label}</p>
                       <p className="text-xs text-muted-foreground">{config.description}</p>
                     </div>
                     <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-success transition-colors" />
                   </motion.div>
                 </a>
               );
             })}
           </div>
         </div>
 
         {/* Secondary Actions */}
         <div className="space-y-2">
           <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
             More Options
           </p>
           <div className="flex flex-wrap gap-2">
             {secondaryTriggers.map((trigger) => (
               <WhatsAppTriggerButton
                 key={trigger}
                 trigger={trigger}
                 carName={carName}
                 variant={variant}
                 loanAmount={exShowroomPrice ? exShowroomPrice * 0.85 : undefined}
                 size="sm"
               />
             ))}
           </div>
         </div>
 
         {/* Trust Indicators */}
         <div className="flex items-center justify-center gap-4 pt-2 border-t border-border text-xs text-muted-foreground">
           <span className="flex items-center gap-1">
             <Sparkles className="h-3 w-3 text-success" />
             Instant Response
           </span>
           <span className="flex items-center gap-1">
             <Shield className="h-3 w-3 text-success" />
             Verified Dealers
           </span>
           <span className="flex items-center gap-1">
             <Users className="h-3 w-3 text-success" />
             Expert Team
           </span>
         </div>
       </CardContent>
     </Card>
   );
 };
 
 /**
  * Floating WhatsApp Conversion Bar - Fixed at bottom
  */
 export const WhatsAppConversionBar = ({
   carName,
   className,
 }: {
   carName?: string;
   className?: string;
 }) => {
   return (
     <motion.div
       initial={{ y: 100 }}
       animate={{ y: 0 }}
       className={cn(
         "fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-r from-[#25D366] to-[#128C7E] p-3 shadow-xl",
         className
       )}
     >
       <div className="container mx-auto">
         <div className="flex items-center justify-between gap-4">
           <div className="flex items-center gap-3 text-white">
             <MessageCircle className="h-6 w-6" />
             <div>
               <p className="font-bold text-sm md:text-base">
                 {carName ? `Interested in ${carName}?` : 'Need help buying a car?'}
               </p>
               <p className="text-xs text-white/80 hidden sm:block">
                 Chat with our experts for instant assistance
               </p>
             </div>
           </div>
           <div className="flex gap-2">
             <a
               href={getWhatsAppUrl(leadEngineMessages.unlockBestDeal(carName))}
               target="_blank"
               rel="noopener noreferrer"
               onClick={() => trackWhatsAppClick('unlockBestDeal', carName)}
             >
               <Button variant="secondary" size="sm" className="font-semibold gap-2">
                 <Sparkles className="h-4 w-4" />
                 <span className="hidden sm:inline">Unlock Best Deal</span>
                 <span className="sm:hidden">Best Deal</span>
               </Button>
             </a>
             <a href="tel:+919577200023">
               <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                 <Phone className="h-4 w-4" />
               </Button>
             </a>
           </div>
         </div>
       </div>
     </motion.div>
   );
 };