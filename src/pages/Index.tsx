import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrotoLogo } from "@/components/BrotoLogo";
import { Shield, User, AlertCircle } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-4">
          <BrotoLogo />
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Simple and efficient complaint management system for Brototype students
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-8 border-2 hover:border-primary/50 transition-all cursor-pointer group" onClick={() => navigate('/student/login')}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Student Portal</h2>
              </div>
              <p className="text-muted-foreground">
                Raise complaints, track status, and get help with your issues
              </p>
              <div className="space-y-2">
                <Button className="w-full" onClick={(e) => { e.stopPropagation(); navigate('/student/login'); }}>
                  Student Login
                </Button>
                <Button variant="outline" className="w-full" onClick={(e) => { e.stopPropagation(); navigate('/student/register'); }}>
                  Register New Account
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-8 border-2 border-primary/20 hover:border-primary/50 transition-all cursor-pointer group" onClick={() => navigate('/admin/login')}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Admin Portal</h2>
              </div>
              <p className="text-muted-foreground">
                Manage all complaints, update status, and provide support
              </p>
              <Button className="w-full" onClick={(e) => { e.stopPropagation(); navigate('/admin/login'); }}>
                Admin Login
              </Button>
            </div>
          </Card>
        </div>

        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold">Emergency Complaints</h3>
              <p className="text-sm text-muted-foreground">
                Students can mark complaints as emergency for immediate attention. Emergency complaints are highlighted in the admin dashboard.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Index;
