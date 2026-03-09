import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ScanLine, Eye, EyeOff, Mail, Lock, Sparkles } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Account created! Please check your email.");
        navigate("/onboarding");
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-accent">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-float delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/20 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      <Card className="w-full max-w-md mx-4 relative z-10 shadow-2xl border-0 glass-panel animate-scale-in">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-2xl blur-lg opacity-75 animate-pulse"></div>
              <div className="relative p-4 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg">
                <ScanLine className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              FoodScan AI
            </CardTitle>
            <CardDescription className="text-base font-medium text-foreground/80">
              {isLogin ? "Welcome back! Sign in to continue" : "Create your account to get started"}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          <form onSubmit={handleAuth} className="space-y-5">
            {/* Email Input */}
            <div className="relative">
              <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-200 ${emailFocused || email ? 'text-primary' : 'text-muted-foreground'}`}>
                <Mail className="w-5 h-5" />
              </div>
              <Input
                id="email"
                type="email"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                required
                className={`pl-11 h-14 text-lg transition-all duration-200 border-2 ${emailFocused
                    ? 'border-primary shadow-lg shadow-primary/20'
                    : 'border-border focus:border-primary'
                  } rounded-xl bg-background/50 backdrop-blur-sm`}
              />
              <Label
                htmlFor="email"
                className={`absolute left-11 top-1/2 -translate-y-1/2 text-base transition-all duration-200 pointer-events-none ${emailFocused || email
                    ? '-translate-y-8 text-xs text-primary font-medium'
                    : 'text-muted-foreground'
                  }`}
              >
                Email Address
              </Label>
            </div>

            {/* Password Input */}
            <div className="relative">
              <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-200 ${passwordFocused || password ? 'text-primary' : 'text-muted-foreground'}`}>
                <Lock className="w-5 h-5" />
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                required
                minLength={6}
                className={`pl-11 pr-14 h-14 text-lg transition-all duration-200 border-2 ${passwordFocused
                    ? 'border-primary shadow-lg shadow-primary/20'
                    : 'border-border focus:border-primary'
                  } rounded-xl bg-background/50 backdrop-blur-sm`}
              />
              <Label
                htmlFor="password"
                className={`absolute left-11 top-1/2 -translate-y-1/2 text-base transition-all duration-200 pointer-events-none ${passwordFocused || password
                    ? '-translate-y-8 text-xs text-primary font-medium'
                    : 'text-muted-foreground'
                  }`}
              >
                Password
              </Label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-primary/10"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-primary/40 rounded-xl"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <span className="flex items-center gap-2 text-white">
                  {isLogin ? "Sign In" : "Create Account"}
                  <Sparkles className="w-5 h-5 text-white" />
                </span>
              )}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
