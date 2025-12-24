-- Create a table for accessory wishlist
CREATE TABLE public.accessory_wishlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  accessory_id INTEGER NOT NULL,
  accessory_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, accessory_id)
);

-- Enable Row Level Security
ALTER TABLE public.accessory_wishlist ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own wishlist" 
ON public.accessory_wishlist 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own wishlist" 
ON public.accessory_wishlist 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own wishlist" 
ON public.accessory_wishlist 
FOR DELETE 
USING (auth.uid() = user_id);