import { useState } from "react";
import { Phone, MessageCircle, Heart, User, LogOut, Menu, X } from "lucide-react";
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
  { label: "New Cars", href: "#cars" },
  { label: "Compare", href: "/compare" },
  { label: "Car Loans", href: "/car-loans" },
  { label: "Insurance", href: "/car-insurance" },
  { label: "Blog", href: "/blog" },
];

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      <header className="sticky top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <img src={logoImage} alt="Grabyourcar" className="h-10 md:h-12 w-auto" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
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
              
              {/* Mobile Menu Toggle */}
              <button
                className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm animate-fade-in pt-16">
          <div className="flex flex-col h-full pb-24 px-6 overflow-y-auto">
            <nav className="flex flex-col gap-2 pt-4">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className="px-4 py-4 text-lg font-medium text-foreground hover:bg-muted rounded-xl transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
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
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Heart className="h-5 w-5" />
                    My Favorites
                  </Link>
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    {user.email}
                  </div>
                  <button
                    className="px-4 py-4 text-lg font-medium text-destructive hover:bg-muted rounded-xl transition-colors flex items-center gap-3 text-left"
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  className="px-4 py-4 text-lg font-medium text-primary hover:bg-muted rounded-xl transition-colors flex items-center gap-3"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-5 w-5" />
                  Login / Sign Up
                </Link>
              )}
            </nav>

            {/* Contact Buttons */}
            <div className="mt-auto flex gap-3 pb-4">
              <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="whatsapp" className="w-full h-12">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  WhatsApp
                </Button>
              </a>
              <a href="tel:+919876543210" className="flex-1">
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
