// src/pages/Dashboard.tsx
import { useAuth } from "@/lib/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="w-full space-y-6 flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out p-6 lg:p-8">
      <header className="flex flex-col gap-4 border-b border-slate-200/60 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Welcome back, {user?.full_name || "Admin"}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          This is your central administrative dashboard.
        </p>
      </header>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="font-semibold leading-none tracking-tight mb-2">Getting Started</h3>
          <p className="text-sm text-muted-foreground">
            Use the sidebar to navigate through system configurations, user management, and settings.
          </p>
        </div>
      </div>
    </div>
  );
}
