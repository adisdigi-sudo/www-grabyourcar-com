import { useState } from "react";
import { Home, Search, Heart, Menu, X, MessageCircle, Phone, User, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "New Cars", href: "#cars" },
  { label: "Compare", href: "/compare" },
  { label: "Car Loans", href: "/car-loans" },
  { label: "Insurance", href: "/car-insurance" },
  { label: "Corporate", href: "/corporate" },
  { label: "Blog", href: "/blog" },
];

export const MobileBottomNav = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/50 safe-area-pb">
        <div className="flex items-center justify-around h-16">
          <Link
            to="/"
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
              isActive("/") ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs font-medium">Home</span>
          </Link>
          
          <Link
            to="#cars"
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors text-muted-foreground hover:text-foreground"
          >
            <Search className="h-5 w-5" />
            <span className="text-xs font-medium">Search</span>
          </Link>
          
          <Link
            to="/favorites"
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
              isActive("/favorites") ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Heart className="h-5 w-5" />
            <span className="text-xs font-medium">Favorites</span>
          </Link>
          
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
              menuOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="text-xs font-medium">Menu</span>
          </button>
        </div>
      </nav>

      {/* Menu Overlay */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col h-full pb-24 px-6 pt-20 overflow-y-auto">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className="px-4 py-4 text-lg font-medium text-foreground hover:bg-muted rounded-xl transition-colors"
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
