import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender_profile?: {
    name: string;
    role: string;
  };
}

interface ComplaintChatProps {
  complaintId: string;
  currentUserId: string;
}

export const ComplaintChat = ({ complaintId, currentUserId }: ComplaintChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    
    // Subscribe to new messages
    const channel = supabase
      .channel(`complaint_messages_${complaintId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'complaint_messages',
          filter: `complaint_id=eq.${complaintId}`
        },
        (payload) => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [complaintId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const loadMessages = async () => {
    setLoading(true);
    const { data: messagesData, error: messagesError } = await supabase
      .from('complaint_messages')
      .select('id, sender_id, message, created_at')
      .eq('complaint_id', complaintId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      toast.error("Failed to load messages");
      setLoading(false);
      return;
    }

    // Get sender profiles
    const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, role')
      .in('id', senderIds);

    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    const messagesWithProfiles = messagesData.map(msg => {
      const profile = profilesMap.get(msg.sender_id);
      return {
        ...msg,
        sender_profile: profile ? {
          name: profile.role === 'admin' ? 'Admin' : profile.name,
          role: profile.role
        } : {
          name: 'Unknown',
          role: 'student'
        }
      };
    });

    setMessages(messagesWithProfiles);
    setLoading(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    const { error } = await supabase
      .from('complaint_messages')
      .insert({
        complaint_id: complaintId,
        sender_id: currentUserId,
        message: newMessage.trim(),
      });

    if (error) {
      toast.error("Failed to send message");
    } else {
      setNewMessage("");
    }
    setSending(false);
  };

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="bg-muted/50 rounded-lg p-3 md:p-4">
        <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm md:text-base">
          <Send className="h-4 w-4" />
          Chat with Admin
        </h4>
        
        <ScrollArea className="h-[250px] md:h-[300px] mb-3 pr-2 md:pr-4">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-xs md:text-sm text-muted-foreground text-center py-6 md:py-8">
              No messages yet. Start a conversation!
            </p>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {messages.map((msg) => {
                const isCurrentUser = msg.sender_id === currentUserId;
                const senderName = msg.sender_profile?.name || 'Unknown';
                const isAdmin = msg.sender_profile?.role === 'admin';
                
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[80%] rounded-lg p-2 md:p-3 ${
                        isCurrentUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 md:gap-2 mb-1">
                        <p className="text-[10px] md:text-xs font-semibold">
                          {isCurrentUser ? 'You' : senderName}
                          {isAdmin && !isCurrentUser && ' (Admin)'}
                        </p>
                        <p className="text-[10px] md:text-xs opacity-70">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <p className="text-xs md:text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            rows={2}
            className="flex-1 text-sm md:text-base"
            disabled={sending}
          />
          <Button type="submit" disabled={sending || !newMessage.trim()} size="sm" className="h-auto">
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5 md:h-4 md:w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};