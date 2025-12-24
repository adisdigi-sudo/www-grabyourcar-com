import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface WishlistItem {
  id: string;
  accessory_id: number;
  accessory_name: string;
  created_at: string;
}

export const useAccessoryWishlist = () => {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWishlist();
    } else {
      setWishlist([]);
      setLoading(false);
    }
  }, [user]);

  const fetchWishlist = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("accessory_wishlist")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      setWishlist(data || []);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    } finally {
      setLoading(false);
    }
  };

  const addToWishlist = async (accessoryId: number, accessoryName: string) => {
    if (!user) {
      toast.error("Please login to save to wishlist");
      return false;
    }

    try {
      const { error } = await supabase.from("accessory_wishlist").insert({
        user_id: user.id,
        accessory_id: accessoryId,
        accessory_name: accessoryName,
      });

      if (error) {
        if (error.code === "23505") {
          toast.info("Already in wishlist");
          return false;
        }
        throw error;
      }

      toast.success("Added to wishlist");
      fetchWishlist();
      return true;
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      toast.error("Failed to add to wishlist");
      return false;
    }
  };

  const removeFromWishlist = async (accessoryId: number) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("accessory_wishlist")
        .delete()
        .eq("user_id", user.id)
        .eq("accessory_id", accessoryId);

      if (error) throw error;

      toast.success("Removed from wishlist");
      fetchWishlist();
      return true;
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      toast.error("Failed to remove from wishlist");
      return false;
    }
  };

  const isInWishlist = (accessoryId: number) => {
    return wishlist.some((item) => item.accessory_id === accessoryId);
  };

  const toggleWishlist = async (accessoryId: number, accessoryName: string) => {
    if (isInWishlist(accessoryId)) {
      return removeFromWishlist(accessoryId);
    } else {
      return addToWishlist(accessoryId, accessoryName);
    }
  };

  return {
    wishlist,
    loading,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    toggleWishlist,
  };
};
