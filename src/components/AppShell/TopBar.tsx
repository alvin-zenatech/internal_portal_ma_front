import { useState, useEffect, useRef } from "react";
import { Search, Building2, FileText, Loader2, LogOut, User, Mail, BellRing, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import ThemeSwitch from "./ThemeSwitch";
import { useGlobalSearch } from "@/hooks/useSearch";
import { useAuth } from "@/lib/AuthContext";



function TopBarClock() {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const dayName = currentTime.toLocaleDateString("en-US", { weekday: "short" });
  const monthName = currentTime.toLocaleDateString("en-US", { month: "short" });
  const formattedDate = `${monthName}, ${currentTime.getDate()} ${currentTime.getFullYear()} (${dayName})`;
  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <div className="hidden lg:flex flex-col items-end justify-center mr-2">
      <span className="text-sm font-bold text-foreground leading-tight tracking-tight">
        {formattedTime}
      </span>
      <span className="text-[11px] font-semibold text-muted-foreground mt-0.5">
        {formattedDate}
      </span>
    </div>
  );
}


export default function TopBar() {
  const [inputValue, setInputValue] = useState("");
  const [debouncedValue, setDebouncedValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [inAppAlerts, setInAppAlerts] = useState(() => localStorage.getItem("inAppAlerts") !== "false");
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, roles, logout } = useAuth();
  // Debounce input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(inputValue);
    }, 300);
    return () => clearTimeout(handler);
  }, [inputValue]);

  const { data: results = [], isLoading, isFetching } = useGlobalSearch(debouncedValue);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "company": return <Building2 className="h-4 w-4 text-blue-500" />;
      case "task": return <FileText className="h-4 w-4 text-amber-500" />;
      default: return <Search className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleResultClick = (url: string) => {
    setIsOpen(false);
    setInputValue("");
    setDebouncedValue("");
    if (url) {
      navigate(url);
    }
  };

  return (
    <header className="h-20 border-b border-border bg-card text-card-foreground flex items-center justify-between px-4 sm:px-6 md:px-8 shrink-0 transition-all duration-300 gap-4">
      <div className="flex-1 flex items-center min-w-0">
        <div ref={containerRef} className="relative w-full max-w-md z-50">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search for anything here..." 
            className="w-full pl-11 bg-muted border-none rounded-full h-11 text-sm shadow-inner focus-visible:ring-1 focus-visible:ring-ring"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (inputValue.trim().length > 0) setIsOpen(true);
            }}
          />
          
          {isOpen && debouncedValue.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border shadow-lg rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {isLoading || isFetching ? (
                <div className="p-6 flex items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm">Searching...</span>
                </div>
              ) : results.length > 0 ? (
                <div className="max-h-[400px] overflow-y-auto py-2">
                  {results.map((result: any, idx: number) => {
                    return (
                      <div 
                        key={`${result.url}-${idx}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleResultClick(result.url)}
                      >
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border/50 shadow-sm text-muted-foreground">
                          {getIcon(result.type)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-foreground truncate">{result.title}</span>
                          {result.subtitle && <span className="text-xs text-muted-foreground truncate">{result.subtitle}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 flex flex-col items-center justify-center text-center">
                  <span className="text-sm text-muted-foreground">
                    No results found for "{debouncedValue}"
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4 md:gap-5 shrink-0">
        <TopBarClock />
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div><ThemeSwitch /></div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Toggle Theme</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:bg-muted p-1.5 sm:p-2 sm:pr-3 rounded-xl transition-colors border border-transparent hover:border-border outline-none">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0 border border-border shadow-sm">
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || user?.email || "User")}&background=eff6ff&color=2563eb&rounded=true&bold=true`} alt="User avatar" className="h-full w-full object-cover" />
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-sm font-bold text-foreground leading-tight">{user?.full_name || "User"}</span>
                <span className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                  {user?.is_super_admin ? "Super Admin" : roles.length > 0 ? roles[0].name : "Standard User"}
                </span>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setIsProfileOpen(true)} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setIsLogoutOpen(true)} 
              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-100 dark:focus:bg-red-900/30"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[600px] p-0 overflow-hidden border-border/50 shadow-2xl rounded-2xl flex flex-col">
          <div className="bg-muted/30 border-b px-8 py-8 flex items-center gap-5">
            <div className="h-20 w-20 rounded-full border-2 border-border bg-muted overflow-hidden shadow-sm relative group">
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || user?.email || "User")}&background=eff6ff&color=2563eb&rounded=true&bold=true`} alt="User avatar" className="h-full w-full object-cover" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">{user?.full_name || "User"}</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                {user?.email} • {user?.is_super_admin ? "Super Admin" : roles.length > 0 ? roles.map(r => r.name).join(", ") : "Standard User"}
              </DialogDescription>
            </div>
          </div>
          
          <Tabs defaultValue="general" className="w-full flex-1 flex flex-col">
            <div className="px-8 pt-6">
              <TabsList className="grid w-full grid-cols-2 h-11 bg-muted/50">
                <TabsTrigger value="general" className="rounded-md font-semibold text-xs uppercase tracking-wider">General</TabsTrigger>
                <TabsTrigger value="preferences" className="rounded-md font-semibold text-xs uppercase tracking-wider">Preferences</TabsTrigger>
              </TabsList>
            </div>

            <div className="px-8 py-6 flex-1 overflow-y-auto max-h-[60vh]">
              <TabsContent value="general" className="space-y-6 mt-0 border-none outline-none">
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name</Label>
                    <Input id="firstName" readOnly defaultValue={user?.full_name || ""} className="bg-muted/30 border-border focus-visible:ring-primary/30 h-11" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department</Label>
                      <Input readOnly defaultValue="Finance & Operations" className="bg-muted/30 border-border text-muted-foreground h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Roles</Label>
                      <Input readOnly value={user?.is_super_admin ? "Super Admin" : roles.length > 0 ? roles.map(r => r.name).join(", ") : "Standard User"} className="bg-muted/30 border-border text-muted-foreground h-11" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</Label>
                    <Input id="email" type="text" readOnly defaultValue={user?.email || ""} className="bg-muted/30 border-border h-10" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preferences" className="space-y-6 mt-0 border-none outline-none">
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-muted-foreground" /> App Settings
                  </h4>
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Theme Preference</Label>
                      <p className="text-xs text-muted-foreground">Select your preferred interface theme</p>
                    </div>
                    <ThemeSwitch />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card opacity-70">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" /> Email Notifications
                      </Label>
                      <p className="text-xs text-muted-foreground">Receive daily digest emails</p>
                    </div>
                    <div className="h-5 w-9 bg-primary/20 rounded-full relative cursor-not-allowed">
                      <div className="h-4 w-4 bg-primary rounded-full absolute right-0.5 top-0.5" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <BellRing className="h-3.5 w-3.5" /> In-App Alerts
                      </Label>
                      <p className="text-xs text-muted-foreground">Show push notifications</p>
                    </div>
                    <div 
                      className={`h-5 w-9 rounded-full relative cursor-pointer transition-colors ${inAppAlerts ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                      onClick={() => {
                        const newVal = !inAppAlerts;
                        setInAppAlerts(newVal);
                        localStorage.setItem("inAppAlerts", String(newVal));
                      }}
                    >
                      <div className={`h-4 w-4 bg-background rounded-full absolute top-0.5 transition-all ${inAppAlerts ? 'right-0.5' : 'left-0.5'}`} />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
          
        </DialogContent>
      </Dialog>

      <Dialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
        <DialogContent className="sm:max-w-[425px] outline-none">
          <DialogHeader className="flex flex-col items-center space-y-4 pt-4">
            <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center">
              <LogOut className="h-8 w-8 ml-1" />
            </div>
            <DialogTitle className="text-xl text-center">Log Out</DialogTitle>
            <DialogDescription className="text-center px-2">
              Are you sure you want to log out of your account? You will need to sign back in to access the portal.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-3 sm:justify-center mt-4 pb-2 px-2">
            <Button variant="outline" onClick={() => setIsLogoutOpen(false)} className="flex-1 rounded-xl h-11 font-semibold">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                setIsLogoutOpen(false);
                logout();
              }} 
              className="flex-1 rounded-xl h-11 bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all font-semibold"
            >
              Log Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
