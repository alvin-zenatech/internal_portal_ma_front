import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { PageConnectionBanner } from "@/components/ui/PageConnectionBanner";
import type { IntegrationStatusResponse } from "@/components/AppShell/ConnectionStatusLight";

/** Banner whose state follows the live reachability of the Administration server. */
export function AdminIntegrationBanner({ description }: { description?: string }) {
  const { data, isError } = useQuery<IntegrationStatusResponse>({
    queryKey: ["admin-integration-banner"],
    queryFn: () => apiClient.get<IntegrationStatusResponse>("/api/integration/status"),
    refetchInterval: 10_000,
    retry: false,
  });

  const admin = data?.services?.find((s) => s.id === "admin_backend");
  // No answer from our own backend or no admin entry => treat as offline, never assume connected.
  const state = isError || !admin ? "offline" : admin.status;
  const mode =
    state === "online"
      ? "Connected (Live)"
      : state === "recovering"
      ? "Reconnecting…"
      : "Offline (Direct DB Fallback)";

  return <PageConnectionBanner serviceName="Admin Portal Integration" state={state} mode={mode} description={description} />;
}

export default AdminIntegrationBanner;
