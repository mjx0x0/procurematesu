-- Allow a signed-in user to delete only their own notification records.
-- Admin notification actions are restricted to rows addressed to that administrator.
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

CREATE POLICY "Users can delete own notifications"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));
