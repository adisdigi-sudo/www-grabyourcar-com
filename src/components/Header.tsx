import { Phone, MessageCircle, Heart, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoImage from "@/assets/logo-option-4.png";

const navLinks = [
  { label: "New Cars", href: "/cars" },
  { label: "Find Your Car", href: "/car-finder", highlight: true },
  { label: "Compare", href: "/compare" },
  { label: "Car Loans", href: "/car-loans" },
  { label: "Insurance", href: "/car-insurance" },
  { label: "Corporate", href: "/corporate" },
  { label: "Accessories", href: "/accessories" },
  { label: "Blog", href: "/blog" },
];

export const Header = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImage} alt="Grabyourcar" className="h-10 md:h-12 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className={`text-sm font-medium transition-colors ${
                  link.highlight 
                    ? "text-accent hover:text-accent/80 font-semibold" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-2 md:gap-3">
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
            
            <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer">
              <Button variant="whatsapp" size="sm" className="hidden md:flex">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
            </a>
            <a href="tel:+919876543210">
              <Button variant="call" size="sm" className="hidden md:flex">
                <Phone className="h-4 w-4" />
                Call Now
              </Button>
            </a>
            <Button variant="cta" size="sm" className="hidden sm:flex">
              Get Best Deal
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
