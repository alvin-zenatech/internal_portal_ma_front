import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { masterTablesService } from "@/services/masterTablesService";
import { toast } from "sonner";

export function useMasterLocations(search?: string) {
  return useQuery({
    queryKey: ["master-locations", search || ""],
    queryFn: () => masterTablesService.getLocations(search),
    staleTime: 60 * 1000,
  });
}

export function useCreateMasterLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: masterTablesService.createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-locations"] });
      toast.success("Location added successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to create location");
    },
  });
}

export function useUpdateMasterLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { name: string; description?: string; is_active?: boolean } }) =>
      masterTablesService.updateLocation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-locations"] });
      toast.success("Location updated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to update location");
    },
  });
}

export function useDeleteMasterLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: masterTablesService.deleteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-locations"] });
      toast.success("Location deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to delete location");
    },
  });
}

// --- Classes ---

export function useMasterClasses(search?: string) {
  return useQuery({
    queryKey: ["master-classes", search || ""],
    queryFn: () => masterTablesService.getClasses(search),
    staleTime: 60 * 1000,
  });
}

export function useCreateMasterClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: masterTablesService.createClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-classes"] });
      toast.success("Class added successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to create class");
    },
  });
}

export function useUpdateMasterClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { name: string; description?: string; is_active?: boolean } }) =>
      masterTablesService.updateClass(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-classes"] });
      toast.success("Class updated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to update class");
    },
  });
}

export function useDeleteMasterClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: masterTablesService.deleteClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-classes"] });
      toast.success("Class deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to delete class");
    },
  });
}
