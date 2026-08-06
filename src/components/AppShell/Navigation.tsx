import {
  LayoutDashboard,
  ShieldCheck,
  FileClock,
  Briefcase,
  CalendarCheck,
  CalendarClock,
  Phone,
} from "lucide-react";

export const navigation = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    section: "MAIN",
    navigationCode: "PIPELINE",
  },
  {
    label: "Follow-ups",
    path: "/pipeline/follow-ups",
    icon: CalendarClock,
    section: "MAIN",
    navigationCode: "PIPELINE",
  },
  {
    label: "Weekly Check-In",
    path: "/pipeline/weekly-check-in",
    icon: CalendarCheck,
    section: "MAIN",
    navigationCode: "PIPELINE",
  },
  {
    label: "Call Tracking",
    path: "/pipeline/call-tracking",
    icon: Phone,
    section: "MAIN",
    navigationCode: "PIPELINE",
  },


  {
    label: "Configurations",
    icon: Briefcase,
    section: "MAIN",
    subItems: [
      { label: "Companies", path: "/pipeline/companies", navigationCode: "PIPELINE_CONFIG" },
      { label: "Industries", path: "/pipeline/master-data/industry", navigationCode: "PIPELINE_CONFIG" },
      { label: "Positions", path: "/pipeline/master-data/position", navigationCode: "PIPELINE_CONFIG" },
      { label: "Priorities", path: "/pipeline/master-data/priority", navigationCode: "PIPELINE_CONFIG" },
      { label: "Countries", path: "/pipeline/master-data/country", navigationCode: "PIPELINE_CONFIG" },
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
      { label: "Role Permissions", path: "/configurations/role-group-permissions", navigationCode: "CONFIG_ROLE_API_PERMISSIONS" },
    ]
  },
  {
    label: "Audit Log",
    path: "/log/audit-log",
    icon: FileClock,
    section: "ADMINISTRATION",
    navigationCode: "AUDIT_LOG",
  },
]
