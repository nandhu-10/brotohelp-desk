-- Add RLS policy to allow students to mark messages as read for their complaints
CREATE POLICY "Students can update message read status for their complaints"
ON public.complaint_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM complaints
    WHERE complaints.id = complaint_messages.complaint_id
    AND complaints.student_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM complaints
    WHERE complaints.id = complaint_messages.complaint_id
    AND complaints.student_id = auth.uid()
  )
);