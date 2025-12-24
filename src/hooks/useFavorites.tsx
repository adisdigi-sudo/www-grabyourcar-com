import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface Favorite {
  id: string;
  car_id: number;
  car_slug: string;
  created_at: string;
}

export const useFavorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    } else {
      setFavorites([]);
      setLoading(false);
    }
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const addFavorite = async (carId: number, carSlug: string) => {
    if (!user) {
      toast.error("Please login to save favorites");
      return false;
    }

    try {
      const { error } = await supabase.from("favorites").insert({
        user_id: user.id,
        car_id: carId,
        car_slug: carSlug,
      });

      if (error) {
        if (error.code === "23505") {
          toast.info("Car already in favorites");
          return false;
        }
        throw error;
      }

      toast.success("Added to favorites");
      fetchFavorites();
      return true;
    } catch (error) {
      console.error("Error adding favorite:", error);
      toast.error("Failed to add favorite");
      return false;
    }
  };

  const removeFavorite = async (carId: number) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("car_id", carId);

      if (error) throw error;

      toast.success("Removed from favorites");
      fetchFavorites();
      return true;
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast.error("Failed to remove favorite");
      return false;
    }
  };

  const isFavorite = (carId: number) => {
    return favorites.some((fav) => fav.car_id === carId);
  };

  const toggleFavorite = async (carId: number, carSlug: string) => {
    if (isFavorite(carId)) {
      return removeFavorite(carId);
    } else {
      return addFavorite(carId, carSlug);
    }
  };

  return {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
  };
};