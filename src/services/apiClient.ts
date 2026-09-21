import { handleResponse } from "./helper";

export interface ActiveApiAction {
  id: string;
  method: string;
  endpoint: string;
  title: string;
  subtitle: string;
  startedAt: number;
}

const activeActions = new Map<string, ActiveApiAction>();
const actionListeners = new Set<(actions: ActiveApiAction[]) => void>();

export function subscribeToApiActions(listener: (actions: ActiveApiAction[]) => void): () => void {
  actionListeners.add(listener);
  listener(Array.from(activeActions.values()));
  return () => {
    actionListeners.delete(listener);
  };
}

function notifyActionListeners() {
  const list = Array.from(activeActions.values());
  actionListeners.forEach((fn) => {
    try {
      fn(list);
    } catch (e) {
      console.error("Error in action listener", e);
    }
  });
}

export interface ApiRequestOptions extends RequestInit {
  actionLabel?: string;
  actionSubtitle?: string;
  skipGlobalLoading?: boolean;
}

function resolveActionMeta(
  method: string,
  endpoint: string,
  body?: unknown,
  customLabel?: string,
  customSubtitle?: string
): { title: string; subtitle: string } {
  if (customLabel) {
    return {
      title: customLabel,
      subtitle: customSubtitle || "Please wait while your request is being processed...",
    };
  }

  const m = method.toUpperCase();
  const lower = endpoint.toLowerCase();

  // Parse body if it's JSON string
  let parsedBody: any = null;
  if (typeof body === "string") {
    try {
      parsedBody = JSON.parse(body);
    } catch {
      parsedBody = null;
    }
  } else if (body && typeof body === "object") {
    parsedBody = body;
  }

  // 1. Authentication & Session
  if (lower.includes("/auth/logout") || lower.includes("/logout")) {
    return {
      title: "Signing Out",
      subtitle: "Ending your session safely...",
    };
  }

  // 2. Workflow Transition & Status Actions
  if (lower.includes("/transition")) {
    const action = String(parsedBody?.action || "").toUpperCase();
    if (action === "COMPLETE") {
      return {
        title: "Completing Request Cycle",
        subtitle: "Saving completion records and scheduling next due date...",
      };
    }
    if (action === "RECORD_INVOICE") {
      return {
        title: "Recording Invoice",
        subtitle: "Saving invoice details and GL account allocations...",
      };
    }
    if (action === "CREATE_PO") {
      return {
        title: "Saving Purchase Order",
        subtitle: "Saving quote/PO details and item breakdown...",
      };
    }
    if (action === "APPROVE") {
      return {
        title: "Submitting Approval",
        subtitle: "Approving request and advancing workflow...",
      };
    }
    if (action === "REJECT") {
      return {
        title: "Submitting Rejection",
        subtitle: "Updating request status and recording notes...",
      };
    }
    if (action === "PUT_ON_HOLD") {
      return {
        title: "Putting on Hold",
        subtitle: "Saving hold reason and pausing workflow...",
      };
    }
    if (action === "RESUME_WORKFLOW") {
      return {
        title: "Resuming Request",
        subtitle: "Reactivating workflow for this request...",
      };
    }
    if (action === "ADD_TRACKING") {
      return {
        title: "Adding Tracking",
        subtitle: "Saving tracking numbers and shipping details...",
      };
    }
    if (action === "CONFIRM_GOODS_RECEIVED") {
      return {
        title: "Confirming Goods Received",
        subtitle: "Updating receipt records and notes...",
      };
    }
    return {
      title: "Updating Workflow Status",
      subtitle: "Applying status transition and saving updates...",
    };
  }

  // 3. Batch Approval / Reject / Notify Operations
  if (lower.includes("/batch-approve")) {
    return {
      title: "Batch Approving Requests",
      subtitle: "Approving selected requests and updating workflow status...",
    };
  }

  if (lower.includes("/batch-reject")) {
    return {
      title: "Batch Rejecting Requests",
      subtitle: "Rejecting selected requests and updating workflow status...",
    };
  }

  if (lower.includes("/batch-notify")) {
    return {
      title: "Sending Reminders",
      subtitle: "Dispatching notification reminders to assignees...",
    };
  }

  if (lower.includes("/batch-notification-settings")) {
    return {
      title: "Saving Notification Settings",
      subtitle: "Updating batch notification schedules and preferences...",
    };
  }

  // 4. Recurring Payments
  if (lower.includes("/recurring/notification-settings")) {
    return {
      title: "Saving Notification Settings",
      subtitle: "Updating recurring due date reminder preferences...",
    };
  }

  if (lower.includes("/recurring/send-due-reminders")) {
    return {
      title: "Dispatching Due Reminders",
      subtitle: "Triggering notifications for upcoming recurring payments...",
    };
  }

  // 5. Review Status
  if (lower.includes("/review-status") || lower.includes("/review")) {
    return {
      title: "Updating Review Status",
      subtitle: "Saving review state and updating request...",
    };
  }

  // 6. Manual Price Adjustment
  if (lower.includes("/manual-price")) {
    return {
      title: "Updating Manual Price",
      subtitle: "Saving price adjustment and currency...",
    };
  }

  // 7. Wire Transfer
  if (lower.includes("/wire-transfer") || lower.includes("/wire")) {
    return {
      title: "Saving Wire Transfer",
      subtitle: "Updating treasury payment instructions...",
    };
  }

  // 8. Invoice & Invoicing
  if (lower.includes("/invoice") || lower.includes("/bill")) {
    if (lower.includes("/pay")) {
      return {
        title: "Processing Payment",
        subtitle: "Recording payment and updating invoice status...",
      };
    }
    if (m === "DELETE") {
      return {
        title: "Deleting Invoice",
        subtitle: "Removing invoice record from the system...",
      };
    }
    if (m === "POST") {
      return {
        title: "Recording Invoice",
        subtitle: "Saving invoice details and GL account allocations...",
      };
    }
    return {
      title: "Updating Invoice Records",
      subtitle: "Saving invoice information and allocations...",
    };
  }

  // 9. Attachments / Uploads / Files
  if (lower.includes("/attachments") || lower.includes("/upload")) {
    if (m === "DELETE") {
      return {
        title: "Deleting Document",
        subtitle: "Removing file from the system...",
      };
    }
    return {
      title: "Uploading Documents",
      subtitle: "Processing files and saving attachments...",
    };
  }

  // 10. Extraction & OCR (Multi-Part Quote PDF, Product Info, etc.)
  if (lower.includes("/quotes/extract") || (lower.includes("/quotes") && lower.includes("/extract"))) {
    return {
      title: "Extracting Multi-Part Quote",
      subtitle: "Analyzing PDF layout, OCR text, and extracting line items...",
    };
  }

  if (lower.includes("/extract-product-info") || lower.includes("/extract-product")) {
    return {
      title: "Extracting Product Details",
      subtitle: "Retrieving product title, vendor, and price from URL...",
    };
  }

  if (lower.includes("/extract")) {
    return {
      title: "Extracting Document Data",
      subtitle: "Analyzing file contents and extracting line items...",
    };
  }

  // 11. Existing Request Updates vs Creating Brand-New Request
  const isExistingRequest = /\/requests\/\w+/.test(lower);
  if (isExistingRequest) {
    if (m === "DELETE") {
      return {
        title: "Deleting Request",
        subtitle: "Removing request from the system...",
      };
    }
    return {
      title: "Updating Request",
      subtitle: "Please wait while your changes are being saved...",
    };
  }

  if (lower.endsWith("/requests") || lower.endsWith("/requests/")) {
    if (m === "POST") {
      return {
        title: "Submitting Purchase Request",
        subtitle: "Creating your request and initiating workflow...",
      };
    }
  }

  // 12. User Management
  if (lower.includes("/users/bulk-delete") || (lower.includes("/users") && lower.includes("/bulk-delete"))) {
    return {
      title: "Deleting Users",
      subtitle: "Removing selected user accounts from the system...",
    };
  }

  if (lower.includes("/users") && lower.includes("/roles")) {
    return {
      title: "Updating User Roles",
      subtitle: "Assigning selected roles to user...",
    };
  }

  if (lower.includes("/users")) {
    const isExistingUser = /\/users\/\w+/.test(lower);
    if (m === "DELETE") {
      return { title: "Deleting User", subtitle: "Removing user from the system..." };
    }
    if (isExistingUser || m === "PUT" || m === "PATCH") {
      return { title: "Updating User", subtitle: "Please wait while user changes are being saved..." };
    }
    return { title: "Creating User", subtitle: "Adding new user account to the system..." };
  }

  // 13. Roles & Permissions Management
  if (lower.includes("/permission-groups")) {
    return {
      title: "Updating Permission Groups",
      subtitle: "Saving assigned permission groups...",
    };
  }

  if (lower.includes("/mcp-tool-permissions")) {
    return {
      title: "Updating AI Tool Permissions",
      subtitle: "Saving tool access controls...",
    };
  }

  if (lower.includes("/navigation-permissions")) {
    return {
      title: "Updating Navigation Permissions",
      subtitle: "Saving menu access permissions...",
    };
  }

  if (lower.includes("/roles")) {
    if (m === "DELETE") {
      return { title: "Deleting Role", subtitle: "Removing role from the system..." };
    }
    if (m === "POST") {
      return { title: "Creating Role", subtitle: "Adding new role to the system..." };
    }
    return {
      title: "Updating Roles & Permissions",
      subtitle: "Saving permission configurations...",
    };
  }

  // 14. Chart of Accounts
  if (lower.includes("/chart-of-accounts")) {
    if (m === "DELETE") {
      return {
        title: "Deleting Account",
        subtitle: "Removing account from Chart of Accounts...",
      };
    }
    if (lower.includes("/status")) {
      return {
        title: "Updating Account Status",
        subtitle: "Changing chart of accounts active status...",
      };
    }
    if (m === "POST") {
      return {
        title: "Creating Account",
        subtitle: "Adding new account to Chart of Accounts...",
      };
    }
    return {
      title: "Updating Chart of Accounts",
      subtitle: "Saving account codes and categories...",
    };
  }

  // 15. Workflow Assignments
  if (lower.includes("/workflow-assignments")) {
    return {
      title: "Updating Workflow Assignments",
      subtitle: "Saving approval routing rules...",
    };
  }

  // 16. Notifications
  if (lower.includes("/notifications")) {
    if (m === "DELETE") {
      return {
        title: "Clearing Notifications",
        subtitle: "Please wait while notifications are being cleared...",
      };
    }
    if (lower.includes("/read-all")) {
      return {
        title: "Marking All as Read",
        subtitle: "Updating all notifications as read...",
      };
    }
    if (lower.includes("/read")) {
      return {
        title: "Updating Notification",
        subtitle: "Marking notification as read...",
      };
    }
  }

  // 17. Safe General Fallbacks Based on HTTP Method
  if (m === "DELETE") {
    return {
      title: "Deleting Record",
      subtitle: "Please wait while the record is removed...",
    };
  }

  if (m === "POST") {
    return {
      title: "Creating Record",
      subtitle: "Please wait while the new record is created...",
    };
  }

  return {
    title: "Saving Changes",
    subtitle: "Please wait while your changes are being saved...",
  };
}


