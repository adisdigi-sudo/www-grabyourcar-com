import { QueryClient } from "@tanstack/react-query";

/**
 * Centralized cache invalidation helpers.
 * After any admin mutation, call the relevant helper so BOTH
 * the admin panel AND the public frontend get fresh data.
 */

export const invalidateCarQueries = (queryClient: QueryClient) => {
  // Admin queries
  queryClient.invalidateQueries({ queryKey: ['unifiedCarManagement'] });
  queryClient.invalidateQueries({ queryKey: ['adminCarImages'] });
  queryClient.invalidateQueries({ queryKey: ['admin-cars'] });
  queryClient.invalidateQueries({ queryKey: ['admin-car-image-status'] });
  // Frontend queries
  queryClient.invalidateQueries({ queryKey: ['cars'] });
  queryClient.invalidateQueries({ queryKey: ['car'] });
  queryClient.invalidateQueries({ queryKey: ['allCars'] });
  queryClient.invalidateQueries({ queryKey: ['car-images'] });
  queryClient.invalidateQueries({ queryKey: ['car-colors'] });
  queryClient.invalidateQueries({ queryKey: ['car-variants'] });
  queryClient.invalidateQueries({ queryKey: ['car-specifications'] });
  queryClient.invalidateQueries({ queryKey: ['car-features'] });
  queryClient.invalidateQueries({ queryKey: ['car-brochures'] });
  queryClient.invalidateQueries({ queryKey: ['car-offers'] });
  queryClient.invalidateQueries({ queryKey: ['city-pricing'] });
  queryClient.invalidateQueries({ queryKey: ['databaseStatus'] });
};

export const invalidateAccessoryQueries = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['adminAccessoryOrders'] });
  queryClient.invalidateQueries({ queryKey: ['accessory-orders'] });
  queryClient.invalidateQueries({ queryKey: ['admin-accessory-orders'] });
  queryClient.invalidateQueries({ queryKey: ['accessory-wishlist'] });
};

export const invalidateRentalQueries = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['adminRentals'] });
  queryClient.invalidateQueries({ queryKey: ['rental-services'] });
  queryClient.invalidateQueries({ queryKey: ['rental-vehicles'] });
  queryClient.invalidateQueries({ queryKey: ['admin-rental-vehicles'] });
  queryClient.invalidateQueries({ queryKey: ['driver-bookings'] });
  queryClient.invalidateQueries({ queryKey: ['admin-driver-bookings'] });
};
