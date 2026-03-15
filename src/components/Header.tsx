import { useState } from "react";
import { Phone, MessageCircle, Heart, User, LogOut, Settings, Home, Search, Menu, X, ChevronDown, Car, CreditCard, Shield, Package, Building2, CarFront, RectangleHorizontal, Calendar, ShoppingBag, MapPin, Brain, Newspaper, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ResponsiveLogo } from "@/components/ResponsiveLogo";

const services = [
  {
    title: "Explore New Cars",
    href: "/cars",
    description: "Browse new cars with pan-India deals",
    icon: Car,
  },
  {
    title: "Auto Intelligence",
    href: "/auto-intelligence",
    description: "AI-powered news, launches & insights",
    icon: Brain,
    badge: "New",
  },
  {
    title: "Car Finance",
    href: "/car-loans",
    description: "Best rates from banks & NBFCs",
    icon: CreditCard,
  },
  {
    title: "Insurance Solutions",
    href: "/car-insurance",
    description: "Compare & buy car insurance online",
    icon: Shield,
  },
  {
    title: "Premium Accessories",
    href: "/accessories",
    description: "Car accessories & add-ons",
    icon: Package,
  },
  {
    title: "HSRP Registration",
    href: "/hsrp",
    description: "Book High Security Registration Plates",
    icon: RectangleHorizontal,
  },
  {
    title: "Find Nearby Dealers",
    href: "/dealers",
    description: "Find nearest authorized showrooms",
    icon: MapPin,
  },
  {
    title: "Corporate & Fleet Sales",
    href: "/corporate",
    description: "Bulk & fleet car purchases",
    icon: Building2,
  },
  {
    title: "Self-Drive Car Rentals",
    href: "/self-drive",
    description: "Rent cars on demand",
    icon: CarFront,
  },
];

const quickLinks = [
  { label: "Compare Cars", href: "/compare" },
  { label: "Features & Specs", href: "/features-specs" },
  { label: "Auto News", href: "/auto-news" },
  { label: "Blog", href: "/blog" },
   { label: "About Us", href: "/about" },
];


