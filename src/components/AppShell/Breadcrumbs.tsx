import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useEffect, useState } from "react";

export interface BreadcrumbItem {
  title: string;
  path?: string;
}

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);
  const [customTitles, setCustomTitles] = useState<Record<string, string>>({});
  const [customTrails, setCustomTrails] = useState<Record<string, BreadcrumbItem[]>>({});

  useEffect(() => {
    const handleSetTitle = (e: Event) => {
      const customEvent = e as CustomEvent<{ path: string; title: string }>;
      setCustomTitles((prev) => ({
        ...prev,
        [customEvent.detail.path]: customEvent.detail.title,
      }));
    };

    const handleSetTrail = (e: Event) => {
      const customEvent = e as CustomEvent<{ path: string; items: BreadcrumbItem[] }>;
      setCustomTrails((prev) => ({
        ...prev,
        [customEvent.detail.path]: customEvent.detail.items,
      }));
    };

    document.addEventListener("set-breadcrumb-title", handleSetTitle);
    document.addEventListener("set-breadcrumb-trail", handleSetTrail);
    return () => {
      document.removeEventListener("set-breadcrumb-title", handleSetTitle);
      document.removeEventListener("set-breadcrumb-trail", handleSetTrail);
    };
  }, []);

  // Define custom mapping for breadcrumb names to ensure they look pretty
  const formatName = (name: string) => {
    const specialNames: Record<string, string> = {
      recurring: "Scheduled Payments",
      "recurring-payments": "Scheduled Payments",
      "scheduled-payments": "Scheduled Payments",
      requests: "Scheduled Payments",
      "master-data": "Configurations",
      industry: "Industries",
      priority: "Priorities",
      state: "States",
      "follow-ups": "Follow-ups",
      "weekly-check-in": "Weekly Check-In",
      "call-tracking": "Call Tracking",
      "do-not-contact": "Do Not Contact",
      uploads: "Uploads",
      companies: "Companies",
      "execution-analysts": "Execution Analysts",
      users: "Users",
      roles: "Roles",
      "user-role-assignment": "User Role Assignments",
      "role-group-permissions": "Role Group Permissions",
      "role-api-permissions": "Role API Permissions",
      "audit-log": "Audit Log",
    };
    const key = name.toLowerCase();
    if (specialNames[key]) {
      return specialNames[key];
    }
    return name
      .replace(/-/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Don't show breadcrumbs on the dashboard (root)
  if (pathnames.length === 0) {
    return null;
  }

  const activeTrail = customTrails[location.pathname];

  if (activeTrail) {
    return (
      <nav className="flex items-center text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 overflow-x-auto whitespace-nowrap py-1 scrollbar-none min-h-[30px] shrink-0">
        <Link
          to="/"
          className="flex items-center hover:text-foreground transition-colors"
          title="Home"
        >
          <Home className="h-4 w-4" />
        </Link>
        {activeTrail.map((item, index) => {
          const isLast = index === activeTrail.length - 1;
          return (
            <div key={item.title + index} className="flex items-center">
              <ChevronRight className="h-4 w-4 mx-1 opacity-50 shrink-0" />
              {isLast || !item.path ? (
                <span
                  className={isLast ? "font-semibold text-foreground" : "text-muted-foreground"}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.title}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="hover:text-foreground hover:underline underline-offset-4 transition-colors"
                >
                  {item.title}
                </Link>
              )}
            </div>
          );
        })}
      </nav>
    );
  }

  const breadcrumbItems = pathnames
    .map((value, index) => {
      return {
        value,
        to: `/${pathnames.slice(0, index + 1).join("/")}`,
        isLast: index === pathnames.length - 1,
      };
    })
    .filter((item) => {
      if (item.value.toLowerCase() === "pipeline") return false;
      if (item.value.toLowerCase() === "purchasing") return false;
      return true;
    });

  const finalBreadcrumbItems: Array<{ value: string; to: string; isLast: boolean }> = [];
  for (const item of breadcrumbItems) {
    if (item.value.toLowerCase() === "companies") {
      finalBreadcrumbItems.push({
        value: "master-data",
        to: "/pipeline/master-data",
        isLast: false,
      });
    }
    finalBreadcrumbItems.push(item);
  }

  return (
    <nav className="flex items-center text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 overflow-x-auto whitespace-nowrap py-1 scrollbar-none min-h-[30px] shrink-0">
      <Link
        to="/"
        className="flex items-center hover:text-foreground transition-colors"
        title="Home"
      >
        <Home className="h-4 w-4" />
      </Link>

      {finalBreadcrumbItems.map((item) => {
        let displayName = customTitles[item.to] || formatName(item.value);
        if (item.value.toLowerCase() === "master-data") {
          displayName = "Configurations";
        } else if (item.value.toLowerCase() === "industry") {
          displayName = "Industries";
        } else if (item.value.toLowerCase() === "priority") {
          displayName = "Priorities";
        } else if (item.value.toLowerCase() === "state") {
          displayName = "States";
        }

        const isUnclickable = item.value.toLowerCase() === "master-data";

        return (
          <div key={item.to} className="flex items-center">
            <ChevronRight className="h-4 w-4 mx-1 opacity-50 shrink-0" />
            {item.isLast || isUnclickable ? (
              <span
                className={item.isLast ? "font-semibold text-foreground" : ""}
                aria-current={item.isLast ? "page" : undefined}
              >
                {displayName}
              </span>
            ) : (
              <Link
                to={item.to}
                className="hover:text-foreground hover:underline underline-offset-4 transition-colors"
              >
                {displayName}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