const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
export const BASE_URL = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

const getAuthHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem("token");
  return token ? { "Authorization": `Bearer ${token}` } : {};
};

const configuredSlowRequestMs = Number(import.meta.env.VITE_SLOW_REQUEST_MS ?? 2000);
const SLOW_REQUEST_MS = Number.isFinite(configuredSlowRequestMs)
  ? Math.max(250, configuredSlowRequestMs)
  : 2000;
const MAX_PERFORMANCE_REPORTS_PER_MINUTE = 5;
const PERFORMANCE_DEDUPLICATION_MS = 60_000;
const performanceReportTimes: number[] = [];
const recentPerformanceReports = new Map<string, number>();

async function monitoredFetch(endpoint: string, options: ApiRequestOptions): Promise<Response> {
  const started = performance.now();
  let statusCode = 0;
  
  let targetEndpoint = endpoint;
  if (!targetEndpoint.startsWith("/api/") && !targetEndpoint.startsWith("/ai/")) {
    const path = targetEndpoint.startsWith("/") ? targetEndpoint : `/${targetEndpoint}`;
    if (path.startsWith("/api/")) {
      targetEndpoint = path;
    } else if (path.startsWith("/ai/")) {
      targetEndpoint = path;
    } else if (path === "/api" || path === "/api/") {
      targetEndpoint = "/api/";
    } else if (path === "/ai" || path === "/ai/") {
      targetEndpoint = "/ai/";
    } else {
      targetEndpoint = `/api${path}`;
    }
  }


  const method = (options.method || "GET").toUpperCase();
  const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  const isIgnored =
    Boolean(options.skipGlobalLoading) ||
    targetEndpoint.includes("/observability/") ||
    targetEndpoint.includes("/client-performance") ||
    targetEndpoint.includes("/heartbeat") ||
    targetEndpoint.includes("/stream") ||
    targetEndpoint.includes("/extract-product-info") ||
    targetEndpoint.includes("/extract-product");

  let actionId: string | null = null;
  if (isMutating && !isIgnored) {
    actionId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const customLabel = options.actionLabel;
    const customSubtitle = options.actionSubtitle;
    const meta = resolveActionMeta(method, targetEndpoint, options.body, customLabel, customSubtitle);
    activeActions.set(actionId, {
      id: actionId,
      method,
      endpoint: targetEndpoint,
      title: meta.title,
      subtitle: meta.subtitle,
      startedAt: Date.now(),
    });
    notifyActionListeners();
  }

  try {
    const response = await fetch(`${BASE_URL}${targetEndpoint}`, options);
    statusCode = response.status;
    return response;
  } finally {
    if (actionId) {
      activeActions.delete(actionId);
      notifyActionListeners();
    }
    const durationMs = performance.now() - started;
    if (
      durationMs >= SLOW_REQUEST_MS &&
      !targetEndpoint.startsWith("/api/observability/")
    ) {
      const now = Date.now();
      while (performanceReportTimes.length && performanceReportTimes[0] < now - 60_000) {
        performanceReportTimes.shift();
      }
      for (const [key, reportedAt] of recentPerformanceReports) {
        if (reportedAt < now - PERFORMANCE_DEDUPLICATION_MS) {
          recentPerformanceReports.delete(key);
        }
      }
      const method = options.method ?? "GET";
      const path = endpoint.split("?", 1)[0];
      const fingerprint = `${method}:${path}`;
      const lastReportedAt = recentPerformanceReports.get(fingerprint) ?? 0;
      if (
        performanceReportTimes.length < MAX_PERFORMANCE_REPORTS_PER_MINUTE &&
        now - lastReportedAt >= PERFORMANCE_DEDUPLICATION_MS
      ) {
        performanceReportTimes.push(now);
        recentPerformanceReports.set(fingerprint, now);
        void fetch(`${BASE_URL}/api/observability/client-performance`, {
          method: "POST",
          credentials: "include",
          keepalive: true,
          headers: { 
            "Content-Type": "application/json",
            ...getAuthHeaders()
          },
          body: JSON.stringify({
            method,
            path,
            duration_ms: durationMs,
            status_code: statusCode,
          }),
        }).catch(() => undefined);
      }
    }
  }
}

