import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface UnreadMessage {
  id: string;
  complaint_id: string;
  message: string;
  created_at: string;
  sender_id: string;
  complaint: {
    category: string;
    description: string;
  };
  sender: {
    name: string;
    role: string;
  };
}

interface NotificationDropdownProps {
  currentUserId: string;
  onMessageClick: (complaintId: string) => void;
}

export const NotificationDropdown = ({ currentUserId, onMessageClick }: NotificationDropdownProps) => {
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessage[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadUnreadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel('unread_messages_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'complaint_messages'
        },
        () => {
          loadUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const loadUnreadMessages = async () => {
    // Get unread messages
    const { data: messages } = await supabase
      .from('complaint_messages')
      .select(`
        id,
        complaint_id,
        message,
        created_at,
        sender_id
      `)
      .is('read_at', null)
      .neq('sender_id', currentUserId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!messages) return;

    // Get complaint details
    const complaintIds = [...new Set(messages.map(m => m.complaint_id))];
    const { data: complaints } = await supabase
      .from('complaints')
      .select('id, category, description')
      .in('id', complaintIds);

    // Get sender profiles
    const senderIds = [...new Set(messages.map(m => m.sender_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, role')
      .in('id', senderIds);

    const complaintsMap = new Map(complaints?.map(c => [c.id, c]) || []);
    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const messagesWithDetails = messages.map(msg => {
      const complaint = complaintsMap.get(msg.complaint_id);
      const profile = profilesMap.get(msg.sender_id);
      return {
        ...msg,
        complaint: {
          category: complaint?.category || 'Unknown',
          description: complaint?.description || ''
        },
        sender: {
          name: profile?.role === 'admin' ? 'Admin' : (profile?.name || 'Unknown'),
          role: profile?.role || 'student'
        }
      };
    });

    setUnreadMessages(messagesWithDetails);
  };

  const handleMessageClick = async (messageId: string, complaintId: string) => {
    // Mark message as read
    await supabase
      .from('complaint_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId);

    setOpen(false);
    onMessageClick(complaintId);
    loadUnreadMessages();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          className="relative cursor-pointer hover:opacity-80 transition-opacity"
          title={unreadMessages.length > 0 ? `${unreadMessages.length} unread messages` : 'No unread messages'}
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadMessages.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
              {unreadMessages.length > 9 ? '9+' : unreadMessages.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b p-3">
          <h4 className="font-semibold text-sm">Notifications</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {unreadMessages.length === 0 ? 'No unread messages' : `${unreadMessages.length} unread message${unreadMessages.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <ScrollArea className="h-[300px]">
          {unreadMessages.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">No new messages</p>
            </div>
          ) : (
            <div className="divide-y">
              {unreadMessages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => handleMessageClick(msg.id, msg.complaint_id)}
                  className="w-full text-left p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs font-semibold truncate">
                          {msg.sender.name}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground capitalize mb-1">
                        {msg.complaint.category.replace('_', ' ')}
                      </p>
                      <p className="text-sm line-clamp-2">{msg.message}</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
