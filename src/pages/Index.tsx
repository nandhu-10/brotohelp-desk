import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrotoLogo } from "@/components/BrotoLogo";
import { Shield, User, AlertCircle, Phone } from "lucide-react";

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
          <Card className="p-8 border-2 border-blue-500/30 hover:border-blue-500/50 transition-all cursor-pointer group bg-gradient-to-br from-card to-blue-500/5" onClick={() => navigate('/student/login')}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                  <User className="h-6 w-6 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold">Student Portal</h2>
              </div>
              <p className="text-muted-foreground">
                Raise complaints, track status, and get help with your issues
              </p>
              <div className="space-y-2">
                <Button className="w-full bg-blue-500 hover:bg-blue-600" onClick={(e) => { e.stopPropagation(); navigate('/student/login'); }}>
                  Student Login
                </Button>
                <Button variant="outline" className="w-full border-blue-500/50 hover:bg-blue-500/10" onClick={(e) => { e.stopPropagation(); navigate('/student/register'); }}>
                  Register New Account
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-8 border-2 border-primary/30 hover:border-primary/50 transition-all cursor-pointer group bg-gradient-to-br from-card to-primary/5" onClick={() => navigate('/admin/login')}>
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
        
        <Card className="p-6 bg-emergency/10 border-emergency/30">
          <div className="flex items-center justify-center gap-4">
            <Phone className="h-6 w-6 text-emergency" />
            <div>
              <h3 className="font-semibold text-lg">Emergency Contact</h3>
              <a href="tel:8900089000" className="text-2xl font-bold text-emergency hover:text-emergency/80 transition-colors">
                89000 89000
              </a>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-muted/50 border-border">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
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
