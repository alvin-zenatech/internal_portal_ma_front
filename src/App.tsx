import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "./lib/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";

const AppShell = lazy(() => import("./components/AppShell/AppShell"));

const Users = lazy(() => import("./pages/Configurations/Users"));
const Roles = lazy(() => import("./pages/Configurations/Roles"));
const UserRoleAssignment = lazy(() => import("./pages/Configurations/UserRoleAssignment"));
const RoleGroupPermissions = lazy(() => import("./pages/Configurations/RoleGroupPermissions"));
const RoleApiPermissions = lazy(() => import("./pages/Configurations/RoleApiPermissions"));
const AuditLog = lazy(() => import("./pages/Log/AuditLog"));
const Login = lazy(() => import("./pages/Login"));
const PendingAccess = lazy(() => import("./pages/PendingAccess"));

// Pipeline
const PipelineDashboard = lazy(() => import("./pages/Pipeline/PipelineDashboard"));
const FollowUps = lazy(() => import("./pages/Pipeline/FollowUps"));
const Statistics = lazy(() => import("./pages/Pipeline/Statistics"));
const MasterDataIndustry = lazy(() => import("./pages/Pipeline/MasterDataIndustry"));
const MasterDataPosition = lazy(() => import("./pages/Pipeline/MasterDataPosition"));
const MasterDataPriority = lazy(() => import("./pages/Pipeline/MasterDataPriority"));
const MasterDataCountry = lazy(() => import("./pages/Pipeline/MasterDataCountry"));
const WeeklyCheckIn = lazy(() => import("./pages/Pipeline/WeeklyCheckIn"));
function App() {
  return (
    <AuthProvider>
        <BrowserRouter>
        <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/pending-access" element={<PendingAccess />} />

          {/* Main app layout routes */}
          <Route element={<ProtectedRoute><AppShell><Outlet /></AppShell></ProtectedRoute>}>
            <Route path="/" element={<ProtectedRoute navigationCode="PIPELINE"><PipelineDashboard /></ProtectedRoute>} />
            <Route path="/pipeline/follow-ups" element={<ProtectedRoute navigationCode="PIPELINE"><FollowUps /></ProtectedRoute>} />

            <Route path="/configurations" element={<Navigate to="/configurations/users" replace />} />

            {/* We use a parent route wrapper or just protect individual config routes */}


            <Route path="/configurations/users" element={<ProtectedRoute navigationCode="CONFIG_USERS"><Users /></ProtectedRoute>} />
            <Route path="/configurations/roles" element={<ProtectedRoute navigationCode="CONFIG_ROLES"><Roles /></ProtectedRoute>} />
            <Route path="/configurations/user-role-assignment" element={<ProtectedRoute navigationCode="CONFIG_USER_ROLE_ASSIGNMENT"><UserRoleAssignment /></ProtectedRoute>} />
            <Route path="/configurations/role-group-permissions" element={<ProtectedRoute navigationCode="CONFIG_ROLES"><RoleGroupPermissions /></ProtectedRoute>} />
            <Route path="/configurations/role-api-permissions" element={<ProtectedRoute navigationCode="CONFIG_ROLE_API_PERMISSIONS"><RoleApiPermissions /></ProtectedRoute>} />


            {/* Pipeline */}
            <Route path="/pipeline/statistics" element={<ProtectedRoute navigationCode="PIPELINE"><Statistics /></ProtectedRoute>} />
            <Route path="/pipeline/weekly-check-in" element={<ProtectedRoute navigationCode="PIPELINE"><WeeklyCheckIn /></ProtectedRoute>} />
            <Route path="/pipeline" element={<Navigate to="/pipeline/master-data/industry" replace />} />
            <Route path="/pipeline/master-data/industry" element={<ProtectedRoute navigationCode="PIPELINE_CONFIG"><MasterDataIndustry /></ProtectedRoute>} />
            <Route path="/pipeline/master-data/position" element={<ProtectedRoute navigationCode="PIPELINE_CONFIG"><MasterDataPosition /></ProtectedRoute>} />
            <Route path="/pipeline/master-data/priority" element={<ProtectedRoute navigationCode="PIPELINE_CONFIG"><MasterDataPriority /></ProtectedRoute>} />
            <Route path="/pipeline/master-data/country" element={<ProtectedRoute navigationCode="PIPELINE_CONFIG"><MasterDataCountry /></ProtectedRoute>} />

            {/* Logs */}
            <Route path="/log" element={<Navigate to="/log/audit-log" replace />} />
            <Route path="/log/audit-log" element={<ProtectedRoute navigationCode="AUDIT_LOG"><AuditLog /></ProtectedRoute>} />


          </Route>
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
