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

const MasterDataIndustry = lazy(() => import("./pages/Pipeline/MasterDataIndustry"));
const MasterDataPriority = lazy(() => import("./pages/Pipeline/MasterDataPriority"));
const MasterDataState = lazy(() => import("./pages/Pipeline/MasterDataState"));
const MasterDataExecutionAnalyst = lazy(() => import("./pages/Pipeline/MasterDataExecutionAnalyst"));
const CompaniesListView = lazy(() => import("./pages/Pipeline/CompaniesListView"));
const WeeklyCheckIn = lazy(() => import("./pages/Pipeline/WeeklyCheckIn"));
const CallTracking = lazy(() => import("./pages/Pipeline/CallTracking"));
const PipelineUploads = lazy(() => import("./pages/Pipeline/PipelineUploads"));
const DoNotContact = lazy(() => import("./pages/Pipeline/DoNotContact"));


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
            <Route path="/" element={<ProtectedRoute navigationCode="PIPELINE_DASHBOARD"><PipelineDashboard /></ProtectedRoute>} />
            <Route path="/pipeline/follow-ups" element={<ProtectedRoute navigationCode="PIPELINE_FOLLOW_UPS"><FollowUps /></ProtectedRoute>} />

            <Route path="/configurations" element={<Navigate to="/configurations/users" replace />} />

            {/* We use a parent route wrapper or just protect individual config routes */}


            <Route path="/configurations/users" element={<ProtectedRoute navigationCode="CONFIG_USERS"><Users /></ProtectedRoute>} />
            <Route path="/configurations/roles" element={<ProtectedRoute navigationCode="CONFIG_ROLES"><Roles /></ProtectedRoute>} />
            <Route path="/configurations/user-role-assignment" element={<ProtectedRoute navigationCode="CONFIG_USER_ROLE_ASSIGNMENT"><UserRoleAssignment /></ProtectedRoute>} />
            <Route path="/configurations/role-group-permissions" element={<ProtectedRoute navigationCode="CONFIG_ROLE_NAVIGATION_PERMISSIONS"><RoleGroupPermissions /></ProtectedRoute>} />
            <Route path="/configurations/role-api-permissions" element={<ProtectedRoute navigationCode="CONFIG_ROLE_API_PERMISSIONS"><RoleApiPermissions /></ProtectedRoute>} />


            {/* Pipeline */}

            <Route path="/pipeline/weekly-check-in" element={<ProtectedRoute navigationCode="PIPELINE_WEEKLY_CHECK_IN"><WeeklyCheckIn /></ProtectedRoute>} />
            <Route path="/pipeline/call-tracking" element={<ProtectedRoute navigationCode="PIPELINE_CALL_TRACKING"><CallTracking /></ProtectedRoute>} />
            <Route path="/pipeline/do-not-contact" element={<ProtectedRoute navigationCode="PIPELINE_DO_NOT_CONTACT"><DoNotContact /></ProtectedRoute>} />
            <Route path="/pipeline/uploads" element={<ProtectedRoute navigationCode="PIPELINE_UPLOADS"><PipelineUploads /></ProtectedRoute>} />
            <Route path="/pipeline" element={<Navigate to="/pipeline/master-data/industry" replace />} />
            <Route path="/pipeline/companies" element={<ProtectedRoute navigationCode="PIPELINE_COMPANIES"><CompaniesListView /></ProtectedRoute>} />
            <Route path="/pipeline/master-data/industry" element={<ProtectedRoute navigationCode="PIPELINE_INDUSTRIES"><MasterDataIndustry /></ProtectedRoute>} />
            <Route path="/pipeline/master-data/priority" element={<ProtectedRoute navigationCode="PIPELINE_PRIORITIES"><MasterDataPriority /></ProtectedRoute>} />

            <Route path="/pipeline/master-data/state" element={<ProtectedRoute navigationCode="PIPELINE_STATES"><MasterDataState /></ProtectedRoute>} />
            <Route path="/pipeline/master-data/execution-analysts" element={<ProtectedRoute navigationCode="PIPELINE_INDUSTRIES"><MasterDataExecutionAnalyst /></ProtectedRoute>} />


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
