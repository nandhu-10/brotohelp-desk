import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface UpdateComplaintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  complaint: {
    id: string;
    status: string;
    admin_feedback: string | null;
  };
  onSuccess: () => void;
}

export const UpdateComplaintDialog = ({ open, onOpenChange, complaint, onSuccess }: UpdateComplaintDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(complaint.status);
  const [feedback, setFeedback] = useState(complaint.admin_feedback || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const updateData: any = {
      status: status,
      admin_feedback: feedback || null,
      updated_at: new Date().toISOString(),
    };

    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('complaints')
      .update(updateData)
      .eq('id', complaint.id);

    if (error) {
      toast.error("Failed to update complaint");
    } else {
      toast.success("Complaint updated successfully!");
      onSuccess();
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Complaint</DialogTitle>
          <DialogDescription>
            Update the status and provide feedback to the student
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">Admin Feedback</Label>
            <Textarea
              id="feedback"
              placeholder="Provide feedback or updates to the student..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Complaint
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
