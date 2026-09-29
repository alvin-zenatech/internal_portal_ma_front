import { apiClient } from "./apiClient";

export interface MasterItem {
  id: number;
  name: string;
  raw_name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MasterListResponse {
  items: MasterItem[];
  total: number;
  last_imported_at: string | null;
  last_filename: string | null;
}

export interface ImportResult {
  success: boolean;
  imported_count: number;
  total_count: number;
  filename: string;
  imported_at: string;
}

export const masterTablesService = {
  // --- Locations ---
  getLocations: (search?: string) => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    return apiClient.get<MasterListResponse>(`/api/master/locations${qs}`);
  },

  createLocation: (payload: { name: string; description?: string }) => {
    return apiClient.post<MasterItem>("/api/master/locations", payload);
  },

  updateLocation: (id: number, payload: { name: string; description?: string; is_active?: boolean }) => {
    return apiClient.put<MasterItem>(`/api/master/locations/${id}`, payload);
  },

  deleteLocation: (id: number) => {
    return apiClient.delete<{ success: boolean; message: string }>(`/api/master/locations/${id}`);
  },

  // --- Classes ---
  getClasses: (search?: string) => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    return apiClient.get<MasterListResponse>(`/api/master/classes${qs}`);
  },

  createClass: (payload: { name: string; description?: string }) => {
    return apiClient.post<MasterItem>("/api/master/classes", payload);
  },

  updateClass: (id: number, payload: { name: string; description?: string; is_active?: boolean }) => {
    return apiClient.put<MasterItem>(`/api/master/classes/${id}`, payload);
  },

  deleteClass: (id: number) => {
    return apiClient.delete<{ success: boolean; message: string }>(`/api/master/classes/${id}`);
  },
};
