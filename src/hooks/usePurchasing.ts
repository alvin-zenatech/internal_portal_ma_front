import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import * as purchasing from "@/services/purchasingService";
import type { RequestListFilters } from "@/services/purchasingService";
import type { RequestCreateInput, TransitionInput, WireTransferInput } from "@/types/purchasing";

const keys = {
  all: ["purchasing"] as const,
  summary: () => [...keys.all, "summary"] as const,
  requests: (filters: RequestListFilters) => [...keys.all, "requests", filters] as const,
  request: (id: string) => [...keys.all, "request", id] as const,
  invoices: (paymentStatus?: string) => [...keys.all, "invoices", paymentStatus ?? "all"] as const,
  notifications: () => [...keys.all, "notifications"] as const,
  departments: () => [...keys.all, "departments"] as const,
  projects: () => [...keys.all, "projects"] as const,
};

export function useProjects() {
  return useQuery({
    queryKey: keys.projects(),
    queryFn: purchasing.listProjects,
    staleTime: 60 * 1000,
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: keys.departments(),
    queryFn: purchasing.listDepartments,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePurchasingSummary() {
  return useQuery({
    queryKey: keys.summary(),
    queryFn: purchasing.getSummary,
    staleTime: 5000,
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  });
}

export function usePurchaseRequests(filters: RequestListFilters = {}) {
  return useQuery({
    queryKey: keys.requests(filters),
    queryFn: () => purchasing.listRequests(filters),
    staleTime: 30000,
    refetchOnWindowFocus: true,
    refetchInterval: false,
  });
}

export function useRequestDetail(id: string | undefined) {
  return useQuery({
    queryKey: id ? keys.request(id) : keys.all,
    queryFn: () => (id ? purchasing.getRequest(id) : Promise.reject("no id")),
    enabled: Boolean(id),
    staleTime: 30000,
    refetchOnWindowFocus: true,
    refetchInterval: false,
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RequestCreateInput) => purchasing.createRequest(payload),
    onSuccess: (data) => {
      if (data?.request?.id) {
        qc.setQueryData(keys.request(data.request.id), data);
      }
      qc.invalidateQueries({ queryKey: keys.summary(), refetchType: "active" });
      qc.invalidateQueries({ queryKey: keys.all, refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["recurring-requests"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["notifications"], refetchType: "active" });
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to create request");
    },
  });
}

export function useExtractProductInfo(requestId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id?: string | void) => purchasing.extractProductInfo(typeof id === 'string' && id ? id : (requestId || "")),
    onSuccess: (data) => {
      qc.setQueryData(keys.request(data.request.id), data);
      qc.invalidateQueries({ queryKey: keys.all, refetchType: "active" });
      toast.success("Product info refreshed");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Extraction failed");
    },
  });
}

export function useTransitionRequest(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TransitionInput) => purchasing.transitionRequest(requestId, payload),
    onSuccess: (data) => {
      qc.setQueryData(keys.request(requestId), data);
      qc.invalidateQueries({ queryKey: keys.summary(), refetchType: "active" });
      qc.invalidateQueries({ queryKey: keys.all, refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["recurring-requests"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["notifications"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["invoices"], refetchType: "active" });
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Action failed");
    },
  });
}

export function useInvoices(paymentStatus?: string) {
  return useQuery({
    queryKey: keys.invoices(paymentStatus),
    queryFn: () => purchasing.listInvoices(paymentStatus),
  });
}

export function usePayInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchasing.payInvoice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
      toast.success("Invoice marked as paid");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to update invoice");
    },
  });
}

export function usePurchasingNotifications() {
  return useQuery({
    queryKey: keys.notifications(),
    queryFn: () => purchasing.listNotifications(),
  });
}

export function usePossibleApprovers(requestId: string | undefined) {
  return useQuery({
    queryKey: ["purchasing", "approvers", requestId],
    queryFn: () => (requestId ? purchasing.getPossibleApprovers(requestId) : Promise.resolve([])),
    enabled: Boolean(requestId),
  });
}

