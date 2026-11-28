-- Store the authenticated account name separately from the person named as requester.
ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS prepared_by text;
