import { ChevronDown, ChevronRight, PanelRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { navigation } from "./Navigation";
import { useState } from "react";
import zenatechLogo from "@/assets/zenatech_logo.png";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "../../lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import type { LucideIcon } from "lucide-react";

interface SidebarUser {
  is_super_admin?: boolean;
  assigned_roles?: Array<{ code: string }>;
}

interface SidebarNavigationItem {
  label: string;
  path?: string;
  icon: LucideIcon;
  section?: string;
  navigationCode?: string;
  subItems?: Array<{
    label: string;
    path: string;
    navigationCode?: string;
  }>;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({
  isOpen,
  onToggle,
}: SidebarProps) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const location = useLocation();

  const { hasPermission, hasRole, user } = useAuth();
  const isSuperAdmin = hasRole("SUPER_ADMIN") || user?.is_super_admin;

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiClient.get<SidebarUser[]>("/api/configuration/users"),
    enabled: !!isSuperAdmin,
  });

  const pendingUsersCount = users?.filter((u) =>
    !u.is_super_admin && 
    (!u.assigned_roles || u.assigned_roles.length === 0 || u.assigned_roles.every((role) => role.code === "PENDING_USER"))
  ).length || 0;

  const toggleExpand = (label: string) => {
    setExpandedItems(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const groupedNavigation = navigation.reduce<Record<string, SidebarNavigationItem[]>>((acc, item) => {
    if (item.navigationCode && !hasPermission(`${item.navigationCode}_READ`)) return acc;

    const filteredSubItems = item.subItems 
      ? item.subItems.filter(sub => !sub.navigationCode || hasPermission(`${sub.navigationCode}_READ`))
      : undefined;

    // If it had subItems but now they are all filtered out, don't show the parent if it relies on subItems
    if (item.subItems && (!filteredSubItems || filteredSubItems.length === 0)) {
      return acc;
    }

    const section = item.section || "GENERAL";
    if (!acc[section]) acc[section] = [];
    
    acc[section].push({ ...item, subItems: filteredSubItems });
    return acc;
  }, {});

  return (
    <>
      {/* Mobile & Tablet backdrop overlay */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs laptop:hidden animate-in fade-in"
        />
      )}

      <aside
        className={`
          fixed laptop:static top-0 bottom-0 left-0 z-50 h-full flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out shadow-lg laptop:shadow-none
          ${isOpen ? "w-52 tablet:w-56 desktop:w-60 translate-x-0" : "-translate-x-full laptop:translate-x-0 laptop:w-14"}
        `}
      >
        <div className={`flex items-center h-10 tablet:h-11 px-2 transition-all duration-300 ease-in-out ${isOpen ? "justify-between" : "laptop:justify-center"}`}>
          <Link to="/" className={`transition-all duration-300 ease-in-out ${isOpen ? "opacity-100" : "opacity-0 w-0 h-0 overflow-hidden"}`}>
            <img
              src={zenatechLogo}
              alt="Zenatech Logo"
              className={`transition-all duration-300 ease-in-out object-contain cursor-pointer ${
                isOpen ? "h-6.5 sm:h-7.5 w-auto -translate-x-1" : "w-0 h-0"
              }`}
            />
          </Link>

          <button
            onClick={onToggle}
            className="rounded-md p-1 hover:bg-sidebar-accent flex-shrink-0 text-muted-foreground hover:text-foreground"
            title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <PanelRight size={16} />
          </button>
        </div>

      <TooltipProvider delayDuration={0}>
        <nav className="space-y-3.5 px-2 mt-2 pb-4 overflow-y-auto scrollbar-hide flex-1 min-h-0">
          {Object.entries(groupedNavigation).map(([section, items]) => (
          <div key={section} className="space-y-0.5">
            {isOpen ? (
              <div className="px-2.5 mb-1 text-[9px] font-bold tracking-widest text-muted-foreground/80 uppercase">
                {section}
              </div>
            ) : (
              <div className="h-2" /> // Spacing when collapsed
            )}
            
            {items.map((item) => {
              const Icon = item.icon;

          if (item.subItems) {
            const isExpanded = expandedItems[item.label];
            return (
              <div key={item.label} className="flex flex-col">
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        if (!isOpen) onToggle();
                        toggleExpand(item.label);
                      }}
                      className={`
                        flex items-center justify-between h-8.5 sm:h-9 overflow-hidden rounded-md transition-all duration-200 ease-in-out hover:bg-sidebar-accent text-sidebar-foreground
                        ${isOpen ? "px-2.5" : "px-0 justify-center"}
                      `}
                    >
                      <div className={`flex items-center ${isOpen ? "justify-start" : "justify-center"}`}>
                        <div className="flex items-center justify-center flex-shrink-0">
                          <Icon size={16} />
                        </div>
                        <span className={`text-xs sm:text-[13px] font-medium transition-all duration-300 ease-in-out ${isOpen ? "opacity-100 ml-2.5 translate-x-0 w-auto" : "opacity-0 ml-0 -translate-x-4 w-0 overflow-hidden"}`}>
                          {item.label}
                        </span>
                      </div>
                      {isOpen && (
                        <div className="flex-shrink-0">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10} className={`font-semibold z-50 ${isOpen ? "hidden" : ""}`}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
                <div 
                  className={`ml-5 space-y-0.5 overflow-hidden transition-all duration-200 ease-in-out ${
                    isOpen && isExpanded ? "max-h-[1000px] mt-0.5 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  {item.subItems.map((sub) => {
                    const isSubActive = location.pathname === sub.path || location.pathname.startsWith(sub.path + "/");
                    return (
                      <Link
                        key={sub.path}
                        to={sub.path}
                        className={`
                          flex items-center justify-between h-7.5 px-2.5 rounded-md text-xs transition-all duration-200
                          ${isSubActive ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-xs font-semibold" : "text-muted-foreground hover:bg-sidebar-accent"}
                        `}
                      >
                        <span className="truncate">{sub.label}</span>
                        {sub.label === "Role Assignments" && isSuperAdmin && pendingUsersCount > 0 && (
                          <div className="flex-shrink-0 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full ml-1.5">
                            {pendingUsersCount}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          const isMainActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path + "/"));
          return (
            <Tooltip key={item.path} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to={item.path!}
                  className={
                    `
                      flex items-center h-8.5 sm:h-9 overflow-hidden rounded-md transition-all duration-200 ease-in-out
                      ${isOpen ? "px-2.5 justify-start" : "px-0 justify-center"}
                      ${
                        isMainActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-xs font-semibold"
                          : "hover:bg-sidebar-accent text-sidebar-foreground font-medium"
                      }
                    `
                  }
                >
                  <div className="flex items-center justify-center flex-shrink-0">
                    <Icon size={16} />
                  </div>
                  <span
                    className={`text-xs sm:text-[13px] font-medium transition-all duration-300 ease-in-out ${
                      isOpen ? "opacity-100 ml-2.5 translate-x-0 w-auto" : "opacity-0 ml-0 -translate-x-4 w-0 overflow-hidden"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10} className={`font-semibold z-50 ${isOpen ? "hidden" : ""}`}>
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
        </div>
        ))}
        </nav>
      </TooltipProvider>
    </aside>
    </>
  );
}
