import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrotoLogo } from "@/components/BrotoLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, LogOut, Plus, AlertCircle, Clock, CheckCircle2, PlayCircle, Phone, MessageSquare, Bell } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { CreateComplaintDialog } from "@/components/CreateComplaintDialog";
import { ComplaintChat } from "@/components/ComplaintChat";
import { formatDistanceToNow } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NotificationDropdown } from "@/components/NotificationDropdown";

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

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time changes on user's complaints
    const complaintsChannel = supabase
      .channel('student_complaints')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'complaints',
          filter: `student_id=eq.${user.id}`
        },
        () => {
          loadComplaints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(complaintsChannel);
    };
  }, [user]);

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

  // Separate active and resolved complaints
  const activeComplaints = complaints.filter(c => c.status !== 'resolved');
  const resolvedComplaints = complaints.filter(c => c.status === 'resolved');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/student/login');
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
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <BrotoLogo />
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full lg:w-auto">
              <a href="tel:8900089000" className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-emergency hover:text-emergency/80 transition-colors text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span className="font-semibold">Emergency:</span>
                </div>
                <span className="font-semibold sm:ml-0 ml-6">89000 89000</span>
              </a>
              <div className="flex items-center gap-3 w-full sm:w-auto">
              {user && (
                <NotificationDropdown 
                  currentUserId={user.id}
                  onMessageClick={(complaintId) => {
                    const newSet = new Set(expandedChats);
                    newSet.add(complaintId);
                    setExpandedChats(newSet);
                    // Scroll to the complaint with proper offset for header
                    setTimeout(() => {
                      const element = document.getElementById(`complaint-${complaintId}`);
                      if (element) {
                        const yOffset = -100; // Offset for header
                        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                      }
                    }, 300);
                  }}
                />
              )}
                <div className="text-left flex-1 sm:flex-initial min-w-0">
                  <p className="font-semibold text-sm truncate">{profile?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{profile?.student_id} • {profile?.batch}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout} className="flex-shrink-0">
                  <LogOut className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Auto-deletion notice */}
        <Card className="mb-6 border-muted bg-muted/50">
          <CardContent className="py-3 px-4">
            <p className="text-sm text-muted-foreground flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Complaints that are resolved will be automatically deleted after 1 week.</span>
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">My Complaints</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">Track and manage your complaints</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            New Complaint
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : complaints.length === 0 ? (
          <Card className="p-8 md:p-12">
            <div className="text-center space-y-4">
              <AlertCircle className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-base md:text-lg">No complaints yet</h3>
                <p className="text-sm md:text-base text-muted-foreground">Click "New Complaint" to raise your first complaint</p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Active Complaints Section */}
            {activeComplaints.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Active Complaints</h2>
                <div className="grid gap-3 md:gap-4">
                  {activeComplaints.map((complaint) => (
              <Card key={complaint.id} id={`complaint-${complaint.id}`} className={complaint.status === 'emergency' ? 'border-emergency' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base md:text-lg capitalize">{complaint.category.replace('_', ' ')}</CardTitle>
                        <Badge variant={getStatusColor(complaint.status) as any} className="flex items-center gap-1 text-xs">
                          {getStatusIcon(complaint.status)}
                          <span className="hidden sm:inline">{complaint.status.replace('_', ' ')}</span>
                        </Badge>
                      </div>
                      <CardDescription className="text-xs md:text-sm">
                        {formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div>
                    <h4 className="font-semibold mb-1 text-sm md:text-base">Description</h4>
                    <p className="text-muted-foreground text-sm md:text-base">{complaint.description}</p>
                  </div>
                  {complaint.admin_feedback && (
                    <div className="bg-muted p-3 md:p-4 rounded-lg">
                      <h4 className="font-semibold mb-1 text-sm md:text-base">Admin Response</h4>
                      <p className="text-xs md:text-sm">{complaint.admin_feedback}</p>
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
                      <Button variant="outline" className="w-full text-sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {expandedChats.has(complaint.id) ? 'Hide Chat' : 'Chat with Admin'}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3 md:mt-4">
                      {user && <ComplaintChat complaintId={complaint.id} currentUserId={user.id} />}
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Resolved Complaints Section */}
            {resolvedComplaints.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Resolved Complaints</h2>
                <div className="grid gap-3 md:gap-4">
                  {resolvedComplaints.map((complaint) => (
                    <Card key={complaint.id} id={`complaint-${complaint.id}`} className="opacity-75">
                      <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <CardTitle className="text-base md:text-lg capitalize">{complaint.category.replace('_', ' ')}</CardTitle>
                              <Badge variant={getStatusColor(complaint.status) as any} className="flex items-center gap-1 text-xs">
                                {getStatusIcon(complaint.status)}
                                <span className="hidden sm:inline">{complaint.status.replace('_', ' ')}</span>
                              </Badge>
                            </div>
                            <CardDescription className="text-xs md:text-sm">
                              {formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 md:space-y-4">
                        <div>
                          <h4 className="font-semibold mb-1 text-sm md:text-base">Description</h4>
                          <p className="text-muted-foreground text-sm md:text-base">{complaint.description}</p>
                        </div>
                        {complaint.admin_feedback && (
                          <div className="bg-muted p-3 md:p-4 rounded-lg">
                            <h4 className="font-semibold mb-1 text-sm md:text-base">Admin Response</h4>
                            <p className="text-xs md:text-sm">{complaint.admin_feedback}</p>
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
                            <Button variant="outline" className="w-full text-sm">
                              <MessageSquare className="h-4 w-4 mr-2" />
                              {expandedChats.has(complaint.id) ? 'Hide Chat' : 'Chat with Admin'}
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-3 md:mt-4">
                            {user && <ComplaintChat complaintId={complaint.id} currentUserId={user.id} />}
                          </CollapsibleContent>
                        </Collapsible>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
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