export const Header = () => {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
  };

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  return (
    <>
      <header className="sticky top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 md:h-16 lg:h-20 gap-2">
            {/* Mobile Menu Button - Left side */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={cn(
                "lg:hidden flex items-center justify-center h-9 w-9 rounded-lg transition-colors flex-shrink-0",
                menuOpen ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Logo - Responsive & Backend-Managed */}
            <Link to="/" className="flex items-center flex-shrink-0">
              <ResponsiveLogo variant="header" />
            </Link>

            {/* Desktop Navigation with Mega Menu */}
            <NavigationMenu className="hidden lg:flex">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-muted-foreground hover:text-foreground">
                    Services
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[640px] p-4 bg-card border border-border rounded-xl shadow-xl">
                      <div className="grid grid-cols-2 gap-1.5">
                        {services.map((service) => (
                          <Link
                            key={service.title}
                            to={service.href}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
                          >
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                              <service.icon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground text-sm">{service.title}</span>
                            {(service as any).badge && (
                              <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-semibold">
                                {(service as any).badge}
                              </span>
                            )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{service.description}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                {quickLinks.map((link) => (
                  <NavigationMenuItem key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm font-medium px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>

            {/* Theme Toggle & CTA Buttons */}
            <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
              <ThemeToggle />
              {user ? (
                <>
                  <Link to="/favorites">
                    <Button variant="ghost" size="sm" className="hidden md:flex">
                      <Heart className="h-4 w-4" />
                      Favorites
                    </Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="hidden md:flex">
                        <User className="h-4 w-4" />
                        Account
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-muted-foreground text-xs">
                        {user.email}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/favorites" className="cursor-pointer">
                          <Heart className="h-4 w-4 mr-2" />
                          My Favorites
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/my-bookings" className="cursor-pointer">
                          <Calendar className="h-4 w-4 mr-2" />
                          My Bookings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/my-orders" className="cursor-pointer">
                          <ShoppingBag className="h-4 w-4 mr-2" />
                          My Orders
                        </Link>
                      </DropdownMenuItem>
                      {/* Admin link removed from public menu for security - access via /admin directly */}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Link to="/auth">
                  <Button variant="outline" size="sm" className="hidden md:flex">
                    <User className="h-4 w-4" />
                    Login
                  </Button>
                </Link>
              )}
              
               <a href="https://wa.me/1155578093?text=Hi%20Grabyourcar!%20I%27m%20interested%20in%20buying%20a%20new%20car%20and%20would%20like%20to%20speak%20with%20an%20expert." target="_blank" rel="noopener noreferrer">
                 <Button variant="whatsapp" size="sm" className="hidden md:flex gap-1.5 font-semibold hover:scale-105 transition-transform px-5">
                   <MessageCircle className="h-4 w-4" />
                   Talk to Expert
                 </Button>
               </a>
            </div>
          </div>
        </div>

        {/* Mobile Top Navigation Bar - Home, Search, Favorites only */}
        <div className="md:hidden border-t border-border/50 bg-card/95">
          <div className="flex items-center justify-around h-11">
            <Link
              to="/"
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                isActive("/") ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Home className="h-5 w-5" />
              <span className="text-[10px] font-medium">Home</span>
            </Link>
            
            <Link
              to="/cars"
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                isActive("/cars") ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Search className="h-5 w-5" />
              <span className="text-[10px] font-medium">Search</span>
            </Link>
            
            <Link
              to="/favorites"
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                isActive("/favorites") ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Heart className="h-5 w-5" />
              <span className="text-[10px] font-medium">Favorites</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm animate-fade-in pt-[6.5rem]">
          <div className="flex flex-col h-full pb-24 px-5 overflow-y-auto">
            <nav className="flex flex-col gap-1">
              <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Services</p>
              {services.map((service) => (
                <Link
                  key={service.title}
                  to={service.href}
                  className="px-4 py-3 text-base font-medium text-foreground hover:bg-muted rounded-xl transition-colors flex items-center gap-3"
                  onClick={() => setMenuOpen(false)}
                >
                  <service.icon className="h-5 w-5 text-primary" />
                  <span className="flex-1">{service.title}</span>
                </Link>
              ))}
              
              <div className="border-t border-border/50 my-3" />
              <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Links</p>
              {quickLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className="px-4 py-3 text-base font-medium text-foreground hover:bg-muted rounded-xl transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              
              <div className="border-t border-border/50 my-4" />
              
              {user ? (
                <>
                  <Link
                    to="/favorites"
                    className="px-4 py-4 text-lg font-medium text-foreground hover:bg-muted rounded-xl transition-colors flex items-center gap-3"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Heart className="h-5 w-5" />
                    My Favorites
                  </Link>
                  {/* Admin link removed from mobile menu for security - access via /admin directly */}
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    {user.email}
                  </div>
                  <button
                    className="px-4 py-4 text-lg font-medium text-destructive hover:bg-muted rounded-xl transition-colors flex items-center gap-3 text-left"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  className="px-4 py-4 text-lg font-medium text-primary hover:bg-muted rounded-xl transition-colors flex items-center gap-3"
                  onClick={() => setMenuOpen(false)}
                >
                  <User className="h-5 w-5" />
                  Login / Sign Up
                </Link>
              )}
            </nav>

            {/* Contact Buttons */}
            <div className="mt-auto flex gap-3 pb-4">
              <a href="https://wa.me/1155578093" target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="whatsapp" className="w-full h-12">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  WhatsApp
                </Button>
              </a>
              <a href="tel:+1155578093" className="flex-1">
                <Button variant="call" className="w-full h-12">
                  <Phone className="h-5 w-5 mr-2" />
                  Call Now
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
