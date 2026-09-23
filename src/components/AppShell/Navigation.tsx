import {
  LayoutDashboard,
  ShieldCheck,
  FileClock,
  Briefcase,
  CalendarCheck,
  CalendarClock,
  Phone,
  UploadCloud,
  AlertTriangle,
} from "lucide-react";

export interface NavigationSubItem {
  label: string;
  path: string;
  navigationCode?: string;
}

export interface NavigationItem {
  label: string;
  path?: string;
  icon: any;
  section?: string;
  navigationCode?: string;
  subItems?: NavigationSubItem[];
}

export const navigation: NavigationItem[] = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    section: "MAIN",
    navigationCode: "PIPELINE_DASHBOARD",
  },
  {
    label: "Follow-ups",
    path: "/pipeline/follow-ups",
    icon: CalendarClock,
    section: "MAIN",
    navigationCode: "PIPELINE_FOLLOW_UPS",
  },
  {
    label: "Weekly Check-In",
    path: "/pipeline/weekly-check-in",
    icon: CalendarCheck,
    section: "MAIN",
    navigationCode: "PIPELINE_WEEKLY_CHECK_IN",
  },
  {
    label: "Call Tracking",
    path: "/pipeline/call-tracking",
    icon: Phone,
    section: "MAIN",
    navigationCode: "PIPELINE_CALL_TRACKING",
  },
  {
    label: "Scheduled Payments",
    path: "/purchasing/recurring",
    icon: CalendarClock,
    section: "MAIN",
    subItems: [
      { label: "M&A Scheduled Payments", path: "/purchasing/recurring?filter=MA_SCHEDULED" },
      { label: "All Subscriptions", path: "/purchasing/recurring" },
      { label: "Due in 7 Days", path: "/purchasing/recurring?filter=DUE_SOON" },
      { label: "Waiting for Review", path: "/purchasing/recurring?filter=WAITING_REVIEW" },
      { label: "Reviewed", path: "/purchasing/recurring?filter=REVIEWED" },
    ],
  },
  {
    label: "Do Not Contact",
    path: "/pipeline/do-not-contact",
    icon: AlertTriangle,
    section: "MAIN",
    navigationCode: "PIPELINE_DO_NOT_CONTACT",
  },
  {
    label: "Uploads",
    path: "/pipeline/uploads",
    icon: UploadCloud,
    section: "MAIN",
    navigationCode: "PIPELINE_UPLOADS",
  },


  {
    label: "Configurations",
    icon: Briefcase,
    section: "MAIN",
    subItems: [
      { label: "Companies", path: "/pipeline/companies", navigationCode: "PIPELINE_COMPANIES" },
      { label: "Industries", path: "/pipeline/master-data/industry", navigationCode: "PIPELINE_INDUSTRIES" },

      { label: "Priorities", path: "/pipeline/master-data/priority", navigationCode: "PIPELINE_PRIORITIES" },
    ]
  },

  {
    label: "System & Security",
    icon: ShieldCheck,
    section: "ADMINISTRATION",
    subItems: [
      { label: "Users", path: "/configurations/users", navigationCode: "CONFIG_USERS" },
      { label: "Roles", path: "/configurations/roles", navigationCode: "CONFIG_ROLES" },
      { label: "Role Assignments", path: "/configurations/user-role-assignment", navigationCode: "CONFIG_USER_ROLE_ASSIGNMENT" },
      { label: "Role Permissions", path: "/configurations/role-group-permissions", navigationCode: "CONFIG_ROLE_NAVIGATION_PERMISSIONS" },
    ]
  },
  {
    label: "Audit Log",
    path: "/log/audit-log",
    icon: FileClock,
    section: "ADMINISTRATION",
    navigationCode: "AUDIT_LOG",
  },
];
