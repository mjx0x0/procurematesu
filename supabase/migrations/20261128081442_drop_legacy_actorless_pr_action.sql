-- Remove the legacy service-role-only RPC signature that did not accept an actor ID.
-- All application stage updates now call the actor-aware six-argument function.
DROP FUNCTION IF EXISTS public.process_purchase_request_action(text, text, text, text, text);
