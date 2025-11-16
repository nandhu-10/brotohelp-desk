import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrotoLogo } from "@/components/BrotoLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, LogOut, Plus, AlertCircle, Clock, CheckCircle2, PlayCircle, Phone, MessageSquare } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { CreateComplaintDialog } from "@/components/CreateComplaintDialog";
import { ComplaintChat } from "@/components/ComplaintChat";
import { formatDistanceToNow } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Profile {
  name: string;
  student_id: string;
  batch: string;
}

interface Complaint {
  id: string;
  category: string;
  description: string;
  status: string;
  admin_feedback: string | null;
  created_at: string;
  updated_at: string;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [expandedChats, setExpandedChats] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/student/login');
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profileData || profileData.role !== 'student') {
      await supabase.auth.signOut();
      navigate('/student/login');
      return;
    }

    setUser(user);
    setProfile(profileData);
    loadComplaints();
  };

  const loadComplaints = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Failed to load complaints");
    } else {
      setComplaints(data || []);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'emergency':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'in_progress':
        return 'default';
      case 'resolved':
        return 'success';
      case 'emergency':
        return 'emergency';
      default:
        return 'default';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <BrotoLogo />
            <div className="flex items-center gap-4">
              <a href="tel:8900089000" className="flex items-center gap-2 text-emergency hover:text-emergency/80 transition-colors">
                <Phone className="h-4 w-4" />
                <span className="font-semibold">Emergency: 89000 89000</span>
              </a>
              <div className="text-right">
                <p className="font-semibold">{profile?.name}</p>
                <p className="text-sm text-muted-foreground">{profile?.student_id} • {profile?.batch}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Complaints</h1>
            <p className="text-muted-foreground mt-1">Track and manage your complaints</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Complaint
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : complaints.length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">No complaints yet</h3>
                <p className="text-muted-foreground">Click "New Complaint" to raise your first complaint</p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {complaints.map((complaint) => (
              <Card key={complaint.id} className={complaint.status === 'emergency' ? 'border-emergency' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg capitalize">{complaint.category.replace('_', ' ')}</CardTitle>
                        <Badge variant={getStatusColor(complaint.status) as any} className="flex items-center gap-1">
                          {getStatusIcon(complaint.status)}
                          {complaint.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <CardDescription>
                        {formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-1">Description</h4>
                    <p className="text-muted-foreground">{complaint.description}</p>
                  </div>
                  {complaint.admin_feedback && (
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-1">Admin Response</h4>
                      <p className="text-sm">{complaint.admin_feedback}</p>
                    </div>
                  )}
                  
                  <Collapsible
                    open={expandedChats.has(complaint.id)}
                    onOpenChange={(open) => {
                      const newSet = new Set(expandedChats);
                      if (open) {
                        newSet.add(complaint.id);
                      } else {
                        newSet.delete(complaint.id);
                      }
                      setExpandedChats(newSet);
                    }}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {expandedChats.has(complaint.id) ? 'Hide Chat' : 'Chat with Admin'}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4">
                      {user && <ComplaintChat complaintId={complaint.id} currentUserId={user.id} />}
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <CreateComplaintDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false);
          loadComplaints();
        }}
      />
    </div>
  );
};

export default StudentDashboard;
