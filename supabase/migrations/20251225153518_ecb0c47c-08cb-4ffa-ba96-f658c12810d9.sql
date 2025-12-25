-- Add foreign key constraint to chat_conversations
ALTER TABLE public.chat_conversations
ADD CONSTRAINT chat_conversations_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Also add FK constraint to accessory_wishlist for consistency
ALTER TABLE public.accessory_wishlist
ADD CONSTRAINT accessory_wishlist_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;