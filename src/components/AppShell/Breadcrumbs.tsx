import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useEffect, useState } from "react";

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);
  const [customTitles, setCustomTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    const handleSetTitle = (e: Event) => {
      const customEvent = e as CustomEvent<{ path: string; title: string }>;
      setCustomTitles((prev) => ({
        ...prev,
        [customEvent.detail.path]: customEvent.detail.title,
      }));
    };
    document.addEventListener("set-breadcrumb-title", handleSetTitle);
    return () => document.removeEventListener("set-breadcrumb-title", handleSetTitle);
  }, []);

  // Define custom mapping for breadcrumb names to ensure they look pretty
  const formatName = (name: string) => {
    return name
      .replace(/-/g, " ")
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Don't show breadcrumbs on the dashboard (root)
  if (pathnames.length === 0) {
    return null;
  }

  const breadcrumbItems = pathnames.map((value, index) => {
    return {
      value,
      to: `/${pathnames.slice(0, index + 1).join("/")}`,
      isLast: index === pathnames.length - 1,
    };
  }).filter(item => {
    const val = item.value.toLowerCase();
    return val !== 'pipeline' && val !== 'companies';
  });

  return (
    <nav className="flex items-center text-sm text-muted-foreground mb-6 overflow-x-auto whitespace-nowrap pt-1 pb-2 scrollbar-none min-h-[36px]">
      <Link 
        to="/" 
        className="flex items-center hover:text-foreground transition-colors"
        title="Home"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {breadcrumbItems.map((item) => {
        let displayName = customTitles[item.to] || formatName(item.value);
        if (item.value.toLowerCase() === 'master-data') {
          displayName = 'Configurations';
        } else if (item.value.toLowerCase() === 'crm') {
          displayName = 'Call Tracking';
        }

        return (
          <div key={item.to} className="flex items-center">
            <ChevronRight className="h-4 w-4 mx-1 opacity-50 shrink-0" />
            {item.isLast ? (
              <span className="font-semibold text-foreground" aria-current="page">
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