export const apiClient = {
  async get<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    const res = await monitoredFetch(endpoint, {
      ...options, 
      method: "GET",
      credentials: "include",
      headers: {
        ...getAuthHeaders(),
        ...(options?.headers as Record<string, string>)
      } as HeadersInit
    });
    return handleResponse<T>(res);
  },
  
  async post<T>(endpoint: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    const isFormData = body instanceof FormData;
    const res = await monitoredFetch(endpoint, {
      ...options,
      method: "POST",
      credentials: "include",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...getAuthHeaders(),
        ...(options?.headers as Record<string, string>),
      } as HeadersInit,
      body: isFormData ? body : JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },
  
  async patch<T>(endpoint: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    const res = await monitoredFetch(endpoint, {
      ...options,
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
        ...(options?.headers as Record<string, string>),
      } as HeadersInit,
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },
  
  async put<T>(endpoint: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    const res = await monitoredFetch(endpoint, {
      ...options,
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
        ...(options?.headers as Record<string, string>),
      } as HeadersInit,
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },
  
  async delete<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    const res = await monitoredFetch(endpoint, {
      ...options, 
      method: "DELETE",
      credentials: "include",
      headers: {
        ...getAuthHeaders(),
        ...(options?.headers as Record<string, string>)
      } as HeadersInit
    });
    return handleResponse<T>(res);
  },
  
  async downloadFile(endpoint: string, filename: string): Promise<void> {
    const res = await monitoredFetch(endpoint, {
      method: "GET",
      credentials: "include",
      headers: {
        ...getAuthHeaders(),
      } as HeadersInit
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error((err as { detail: string }).detail || "Request failed");
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};
