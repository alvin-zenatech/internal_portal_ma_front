import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient as api } from "@/services/apiClient";
import { toast } from "sonner";

export interface MasterData {
  id: number;
  name: string;
  created_at: string;
}

export interface CompanyData {
  id: number;
  name: string;
  phone?: string | null;
  location?: string | null;
  country_id?: number | null;
  country_name?: string | null;
  contact_name?: string | null;
  email?: string | null;
  created_at: string;
}

export interface PipelinePriority {
  id: number;
  name: string;
  sort_order: number;
  color?: string;
  created_at: string;
}

export interface PriorityData extends MasterData {
  sort_order: number;
  color?: string;
}

export interface CountryData extends MasterData {
  code?: string;
}

export interface PipelineTask {
  id: number;
  company_name: string;
  industry_id: number | null;
  industry_name: string | null;
  location: string | null;
  name: string;

  email: string | null;
  phone: string | null;
  first_poc: string | null;
  nda?: string;
  priority_id?: number;
  priority_name?: string;
  priority_color?: string;
  outcome_id?: number;
  outcome_name?: string;
  outcome_color?: string;
  no_of_calls?: string | null;
  p_and_l: string | null;
  analyst_id: string | null;
  analyst_name: string | null;
  analyst_email: string | null;
  revenue: string | null;
  team_size: string | null;
  country_id: number | null;
  country_name: string | null;
  latest_note: string | null;
  is_dnc?: boolean;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoNotContactRecord {
  id: number;
  company_name: string;
  reason?: string;
  added_by?: string;
  created_at: string;
}

export interface PipelineTaskHistory {
  id: number;
  task_id: number;
  old_priority_id: number | null;
  old_priority_name: string | null;
  new_priority_id: number | null;
  new_priority_name: string | null;
  changed_by: string | null;
  changed_by_name: string | null;
  note: string | null;
  created_at: string;
}

export interface PipelineNote {
  id: number;
  task_id: number;
  author_id: string | null;
  author_name: string | null;
  author_email: string | null;
  title?: string | null;
  note: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserData {
  id: string;
  full_name: string;
  email: string;
  is_super_admin?: boolean;
}

export interface AnalystData {
  id: string;
  full_name: string | null;
  email: string | null;
}

export const useRoles = () => useQuery({ queryKey: ["roles"], queryFn: () => api.get<any[]>("/api/rbac/roles") });

export interface PipelineAttachment {
  id: number;
  task_id: number;
  company_name: string;
  location: string | null;
  date: string | null;
  attachment_name: string;
  attachment_url: string;
}

export const usePipelineAttachments = () => useQuery({
  queryKey: ["pipeline", "attachments"],
  queryFn: () => api.get<PipelineAttachment[]>("/api/pipeline/attachments")
});

export const useUsers = () => useQuery({ queryKey: ["users"], queryFn: () => api.get<UserData[]>("/api/configuration/users") });

/** Users selectable as analysts. Super admins are excluded server-side, and unlike
 *  useUsers this needs no CONFIG_USERS_READ permission. */
export const useAnalysts = () => useQuery({
  queryKey: ["pipeline-analysts"],
  queryFn: () => api.get<AnalystData[]>("/api/pipeline/analysts"),
});

// Master Data Hooks
export const useIndustries = () => useQuery({ queryKey: ["industries"], queryFn: () => api.get<MasterData[]>("/api/pipeline/industries") });
export function useCreateIndustry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      return await api.post("/api/pipeline/industries", { name });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["industries"] }),
  });
}
export function useUpdateIndustry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number, data: { name: string } }) => {
      return await api.put(`/api/pipeline/industries/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["industries"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
export const useDeleteIndustry = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: number) => api.delete(`/api/pipeline/industries/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["industries"] }); qc.invalidateQueries({ queryKey: ["tasks"] }); } }); };



export const usePriorities = () => useQuery({ queryKey: ["priorities"], queryFn: () => api.get<PriorityData[]>("/api/pipeline/priorities") });
export function useCreatePriority() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string, sort_order: number, color?: string }) => {
      return await api.post("/api/pipeline/priorities", data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["priorities"] }),
  });
}
export function useUpdatePriority() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number, data: { name: string, sort_order: number, color?: string } }) => {
      return await api.put(`/api/pipeline/priorities/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["priorities"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
export const useDeletePriority = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: number) => api.delete(`/api/pipeline/priorities/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["priorities"] }); qc.invalidateQueries({ queryKey: ["tasks"] }); } }); };
export const useUpdatePriorityOrder = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (data: {id: number, sort_order: number}[]) => api.put("/api/pipeline/priorities/order", data), onSuccess: () => qc.invalidateQueries({ queryKey: ["priorities"] }) }); };

