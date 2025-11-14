import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrotoLogo } from "@/components/BrotoLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, LogOut, Shield, AlertCircle, Clock, CheckCircle2, PlayCircle } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { UpdateComplaintDialog } from "@/components/UpdateComplaintDialog";
import { formatDistanceToNow } from "date-fns";

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

  useEffect(() => {
    checkUser();
  }, []);

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
    navigate('/');
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
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg capitalize">{complaint.category.replace('_', ' ')}</CardTitle>
              <Badge variant={getStatusColor(complaint.status) as any} className="flex items-center gap-1">
                {getStatusIcon(complaint.status)}
                {complaint.status.replace('_', ' ')}
              </Badge>
            </div>
            <CardDescription>
              {complaint.profiles.name} • {complaint.profiles.student_id} • {complaint.profiles.batch}
            </CardDescription>
            <CardDescription className="text-xs">
              {formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => handleUpdateClick(complaint)}>
            Update
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold mb-1">Description</h4>
          <p className="text-muted-foreground text-sm">{complaint.description}</p>
        </div>
        {complaint.admin_feedback && (
          <div className="bg-muted p-3 rounded-lg">
            <h4 className="font-semibold mb-1 text-sm">Your Response</h4>
            <p className="text-sm">{complaint.admin_feedback}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrotoLogo />
              <Badge variant="outline" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Admin
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-semibold">{profile?.name}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Complaint Management</h1>
          <p className="text-muted-foreground">Review and manage student complaints</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-warning/50">
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
              <CardTitle className="text-3xl text-warning">{stats.pending}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>In Progress</CardDescription>
              <CardTitle className="text-3xl">{stats.inProgress}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-success/50">
            <CardHeader className="pb-2">
              <CardDescription>Resolved</CardDescription>
              <CardTitle className="text-3xl text-success">{stats.resolved}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-emergency">
            <CardHeader className="pb-2">
              <CardDescription>Emergency</CardDescription>
              <CardTitle className="text-3xl text-emergency">{stats.emergency}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="emergency">Emergency</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="space-y-4 mt-6">
              {filterComplaints().length === 0 ? (
                <Card className="p-12">
                  <div className="text-center space-y-4">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold text-lg">No complaints</h3>
                      <p className="text-muted-foreground">There are no complaints to display</p>
                    </div>
                  </div>
                </Card>
              ) : (
                filterComplaints().map(complaint => <ComplaintCard key={complaint.id} complaint={complaint} />)
              )}
            </TabsContent>
            <TabsContent value="emergency" className="space-y-4 mt-6">
              {filterComplaints('emergency').length === 0 ? (
                <Card className="p-12">
                  <div className="text-center space-y-4">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
                    <div>
                      <h3 className="font-semibold text-lg">No emergency complaints</h3>
                      <p className="text-muted-foreground">All clear!</p>
                    </div>
                  </div>
                </Card>
              ) : (
                filterComplaints('emergency').map(complaint => <ComplaintCard key={complaint.id} complaint={complaint} />)
              )}
            </TabsContent>
            <TabsContent value="pending" className="space-y-4 mt-6">
              {filterComplaints('pending').length === 0 ? (
                <Card className="p-12">
                  <div className="text-center space-y-4">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
                    <div>
                      <h3 className="font-semibold text-lg">No pending complaints</h3>
                      <p className="text-muted-foreground">All complaints have been acknowledged</p>
                    </div>
                  </div>
                </Card>
              ) : (
                filterComplaints('pending').map(complaint => <ComplaintCard key={complaint.id} complaint={complaint} />)
              )}
            </TabsContent>
            <TabsContent value="in_progress" className="space-y-4 mt-6">
              {filterComplaints('in_progress').length === 0 ? (
                <Card className="p-12">
                  <div className="text-center space-y-4">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold text-lg">No complaints in progress</h3>
                      <p className="text-muted-foreground">No active work items</p>
                    </div>
                  </div>
                </Card>
              ) : (
                filterComplaints('in_progress').map(complaint => <ComplaintCard key={complaint.id} complaint={complaint} />)
              )}
            </TabsContent>
            <TabsContent value="resolved" className="space-y-4 mt-6">
              {filterComplaints('resolved').length === 0 ? (
                <Card className="p-12">
                  <div className="text-center space-y-4">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold text-lg">No resolved complaints</h3>
                      <p className="text-muted-foreground">No complaints have been resolved yet</p>
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
