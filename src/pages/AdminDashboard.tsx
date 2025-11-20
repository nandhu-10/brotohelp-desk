import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrotoLogo } from "@/components/BrotoLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, LogOut, Shield, AlertCircle, Clock, CheckCircle2, PlayCircle, MessageSquare, Phone, Bell, Filter } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { UpdateComplaintDialog } from "@/components/UpdateComplaintDialog";
import { ComplaintChat } from "@/components/ComplaintChat";
import { formatDistanceToNow, isToday, parseISO } from "date-fns";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("today");
  const [expandedChats, setExpandedChats] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [filterDate, setFilterDate] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStudentId, setFilterStudentId] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time changes on complaints
    const complaintsChannel = supabase
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
      supabase.removeChannel(complaintsChannel);
    };
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [complaints, activeTab, filterDate, filterCategory, filterStudentId, filterStatus]);

  const applyFilters = () => {
    let filtered = [...complaints];

    // Apply tab filter
    if (activeTab === "today") {
      filtered = filtered.filter(c => 
        (isToday(parseISO(c.created_at)) || c.status !== 'resolved')
      );
    }

    // Apply advanced filters
    if (filterDate) {
      filtered = filtered.filter(c => 
        c.created_at.startsWith(filterDate)
      );
    }

    if (filterCategory !== "all") {
      filtered = filtered.filter(c => c.category === filterCategory);
    }

    if (filterStudentId) {
      filtered = filtered.filter(c => 
        c.profiles.student_id.toLowerCase().includes(filterStudentId.toLowerCase())
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    setFilteredComplaints(filtered);
  };

  const clearFilters = () => {
    setFilterDate("");
    setFilterCategory("all");
    setFilterStudentId("");
    setFilterStatus("all");
  };

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

  const filterByStatus = (status: string) => {
    return filteredComplaints.filter(c => c.status === status);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
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
              <div className="flex items-center gap-3 lg:gap-4 w-full sm:w-auto">
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
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="font-semibold text-sm truncate">{profile?.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Administrator</p>
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Complaint Management</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">Review and manage student complaints</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="w-full sm:w-auto"
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>

        {showFilters && (
          <Card className="p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  placeholder="Filter by date"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="hostel">Hostel</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Student ID</label>
                <Input
                  value={filterStudentId}
                  onChange={(e) => setFilterStudentId(e.target.value)}
                  placeholder="Search by student ID"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-grid">
            <TabsTrigger value="today" className="text-xs md:text-sm">
              Today & Unresolved
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs md:text-sm">
              All Complaints
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredComplaints.length === 0 ? (
              <Card className="p-8 md:p-12">
                <div className="text-center space-y-4">
                  <AlertCircle className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold text-base md:text-lg">No complaints found</h3>
                    <p className="text-sm md:text-base text-muted-foreground">
                      {activeTab === "today" 
                        ? "No complaints for today or unresolved complaints" 
                        : "Try adjusting your filters"}
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <>
                {['emergency', 'pending', 'in_progress', 'resolved'].map(status => {
                  const statusComplaints = filterByStatus(status);
                  if (statusComplaints.length === 0) return null;

                  return (
                    <div key={status} className="space-y-3">
                      <h3 className="text-lg font-semibold capitalize flex items-center gap-2">
                        {getStatusIcon(status)}
                        {status.replace('_', ' ')} ({statusComplaints.length})
                      </h3>
                      <div className="grid gap-3 md:gap-4">
                        {statusComplaints.map((complaint) => (
                          <Card key={complaint.id} id={`complaint-${complaint.id}`} className={complaint.status === 'emergency' ? 'border-emergency' : ''}>
                            <CardHeader className="pb-3">
                              <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                                <div className="space-y-1 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <CardTitle className="text-base md:text-lg capitalize">
                                      {complaint.category.replace('_', ' ')}
                                    </CardTitle>
                                    <Badge variant={getStatusColor(complaint.status) as any} className="flex items-center gap-1 text-xs">
                                      {getStatusIcon(complaint.status)}
                                      <span className="hidden sm:inline">{complaint.status.replace('_', ' ')}</span>
                                    </Badge>
                                  </div>
                                  <CardDescription className="text-xs md:text-sm">
                                    {complaint.profiles.name} • {complaint.profiles.student_id} • {complaint.profiles.batch}
                                  </CardDescription>
                                  <CardDescription className="text-xs md:text-sm">
                                    {formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}
                                  </CardDescription>
                                </div>
                                <Button 
                                  onClick={() => handleUpdateClick(complaint)} 
                                  size="sm"
                                  className="w-full sm:w-auto"
                                >
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
                                <div className="bg-muted p-3 md:p-4 rounded-lg">
                                  <h4 className="font-semibold mb-1 text-sm md:text-base">Your Response</h4>
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
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </TabsContent>
        </Tabs>
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
