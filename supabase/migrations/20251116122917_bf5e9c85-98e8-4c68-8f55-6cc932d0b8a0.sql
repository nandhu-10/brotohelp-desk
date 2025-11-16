-- Create complaint messages table for follow-up questions and live chat
CREATE TABLE public.complaint_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.complaint_messages ENABLE ROW LEVEL SECURITY;

-- Students can view messages for their complaints
CREATE POLICY "Students can view messages for their complaints"
ON public.complaint_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.complaints
    WHERE complaints.id = complaint_messages.complaint_id
    AND complaints.student_id = auth.uid()
  )
);

-- Students can send messages for their complaints
CREATE POLICY "Students can send messages for their complaints"
ON public.complaint_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.complaints
    WHERE complaints.id = complaint_messages.complaint_id
    AND complaints.student_id = auth.uid()
  )
  AND sender_id = auth.uid()
);

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
ON public.complaint_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can send messages to any complaint
CREATE POLICY "Admins can send messages to any complaint"
ON public.complaint_messages
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND sender_id = auth.uid());

-- Admins can mark messages as read
CREATE POLICY "Admins can update message read status"
ON public.complaint_messages
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaint_messages;

-- Create index for faster queries
CREATE INDEX idx_complaint_messages_complaint_id ON public.complaint_messages(complaint_id);
CREATE INDEX idx_complaint_messages_created_at ON public.complaint_messages(created_at DESC);