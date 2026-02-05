-- Enable realtime for leads and hsrp_bookings tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hsrp_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rental_bookings;