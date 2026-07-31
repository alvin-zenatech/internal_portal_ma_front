import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient as api } from "@/services/apiClient";

export interface MasterData {
  id: number;
  name: string;
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
  position_id: number | null;
  position_name: string | null;
  email: string | null;
  phone: string | null;
  first_poc: string | null;
  nda?: string;
  priority_id?: number;
  priority_name?: string;
  priority_color?: string;
  no_of_calls?: string | null;
  p_and_l: string | null;
  analyst_id: string | null;
  analyst_name: string | null;
  analyst_email: string | null;
  revenue: string | null;
  team_size: string | null;
  country_id: number | null;
  country_name: string | null;
  created_at: string;
  updated_at: string;
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
  note: string;
  created_at: string;
  updated_at: string;
}

export interface UserData {
  id: string;
  full_name: string;
  email: string;
}

export const useUsers = () => useQuery({ queryKey: ["users"], queryFn: () => api.get<UserData[]>("/api/configuration/users") });

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["industries"] }),
  });
}
export const useDeleteIndustry = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: number) => api.delete(`/api/pipeline/industries/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["industries"] }) }); };

export const usePositions = () => useQuery({ queryKey: ["positions"], queryFn: () => api.get<MasterData[]>("/api/pipeline/positions") });
export function useCreatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      return await api.post("/api/pipeline/positions", { name });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["positions"] }),
  });
}
export function useUpdatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number, data: { name: string } }) => {
      return await api.put(`/api/pipeline/positions/${id}`, data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["positions"] }),
  });
}
export const useDeletePosition = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: number) => api.delete(`/api/pipeline/positions/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["positions"] }) }); };

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["priorities"] }),
  });
}
export const useDeletePriority = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: number) => api.delete(`/api/pipeline/priorities/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["priorities"] }) }); };
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["countries"] }),
  });
}
export const useDeleteCountry = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: number) => api.delete(`/api/pipeline/countries/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["countries"] }) }); };

// Task Hooks
export const usePipelineTasks = () => useQuery({ queryKey: ["tasks"], queryFn: () => api.get<PipelineTask[]>("/api/pipeline/tasks") });
export const usePipelineTask = (id: number | null) => useQuery({ queryKey: ["tasks", id], queryFn: () => api.get<PipelineTask>(`/api/pipeline/tasks/${id}`), enabled: !!id });
export const useCreateTask = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (data: any) => api.post("/api/pipeline/tasks", data), onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }) }); };
export const useUpdateTask = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({id, data}: {id: number, data: any}) => api.put(`/api/pipeline/tasks/${id}`, data), onSuccess: (_, {id}) => { qc.invalidateQueries({ queryKey: ["tasks"] }); qc.invalidateQueries({ queryKey: ["tasks", id] }); } }); };
export const useUpdateTaskStatus = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({id, priority_id, note}: {id: number, priority_id: number, note?: string}) => api.patch(`/api/pipeline/tasks/${id}/status`, { priority_id, note }), onSuccess: (_, {id}) => { qc.invalidateQueries({ queryKey: ["tasks"] }); qc.invalidateQueries({ queryKey: ["tasks", id] }); qc.invalidateQueries({ queryKey: ["tasks", id, "history"] }); } }); };
export const useDeleteTask = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: number) => api.delete(`/api/pipeline/tasks/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }) }); };

// History & Notes Hooks
export const useTaskHistory = (taskId: number | null) => useQuery({ queryKey: ["tasks", taskId, "history"], queryFn: () => api.get<PipelineTaskHistory[]>(`/api/pipeline/tasks/${taskId}/history`), enabled: !!taskId });
export const useTaskNotes = (taskId: number | null) => useQuery({ queryKey: ["tasks", taskId, "notes"], queryFn: () => api.get<PipelineNote[]>(`/api/pipeline/tasks/${taskId}/notes`), enabled: !!taskId });
export const useCreateTaskNote = () => { const queryClient = useQueryClient();  return useMutation({
    mutationFn: async ({ taskId, note }: { taskId: number, note: string }) => {
      return await api.post(`/api/pipeline/tasks/${taskId}/notes`, { note });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", variables.taskId, "notes"] });
    },
  });
}

export const useUpdateTaskNote = () => { const queryClient = useQueryClient(); return useMutation({
  mutationFn: async ({ noteId, note }: { noteId: number, note: string }) => {
    return await api.put(`/api/pipeline/tasks/notes/${noteId}`, { note });
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

export function useImportPipeline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return await api.post("/api/pipeline/import", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  });
}

export function usePipelineStatistics(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ["pipeline-statistics", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const data = await api.get(`/api/pipeline/statistics?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`);
      return data as { analyst_id: string, analyst_name: string, priority_id: number, priority_name: string, priority_color: string, task_count: number }[];
    },
  });
}
