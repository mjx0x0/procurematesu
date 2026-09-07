-- Keep chat history compatible with both the legacy `assistant` sender
-- and the current `ai` sender used by the chat UI/API.
-- Both render as assistant messages in the client.

ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_sender_check;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_sender_check
  CHECK (sender = ANY (ARRAY['user'::text, 'ai'::text, 'assistant'::text]));