export function useUsersList() {
  return useQuery({
    queryKey: ["configuration", "users", "active"],
    queryFn: async () => {
      const res = await purchasing.getUsers();
      return (Array.isArray(res) ? res : []).filter((u: any) => u.is_active !== false);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRolesList() {
  return useQuery({
    queryKey: ["configuration", "roles"],
    queryFn: purchasing.getRoles,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCurrencies() {
  return useQuery({
    queryKey: ["purchasing", "currencies"],
    queryFn: purchasing.getCurrencies,
    staleTime: 60 * 60 * 1000,
  });
}

export function useGLCodes(search?: string) {
  return useQuery({
    queryKey: ["purchasing", "gl-codes", search],
    queryFn: () => purchasing.getGLCodes(search),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAttachments(requestId: string | undefined) {
  return useQuery({
    queryKey: ["purchasing", "attachments", requestId],
    queryFn: () => (requestId ? purchasing.listAttachments(requestId) : Promise.resolve([])),
    enabled: Boolean(requestId),
  });
}

export function useUploadAttachments(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => purchasing.uploadAttachments(requestId, files),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchasing", "attachments", requestId] });
      qc.invalidateQueries({ queryKey: keys.request(requestId) });
      toast.success("Files attached");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Upload failed");
    },
  });
}

export function useDeleteAttachment(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => purchasing.deleteAttachment(requestId, fileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchasing", "attachments", requestId] });
      qc.invalidateQueries({ queryKey: keys.request(requestId) });
      toast.success("Attachment deleted");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Delete failed");
    },
  });
}

export function useUpdateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => purchasing.updateRequest(id, data),
    onSuccess: (res, variables) => {
      qc.setQueryData(keys.request(variables.id), res);
      qc.invalidateQueries({ queryKey: keys.request(variables.id) });
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: ["recurring-requests"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useManualPrice(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { unit_price: number; currency: string }) => purchasing.manualPrice(requestId, payload),
    onSuccess: (data) => {
      qc.setQueryData(keys.request(requestId), data);
      qc.invalidateQueries({ queryKey: keys.all });
      toast.success("Manual price updated");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to update price");
    },
  });
}

export const usePurchaseRequest = useRequestDetail;


export function useExtractQuote() {
  return useMutation({
    mutationFn: (file: File) => purchasing.extractQuote(file),
  });
}

export function useUpdateReviewStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, review_status }: { id: string | number; review_status: string }) =>
      apiClient.patch(`/api/purchasing/requests/${id}/review-status`, { review_status }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["purchasing", "request", String(variables.id)] });
      qc.invalidateQueries({ queryKey: ["purchasing"] });
      qc.invalidateQueries({ queryKey: ["recurring-requests"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(
        `Request #${variables.id} marked as ${
          variables.review_status === "REVIEWED" ? "Reviewed" : "Waiting for Review"
        }`
      );
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update review status");
    },
  });
}


export function useWorkflowAssignments() {
  return useQuery({
    queryKey: ["purchasing", "assignments"],
    queryFn: () => apiClient.get<any[]>("/api/purchasing/assignments").catch(() => apiClient.get<any[]>("/purchasing/assignments")).catch(() => []),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateWireTransfer(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WireTransferInput) => purchasing.updateWireTransfer(requestId, payload),
    onSuccess: (data) => {
      qc.setQueryData(keys.request(requestId), data);
      qc.invalidateQueries({ queryKey: keys.all });
      toast.success("Wire transfer information updated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to update wire transfer");
    },
  });
}


export function useKnownVendors() {
  return useQuery({
    queryKey: ["purchasing_vendors"],
    queryFn: async () => {
      const list = await apiClient.get<string[]>("/api/purchasing/vendors");
      return Array.isArray(list) ? list : [];
    },
    staleTime: 30 * 1000,
  });
}

export function useProjectGroupsDetailed() {
  return useQuery({
    queryKey: [...keys.projects(), "detailed"],
    queryFn: purchasing.listProjectGroupsDetailed,
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateProjectGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: purchasing.createProjectGroup,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: keys.projects() });
      toast.success(`Project group "${data.name}" created successfully`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create project group");
    },
  });
}

export function useUpdateProjectGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ oldName, payload }: { oldName: string; payload: import("@/types/purchasing").ProjectGroupUpdateInput }) =>
      purchasing.updateProjectGroup(oldName, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.projects() });
      qc.invalidateQueries({ queryKey: keys.all });
      toast.success(`Project group updated successfully`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update project group");
    },
  });
}

export function useDeleteProjectGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => purchasing.deleteProjectGroup(name),
    onSuccess: (_, name) => {
      qc.invalidateQueries({ queryKey: keys.projects() });
      qc.invalidateQueries({ queryKey: keys.all });
      toast.success(`Project group "${name}" deleted`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete project group");
    },
  });
}
