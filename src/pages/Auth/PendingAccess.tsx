import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, LogOut } from "lucide-react";

export default function PendingAccess() {
  const { logout, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user somehow gets another role, maybe redirect them to home
    if (!hasRole("PENDING_USER") && hasRole("SUPER_ADMIN")) {
      navigate("/");
    }
  }, [hasRole, navigate]);

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-zinc-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-600/20 to-transparent dark:from-blue-900/20 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm sm:max-w-md z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
        <div className="flex justify-center mb-5 sm:mb-8">
          <div className="h-12 w-12 sm:h-14 sm:w-14 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl flex items-center justify-center border border-slate-200 dark:border-zinc-800">
            <Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600 dark:text-blue-500" />
          </div>
        </div>

        <Card className="border-slate-200/60 dark:border-zinc-800/60 shadow-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl sm:rounded-[24px] overflow-hidden">
          <CardHeader className="space-y-1.5 text-center pt-6 sm:pt-8 pb-4 sm:pb-6">
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
              Access Pending
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-medium">
              Your account has been created successfully, but requires administrator approval for access.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400 pb-6 px-4 sm:px-6">
            <p>Please contact your system administrator to assign the appropriate roles and permissions to your account.</p>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3 justify-center pb-6 sm:pb-8 pt-3 sm:pt-4 border-t border-slate-100 dark:border-zinc-800/50 mt-1 bg-slate-50/50 dark:bg-zinc-950/30 px-4 sm:px-6">
             <Button 
                variant="outline"
                className="w-full h-10 sm:h-12 text-xs sm:text-sm rounded-xl border-slate-200 dark:border-zinc-800 bg-card hover:bg-muted transition-all"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
