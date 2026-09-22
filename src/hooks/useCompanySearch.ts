import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { apiClient as api, BASE_URL } from "@/services/apiClient";
import { toast } from "sonner";

export interface ParsedSearchQuery {
  business_type: string;
  business_category?: string;
  vertical?: string;
  cities: string[];
  city?: string;
  province_or_state?: string;
  state?: string;
  country?: string;
  radius_km?: number;
  max_results: number;
  start_fresh: boolean;
  provider: string;
}

export interface LocationSuggestion {
  label: string;
  city: string;
  province_or_state: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface QueryParseResponse {
  original_query: string;
  parsed: ParsedSearchQuery;
  confidence: number;
  is_valid: boolean;
  missing_fields: string[];
  question?: string;
  location_ambiguous: boolean;
  location_suggestions: LocationSuggestion[];
}

export interface BusinessFinderJobCreate {
  business_type: string;
  vertical?: string;
  cities: string[];
  state?: string;
  country?: string;
  max_results?: number;
  start_fresh?: boolean;
  provider?: string;
}

export interface BusinessFinderJobCreateResponse {
  job_id: string;
  status: string;
  events_url: string;
  result_url: string;
}

export interface CompanySearchResult {
  id: string;
  job_id: string;
  company_name: string;
  vertical?: string;
  address_line1?: string;
  city?: string;
  province_or_state?: string;
  province?: string;
  state?: string;
  country?: string;
  phone_number?: string;
  website_url?: string;
  email?: string;
  leader_1_name?: string;
  leader_1_title?: string;
  leader_2_name?: string;
  leader_2_title?: string;
  data_quality_score: number;
  status: string; // 'Scraped' | 'Added'
  source_url?: string;
  company_id?: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
}

export interface CompanySearchJob {
  id: string;
  requested_by_user_id?: string;
  business_type: string;
  vertical?: string;
  cities: string[];
  state?: string;
  country?: string;
  max_results: number;
  status: "QUEUED" | "RUNNING" | "BLOCKED_VERIFICATION" | "CANCELLING" | "CANCELLED" | "COMPLETED" | "PARTIAL" | "FAILED";
  progress_percent: number;
  current_city?: string;
  businesses_discovered: number;
  businesses_processed: number;
  unique_businesses: number;
  error_message?: string;
  checkpoint_path?: string;
  csv_path?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at?: string;
}

export interface BusinessFinderProgressEvent {
  event: string;
  job_id: string;
  status?: string;
  city?: string;
  city_index?: number;
  city_total?: number;
  processed?: number;
  total?: number;
  city_percent?: number;
  percent?: number;
  business_name?: string;
  current_operation?: string;
  message?: string;
  result?: CompanySearchResult;
  timestamp?: string;
}

export interface DuplicateCheckResponse {
  has_match: boolean;
  duplicate_status: string;
  matches: Array<{
    existing_id: string | number;
    existing_name: string;
    existing_phone?: string;
    existing_location?: string;
    existing_state?: string;
    existing_country?: string;
    existing_contact?: string;
    existing_email?: string;
    match_type: string;
    match_confidence: number;
  }>;
}

/** Hook for parsing natural language query into chips */
export function useParseQuery() {
  return useMutation({
    mutationFn: async (query: string) => {
      return await api.post<QueryParseResponse>("/api/company-search/parse", { query });
    },
  });
}

/** Hook for creating a search job (returns 202 Accepted) */
export function useCreateSearchJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BusinessFinderJobCreate) => {
      return await api.post<BusinessFinderJobCreateResponse>("/api/company-search/jobs", payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["company-search-job", res.job_id] });
    },
  });
}

/** Hook for querying job details */
export function useSearchJob(jobId?: string | null) {
  return useQuery({
    queryKey: ["company-search-job", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      return await api.get<CompanySearchJob>(`/api/company-search/jobs/${jobId}`);
    },
    enabled: !!jobId,
  });
}

/** Hook for fetching job results */
export function useJobResults(jobId?: string | null) {
  return useQuery({
    queryKey: ["company-search-results", jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const res = await api.get<CompanySearchResult[]>(`/api/company-search/jobs/${jobId}/results`);
      return res || [];
    },
    enabled: !!jobId,
    placeholderData: (prev) => prev,
    staleTime: 5000,
  });
}

/** Hook for cancelling search job */
export function useCancelSearchJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      return await api.post<{ status: string }>(`/api/company-search/jobs/${jobId}/cancel`, {});
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ["company-search-job", jobId] });
      toast.info("Company search cancelled");
    },
  });
}

