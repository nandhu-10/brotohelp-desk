import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrotoLogo } from "@/components/BrotoLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, LogOut, Shield, AlertCircle, Clock, CheckCircle2, PlayCircle, MessageSquare, Phone } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { UpdateComplaintDialog } from "@/components/UpdateComplaintDialog";
import { ComplaintChat } from "@/components/ComplaintChat";
import { formatDistanceToNow } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Profile {
  name: string;
  email: string;
}

interface Complaint {
  id: string;
  category: string;
  description: string;
  status: string;
  admin_feedback: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    name: string;
    student_id: string;
    batch: string;
  };
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [expandedChats, setExpandedChats] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time changes on complaints
    const channel = supabase
      .channel('admin_complaints')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'complaints'
        },
        () => {
          loadComplaints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/admin/login');
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profileData || profileData.role !== 'admin') {
      await supabase.auth.signOut();
      navigate('/admin/login');
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
      .select(`
        *,
        profiles:student_id (
          name,
          student_id,
          batch
        )
      `)
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
    navigate('/admin/login');
  };

  const handleUpdateClick = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowUpdateDialog(true);
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

  const filterComplaints = (status?: string) => {
    if (!status || status === 'all') return complaints;
    return complaints.filter(c => c.status === status);
  };

  const getStats = () => {
    return {
      total: complaints.length,
      pending: complaints.filter(c => c.status === 'pending').length,
      inProgress: complaints.filter(c => c.status === 'in_progress').length,
      resolved: complaints.filter(c => c.status === 'resolved').length,
      emergency: complaints.filter(c => c.status === 'emergency').length,
    };
  };

  const stats = getStats();

  const ComplaintCard = ({ complaint }: { complaint: Complaint }) => (
    <Card key={complaint.id} className={complaint.status === 'emergency' ? 'border-emergency border-2' : ''}>
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
              {complaint.profiles.name} • {complaint.profiles.student_id} • {complaint.profiles.batch}
            </CardDescription>
            <CardDescription className="text-xs">
              {formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => handleUpdateClick(complaint)} className="w-full sm:w-auto">
            Update
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4">
        <div>
          <h4 className="font-semibold mb-1 text-sm md:text-base">Description</h4>
          <p className="text-muted-foreground text-sm md:text-base">{complaint.description}</p>
        </div>
        {complaint.admin_feedback && (
          <div className="bg-muted p-3 rounded-lg">
            <h4 className="font-semibold mb-1 text-sm">Your Response</h4>
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
              {expandedChats.has(complaint.id) ? 'Hide Chat' : 'Chat with Student'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 md:mt-4">
            {user && <ComplaintChat complaintId={complaint.id} currentUserId={user.id} />}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BrotoLogo />
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <Shield className="h-3 w-3" />
                Admin
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <a href="tel:8900089000" className="flex items-center gap-2 text-emergency hover:text-emergency/80 transition-colors text-sm">
                <Phone className="h-4 w-4" />
                <span className="font-semibold">Emergency: 89000 89000</span>
              </a>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="text-left flex-1 sm:flex-initial">
                  <p className="font-semibold text-sm">{profile?.name}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Complaint Management</h1>
          <p className="text-sm md:text-base text-muted-foreground">Review and manage student complaints</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2 md:pb-3">
              <CardDescription className="text-xs md:text-sm">Total</CardDescription>
              <CardTitle className="text-2xl md:text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-warning/50">
            <CardHeader className="pb-2 md:pb-3">
              <CardDescription className="text-xs md:text-sm">Pending</CardDescription>
              <CardTitle className="text-2xl md:text-3xl text-warning">{stats.pending}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2 md:pb-3">
              <CardDescription className="text-xs md:text-sm">In Progress</CardDescription>
              <CardTitle className="text-2xl md:text-3xl">{stats.inProgress}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-success/50">
            <CardHeader className="pb-2 md:pb-3">
              <CardDescription className="text-xs md:text-sm">Resolved</CardDescription>
              <CardTitle className="text-2xl md:text-3xl text-success">{stats.resolved}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-emergency">
            <CardHeader className="pb-2 md:pb-3">
              <CardDescription className="text-xs md:text-sm">Emergency</CardDescription>
              <CardTitle className="text-2xl md:text-3xl text-emergency">{stats.emergency}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 h-auto">
              <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
              <TabsTrigger value="emergency" className="text-xs sm:text-sm">Emergency</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs sm:text-sm">Pending</TabsTrigger>
              <TabsTrigger value="in_progress" className="text-xs sm:text-sm">In Progress</TabsTrigger>
              <TabsTrigger value="resolved" className="text-xs sm:text-sm">Resolved</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
              {filterComplaints().length === 0 ? (
                <Card className="p-8 md:p-12">
                  <div className="text-center space-y-4">
                    <AlertCircle className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold text-base md:text-lg">No complaints</h3>
                      <p className="text-sm md:text-base text-muted-foreground">There are no complaints to display</p>
                    </div>
                  </div>
                </Card>
              ) : (
                filterComplaints().map(complaint => <ComplaintCard key={complaint.id} complaint={complaint} />)
              )}
            </TabsContent>
            <TabsContent value="emergency" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
              {filterComplaints('emergency').length === 0 ? (
                <Card className="p-8 md:p-12">
                  <div className="text-center space-y-4">
                    <CheckCircle2 className="h-10 w-10 md:h-12 md:w-12 mx-auto text-success" />
                    <div>
                      <h3 className="font-semibold text-base md:text-lg">No emergency complaints</h3>
                      <p className="text-sm md:text-base text-muted-foreground">All clear!</p>
                    </div>
                  </div>
                </Card>
              ) : (
                filterComplaints('emergency').map(complaint => <ComplaintCard key={complaint.id} complaint={complaint} />)
              )}
            </TabsContent>
            <TabsContent value="pending" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
              {filterComplaints('pending').length === 0 ? (
                <Card className="p-8 md:p-12">
                  <div className="text-center space-y-4">
                    <CheckCircle2 className="h-10 w-10 md:h-12 md:w-12 mx-auto text-success" />
                    <div>
                      <h3 className="font-semibold text-base md:text-lg">No pending complaints</h3>
                      <p className="text-sm md:text-base text-muted-foreground">All complaints have been acknowledged</p>
                    </div>
                  </div>
                </Card>
              ) : (
                filterComplaints('pending').map(complaint => <ComplaintCard key={complaint.id} complaint={complaint} />)
              )}
            </TabsContent>
            <TabsContent value="in_progress" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
              {filterComplaints('in_progress').length === 0 ? (
                <Card className="p-8 md:p-12">
                  <div className="text-center space-y-4">
                    <Clock className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold text-base md:text-lg">No complaints in progress</h3>
                      <p className="text-sm md:text-base text-muted-foreground">No active work items</p>
                    </div>
                  </div>
                </Card>
              ) : (
                filterComplaints('in_progress').map(complaint => <ComplaintCard key={complaint.id} complaint={complaint} />)
              )}
            </TabsContent>
            <TabsContent value="resolved" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
              {filterComplaints('resolved').length === 0 ? (
                <Card className="p-8 md:p-12">
                  <div className="text-center space-y-4">
                    <AlertCircle className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold text-base md:text-lg">No resolved complaints</h3>
                      <p className="text-sm md:text-base text-muted-foreground">No complaints have been resolved yet</p>
                    </div>
                  </div>
                </Card>
              ) : (
                filterComplaints('resolved').map(complaint => <ComplaintCard key={complaint.id} complaint={complaint} />)
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      {selectedComplaint && (
        <UpdateComplaintDialog
          open={showUpdateDialog}
          onOpenChange={setShowUpdateDialog}
          complaint={selectedComplaint}
          onSuccess={() => {
            setShowUpdateDialog(false);
            loadComplaints();
          }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