export const useCountries = () => useQuery({ queryKey: ["countries"], queryFn: () => api.get<CountryData[]>("/api/pipeline/countries") });
export function useCreateCountry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string, code: string }) => {
      return await api.post("/api/pipeline/countries", data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["countries"] }),
  });
}
export function useUpdateCountry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number, data: { name: string, code: string } }) => {
      return await api.put(`/api/pipeline/countries/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["countries"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
export const useDeleteCountry = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: number) => api.delete(`/api/pipeline/countries/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["countries"] }); qc.invalidateQueries({ queryKey: ["tasks"] }); } }); };

// Task Hooks
export const usePipelineTasks = () => useQuery({ queryKey: ["tasks"], queryFn: () => api.get<PipelineTask[]>("/api/pipeline/tasks") });
export const usePipelineTask = (id: number | null) => useQuery({ queryKey: ["tasks", id], queryFn: () => api.get<PipelineTask>(`/api/pipeline/tasks/${id}`), enabled: !!id });
export const useCreateTask = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (data: any) => api.post("/api/pipeline/tasks", data), onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }) }); };
export const useUpdateTask = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({id, data}: {id: number, data: any}) => api.put(`/api/pipeline/tasks/${id}`, data), onSuccess: (_, {id}) => { qc.invalidateQueries({ queryKey: ["tasks"] }); qc.invalidateQueries({ queryKey: ["tasks", id] }); qc.invalidateQueries({ queryKey: ["tasks", id, "history"] }); } }); };
export const useUpdateTaskStatus = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({id, priority_id, note}: {id: number, priority_id: number, note?: string}) => api.patch(`/api/pipeline/tasks/${id}/status`, { priority_id, note }), onSuccess: (_, {id}) => { qc.invalidateQueries({ queryKey: ["tasks"] }); qc.invalidateQueries({ queryKey: ["tasks", id] }); qc.invalidateQueries({ queryKey: ["tasks", id, "history"] }); } }); };
export const useDeleteTask = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: number) => api.delete(`/api/pipeline/tasks/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }) }); };

// History & Notes Hooks
export const useTaskHistory = (taskId: number | null) => useQuery({ queryKey: ["tasks", taskId, "history"], queryFn: () => api.get<PipelineTaskHistory[]>(`/api/pipeline/tasks/${taskId}/history`), enabled: !!taskId });
export const useTaskNotes = (taskId: number | null) => useQuery({ queryKey: ["tasks", taskId, "notes"], queryFn: () => api.get<PipelineNote[]>(`/api/pipeline/tasks/${taskId}/notes`), enabled: !!taskId });
export const useCreateTaskNote = () => { const queryClient = useQueryClient();  return useMutation({
    mutationFn: async ({ taskId, note, title, file }: { taskId: number, note: string, title?: string, file?: File | null }) => {
      const formData = new FormData();
      formData.append("note", note);
      if (title) {
        formData.append("title", title);
      }
      if (file) {
        formData.append("file", file);
      }
      return await api.post(`/api/pipeline/tasks/${taskId}/notes`, formData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", variables.taskId, "notes"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", variables.taskId] });
    },
  });
}

export const useUpdateTaskNote = () => { const queryClient = useQueryClient(); return useMutation({
  mutationFn: async ({ noteId, note, title }: { noteId: number, note: string, title?: string }) => {
    return await api.put(`/api/pipeline/tasks/notes/${noteId}`, { note, title });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  },
}); }

export const useDeleteTaskNote = () => { const queryClient = useQueryClient(); return useMutation({
  mutationFn: async ({ noteId }: { noteId: number }) => {
    return await api.delete(`/api/pipeline/tasks/notes/${noteId}`);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  },
}); }

export function useImportPipeline(onProgress?: (progress: number, message: string) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post<{task_id: string}>("/api/pipeline/import", formData);
      const taskId = res.task_id;
      
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const statusRes = await api.get<{status: string, progress: number, message: string}>(`/api/pipeline/import/status/${taskId}`);
        
        if (onProgress) {
            onProgress(statusRes.progress, statusRes.message);
        }
        
        if (statusRes.status === "completed") {
            return statusRes;
        } else if (statusRes.status === "error") {
            throw new Error(statusRes.message);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["call-logs"] });
      queryClient.invalidateQueries({ queryKey: ["call-tracking-summary"] });
    }
  });
}


export function useBackfillFollowUpDates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return await api.post<{
        updated_count: number;
        updated: { task_id: number; company_name: string; follow_up_date: string }[];
      }>("/api/pipeline/follow-ups/backfill-from-notes");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export interface PipelineActivity {
  id: number;
  task_id: number;
  type: string;
  activity_date: string;
  contact_name?: string;

  phone_number?: string;
  picked_up?: boolean;
  emailed?: boolean;
  duration?: string;
  outcome?: string;
  notes?: string;
  analyst_id?: string;
  analyst_name?: string;
  created_at: string;
}


export function useActivities(taskId: number | null) {
  return useQuery({
    queryKey: ["tasks", taskId, "activities"],
    queryFn: async () => {
      if (!taskId) return [];
      const data = await api.get(`/api/pipeline/tasks/${taskId}/activities`);
      return data as PipelineActivity[];
    },
    enabled: !!taskId,
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, data }: { taskId: number, data: Partial<PipelineActivity> }) => {
      return await api.post(`/api/pipeline/tasks/${taskId}/activities`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", variables.taskId, "activities"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] }); // also refresh tasks because follow up date or priority might have changed
    }
  });
}

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const data = await api.get("/api/pipeline/companies");
      return data as CompanyData[];
    },
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<CompanyData, "id" | "created_at" | "country_name">) => {
      return await api.post("/api/pipeline/companies", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company created successfully");
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Omit<CompanyData, "id" | "created_at" | "country_name"> }) => {
      return await api.put(`/api/pipeline/companies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] }); // task.company_name updates
      toast.success("Company updated successfully");
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/api/pipeline/companies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to delete company");
    }
  });
}