/** Hook for checking duplicate company against Configuration */
export function useCheckDuplicateCompany() {
  return useMutation({
    mutationFn: async (params: { company_name: string; phone?: string; domain?: string; city?: string; state?: string }) => {
      const searchParams = new URLSearchParams();
      searchParams.set("company_name", params.company_name);
      if (params.phone) searchParams.set("phone", params.phone);
      if (params.domain) searchParams.set("domain", params.domain);
      if (params.city) searchParams.set("city", params.city);
      if (params.state) searchParams.set("state", params.state);
      return await api.post<DuplicateCheckResponse>(`/api/company-search/check-duplicates?${searchParams.toString()}`, {});
    },
  });
}

export interface AddToCompanyPayload {
  company_name: string;
  phone?: string;
  location?: string;
  state_code?: string;
  country_code?: string;
  contact_name?: string;
  contact_title?: string;
  email?: string;
  update_existing_id?: number | string;
}

/** Hook for adding scraped result to Configuration -> Companies */
export function useAddToCompanies() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { resultId: string; payload?: AddToCompanyPayload } | string) => {
      const resultId = typeof params === "string" ? params : params.resultId;
      const body = typeof params === "string" ? {} : params.payload || {};
      return await api.post<{ success: boolean; company_id: string; already_existed: boolean }>(
        `/api/company-search/results/${resultId}/add-to-companies`,
        body
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["company-search-results"] });
      queryClient.invalidateQueries({ queryKey: ["company-search-job"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-companies"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      if (data.already_existed) {
        toast.info("Company linked to existing Configuration record.");
      } else {
        toast.success("Successfully added company to Configuration!");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to add company");
    }
  });
}

/** Triggers download of formula-safe CSV file */
export async function downloadJobCsv(jobId: string) {
  try {
    const url = `${BASE_URL}/api/company-search/jobs/${jobId}/download`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`
      }
    });
    if (!res.ok) {
      throw new Error("Failed to download CSV");
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `business_finder_${jobId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err: any) {
    toast.error(err.message || "Failed to download CSV report.");
  }
}

/** Real-time SSE Hook for Playwright multi-city progress */
export function useSearchJobSSE(
  jobId?: string | null,
  onProgress?: (event: BusinessFinderProgressEvent) => void
) {
  const [lastEvent, setLastEvent] = useState<BusinessFinderProgressEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!jobId) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
    const sseUrl = `${BASE_URL}/api/company-search/jobs/${jobId}/events${token ? `?token=${encodeURIComponent(token)}` : ""}`;

    const es = new EventSource(sseUrl, { withCredentials: true });
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as BusinessFinderProgressEvent;
        setLastEvent(data);
        if (onProgress) {
          onProgress(data);
        }

        // If new result arrived, update react-query cache
        if (data.event === "business_processed" && data.result) {
          const raw = data.result as any;
          const normalized: CompanySearchResult = {
            id: raw.id || `${raw.company_name || raw.business_name || "co"}-${Math.random().toString(36).substring(2, 9)}`,
            job_id: raw.job_id || jobId,
            company_name: raw.company_name || raw.business_name || "",
            vertical: raw.vertical || "",
            address_line1: raw.address_line1 || raw.location || "",
            city: raw.city || "",
            province_or_state: raw.province_or_state || raw.state || "",
            country: raw.country || "Canada",
            phone_number: raw.phone_number || raw.phone || "",
            website_url: raw.website_url || raw.website || "",
            email: raw.email || "",
            leader_1_name: raw.leader_1_name || "",
            leader_1_title: raw.leader_1_title || "",
            leader_2_name: raw.leader_2_name || "",
            leader_2_title: raw.leader_2_title || "",
            data_quality_score: raw.data_quality_score || 0,
            status: raw.status || "Scraped",
            source_url: raw.source_url || "",
            company_id: raw.company_id,
            latitude: raw.latitude,
            longitude: raw.longitude,
            created_at: raw.created_at || new Date().toISOString()
          };

          queryClient.setQueryData<CompanySearchResult[]>(["company-search-results", jobId], (prev) => {
            const arr = prev || [];
            const existingIdx = arr.findIndex((item) => 
              (item.id && item.id === normalized.id) ||
              (item.company_name && normalized.company_name && item.company_name.toLowerCase() === normalized.company_name.toLowerCase())
            );

            if (existingIdx >= 0) {
              const copy = [...arr];
              copy[existingIdx] = { ...copy[existingIdx], ...normalized };
              return copy;
            }
            return [...arr, normalized];
          });
        }

        // Handle terminal events
        if (["job_completed", "job_failed", "job_cancelled", "verification_blocked"].includes(data.event || "")) {
          queryClient.invalidateQueries({ queryKey: ["company-search-job", jobId] });
          queryClient.invalidateQueries({ queryKey: ["company-search-results", jobId] });
          es.close();
          setIsConnected(false);
        }
      } catch (err) {
        console.error("Failed to parse SSE payload:", err);
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      // EventSource will auto-reconnect
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [jobId, queryClient]);

  return { lastEvent, isConnected };
}
