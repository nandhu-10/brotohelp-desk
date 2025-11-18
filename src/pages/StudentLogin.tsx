import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrotoLogo } from "@/components/BrotoLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Home } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  password: z.string().min(1, "Password is required"),
});

const StudentLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Check if already logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile?.role === 'student') {
          navigate('/student');
        }
      }
    };
    checkUser();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      loginSchema.parse({ studentId, password });
      setErrors({});
      setLoading(true);

      // First, get the email associated with this student ID using the secure function
      const { data: email, error: emailError } = await supabase
        .rpc('get_email_by_student_id', { _student_id: studentId });

      if (emailError || !email) {
        toast.error("Invalid Student ID");
        return;
      }

      // Now login with the email
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        toast.error("Invalid credentials");
        return;
      }

      // Verify the user is a student
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profile?.role !== 'student') {
        await supabase.auth.signOut();
        toast.error("This account is not a student account");
        return;
      }

      toast.success("Login successful!");
      navigate("/student");
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-blue-500/5 to-blue-500/10 relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
      >
        <Home className="h-4 w-4 mr-2" />
        Home
      </Button>
      <Card className="w-full max-w-md border-2 border-blue-500/30 bg-gradient-to-br from-card to-blue-500/5">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <BrotoLogo />
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <CardTitle className="text-2xl text-center">Student Login</CardTitle>
          </div>
          <CardDescription className="text-center">
            Login with your Student ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="studentId">Student ID</Label>
              <Input
                id="studentId"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
              />
              {errors.studentId && <p className="text-sm text-destructive">{errors.studentId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/student/register" className="text-primary hover:underline">
                Register here
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentLogin;
