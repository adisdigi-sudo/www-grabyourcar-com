import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { cars } from "@/data/carsData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Loader2, Car, Trash2 } from "lucide-react";

const MyFavorites = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { favorites, loading: favLoading, removeFavorite } = useFavorites();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || favLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  const favoriteCars = favorites
    .map((fav) => cars.find((car) => car.id === fav.car_id))
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Heart className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-heading font-bold">My Favorites</h1>
              <p className="text-muted-foreground">Cars you have saved for later</p>
            </div>
          </div>

          {favoriteCars.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteCars.map((car) => car && (
                <Card key={car.id} className="overflow-hidden group">
                  <div className="relative">
                    <img
                      src={car.image}
                      alt={car.name}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFavorite(car.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {car.isHot && (
                      <Badge className="absolute top-3 left-3 bg-red-500">Hot Deal</Badge>
                    )}
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-heading font-semibold text-lg mb-1">{car.name}</h3>
                    <p className="text-foreground font-bold text-lg mb-3">{car.price}</p>
                    <div className="flex gap-2 mb-4">
                      {car.fuelTypes.map((fuel) => (
                        <Badge key={fuel} variant="secondary" className="text-xs">
                          {fuel}
                        </Badge>
                      ))}
                    </div>
                    <Link to={`/car/${car.slug}`}>
                      <Button className="w-full">View Details</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <Car className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-heading font-semibold mb-2">No favorites yet</h2>
              <p className="text-muted-foreground mb-6">
                Start exploring cars and add your favorites to see them here.
              </p>
              <Link to="/#cars">
                <Button>Browse Cars</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default MyFavorites;