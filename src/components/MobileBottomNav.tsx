import { useState } from "react";
import { Home, Search, Heart, Menu, X, Phone, MessageCircle, User, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Search, label: "Search", href: "#cars" },
  { icon: Heart, label: "Favorites", href: "/favorites" },
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
      {/* Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/50 safe-area-pb">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive(item.href)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
          
          {/* Menu Button */}
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

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col h-full pt-20 pb-24 px-6 overflow-y-auto">
            <nav className="flex flex-col gap-2">
              <Link
                to="/"
                className="px-4 py-4 text-lg font-medium text-foreground hover:bg-muted rounded-xl transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                to="#cars"
                className="px-4 py-4 text-lg font-medium text-foreground hover:bg-muted rounded-xl transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                New Cars
              </Link>
              <Link
                to="/compare"
                className="px-4 py-4 text-lg font-medium text-foreground hover:bg-muted rounded-xl transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Compare Cars
              </Link>
              <Link
                to="/car-loans"
                className="px-4 py-4 text-lg font-medium text-foreground hover:bg-muted rounded-xl transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Car Loans
              </Link>
              <Link
                to="/car-insurance"
                className="px-4 py-4 text-lg font-medium text-foreground hover:bg-muted rounded-xl transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Insurance
              </Link>
              <Link
                to="/blog"
                className="px-4 py-4 text-lg font-medium text-foreground hover:bg-muted rounded-xl transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Blog
              </Link>
              
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
            <div className="mt-auto flex gap-3">
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