export interface CallTrackingSummary {
  normalized_company_name: string;
  company_name: string;
  industry: string | null;
  state_province: string | null;
  location: string | null;
  contact_name: string | null;

  current_status: string | null;
  latest_analyst: string | null;
  phone_number: string | null;
  emailed: string | null;
  picked_up: string | null;
  call_length: string | null;
}
export type CallLog = {
  id: number;
  call_number?: string;
  company_name?: string;
  industry?: string;
  state_province?: string;
  location?: string;
  contact_name?: string;

  phone_number?: string;
  date_of_call?: string;
  emailed?: string;
  picked_up?: string;
  outcome?: string;
  analyst?: string;
  call_length?: string;
  notes?: string;
  created_at: string;
};

export function useCallLogs() {
  return useQuery({
    queryKey: ["call-logs"],
    queryFn: async () => {
      return await api.get<CallLog[]>("/api/pipeline/call-logs");
    }
  });
}


export function useCallTrackingSummary() {
  return useQuery({
    queryKey: ["call-tracking-summary"],
    queryFn: async () => {
      return await api.get<CallTrackingSummary[]>("/api/pipeline/call-tracking/summary");
    }
  });
}

export function useCompanyCallLogs(norm_name: string | null) {
  return useQuery({
    queryKey: ["call-logs", norm_name],
    queryFn: async () => {
      if (!norm_name) return [];
      return await api.get<CallLog[]>(`/api/pipeline/call-logs/${encodeURIComponent(norm_name)}`);
    },
    enabled: !!norm_name
  });
}

export function useCreateCallLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<CallLog>) => {
      return await api.post<CallLog>("/api/pipeline/call-logs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-logs"] });
      queryClient.invalidateQueries({ queryKey: ["call-tracking-summary"] });
    }
  });
}

export function useUpdateCallLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: number; payload: Partial<CallLog> }) => {
      return await api.put<CallLog>(`/api/pipeline/call-logs/${data.id}`, data.payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-logs"] });
      queryClient.invalidateQueries({ queryKey: ["call-tracking-summary"] });
    }
  });
}

export function useDeleteCallLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/api/pipeline/call-logs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-logs"] });
      queryClient.invalidateQueries({ queryKey: ["call-tracking-summary"] });
    }
  });
}

export function useDoNotContactList() {
  return useQuery<DoNotContactRecord[]>({
    queryKey: ["doNotContactList"],
    queryFn: async () => {
      return await api.get<DoNotContactRecord[]>("/api/pipeline/do-not-contact");
    },
  });
}

export function useCreateDoNotContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { company_name: string; reason?: string }) => {
      return await api.post("/api/pipeline/do-not-contact", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doNotContactList"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Added to Do Not Contact list");
    },
  });
}

export function useUpdateDoNotContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { company_name: string; reason?: string } }) => {
      return await api.put(`/api/pipeline/do-not-contact/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doNotContactList"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Updated Do Not Contact record");
    },
  });
}

export function useDeleteDoNotContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/api/pipeline/do-not-contact/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doNotContactList"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Removed from Do Not Contact list");
    },
  });
}
