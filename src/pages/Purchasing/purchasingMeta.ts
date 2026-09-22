// Presentation metadata for Purchasing + Tasks.
import { RequestStatus } from "@/types/purchasing";
import type { PaymentStatus, Priority, WorkflowAction } from "@/types/purchasing";
import { parseRequestStatus } from "@/lib/requestStatus";

// Keyed by RequestStatus rather than string, so adding a state to the union turns
// a missing label or badge into a compile error instead of a blank chip. Legacy
// spellings are absent on purpose — parseRequestStatus resolves them first.
export const STATUS_LABEL: Record<RequestStatus, string> = {
  [RequestStatus.Initial]: "Draft",
  [RequestStatus.New]: "New Request",
  [RequestStatus.UnderReview]: "Under Review",
  [RequestStatus.WaitingApproval]: "Waiting Approval",
  [RequestStatus.Approved]: "Approved",
  [RequestStatus.WaitingPayment]: "Waiting Payment",
  [RequestStatus.Purchased]: "Ordered / Purchased",
  [RequestStatus.Shipped]: "Shipped",
  [RequestStatus.GoodsReceived]: "Goods Received",
  [RequestStatus.InvoiceReceived]: "Invoice Received",
  [RequestStatus.Completed]: "Completed",
  [RequestStatus.Rejected]: "Rejected",
  [RequestStatus.OnHold]: "On Hold / Exception",
};

export const STATUS_BADGE: Record<RequestStatus, string> = {
  [RequestStatus.Initial]: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 border-dashed",
  [RequestStatus.New]: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300",
  [RequestStatus.UnderReview]: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400",
  [RequestStatus.WaitingApproval]: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400",
  [RequestStatus.Approved]: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400",
  [RequestStatus.WaitingPayment]: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400",
  [RequestStatus.Purchased]: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400",
  [RequestStatus.Shipped]: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-400",
  [RequestStatus.GoodsReceived]: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-400",
  [RequestStatus.InvoiceReceived]: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-400",
  [RequestStatus.Completed]: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400",
  [RequestStatus.Rejected]: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400",
  [RequestStatus.OnHold]: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-400",
};

/** Display label for a raw API status. Unidentifiable values are shown verbatim. */
export function getStatusLabel(status: string | undefined | null): string {
  const parsed = parseRequestStatus(status);
  if (parsed) return STATUS_LABEL[parsed];
  return status ? String(status) : STATUS_LABEL[RequestStatus.New];
}

/** Badge classes for a raw API status. */
export function getStatusBadge(status: string | undefined | null): string {
  const parsed = parseRequestStatus(status);
  return STATUS_BADGE[parsed ?? RequestStatus.New];
}

export const PRIORITY_BADGE: Record<Priority, string> = {
  LOW: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300",
  MEDIUM: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400",
  URGENT: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400",
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  WAITING_PAYMENT: "Waiting Payment",
  PAID: "Paid",
};

export const PAYMENT_BADGE: Record<PaymentStatus, string> = {
  UNPAID: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300",
  WAITING_PAYMENT: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400",
};

export const ADMIN_FLOW: readonly RequestStatus[] = [
  RequestStatus.Initial,
  RequestStatus.New,
  RequestStatus.UnderReview,
  RequestStatus.Completed,
];

export const SPEND_FLOW: readonly RequestStatus[] = [
  RequestStatus.Initial,
  RequestStatus.New,
  RequestStatus.UnderReview,
  RequestStatus.WaitingApproval,
  RequestStatus.Approved,
  RequestStatus.WaitingPayment,
  RequestStatus.Purchased,
  RequestStatus.Shipped,
  RequestStatus.GoodsReceived,
  RequestStatus.InvoiceReceived,
  RequestStatus.Completed,
];

export const RECURRING_FLOW: readonly RequestStatus[] = [
  RequestStatus.UnderReview,
  RequestStatus.WaitingPayment,
  RequestStatus.InvoiceReceived,
  RequestStatus.Completed,
];

export const ACCOUNTS_PAYABLE_FLOW: readonly RequestStatus[] = [
  RequestStatus.Initial,
  RequestStatus.New,
  RequestStatus.WaitingApproval,
  RequestStatus.WaitingPayment,
  RequestStatus.InvoiceReceived,
  RequestStatus.Completed,
];

export const QUOTE_FLOW: readonly RequestStatus[] = [
  RequestStatus.Initial,
  RequestStatus.New,
  RequestStatus.UnderReview,
  RequestStatus.WaitingApproval,
  RequestStatus.Approved,
  RequestStatus.WaitingPayment,
  RequestStatus.Purchased,
  RequestStatus.Shipped,
  RequestStatus.GoodsReceived,
  RequestStatus.InvoiceReceived,
  RequestStatus.Completed,
];

/**
 * States offered in filter dropdowns: the superset pipeline plus the two exception
 * states. Duplicates are impossible now that the union carries no legacy spellings.
 */
export const STATUS_FILTER_OPTIONS: readonly RequestStatus[] = [
  ...SPEND_FLOW,
  RequestStatus.Rejected,
  RequestStatus.OnHold,
];

export const ACTION_META: Record<WorkflowAction, { label: string; form?: "po" | "invoice" | "approval" | "tracking" | "confirmGoods" | "hold" | "complete"; variant?: "default" | "destructive" | "outline" }> = {
  SUBMIT_REQUEST: { label: "Submit Request", variant: "default" },
  DELETE_REQUEST: { label: "Delete Request", variant: "destructive" },
  START_REVIEW: { label: "Start Review", variant: "default" },
  CREATE_PO: { label: "Quote / PO #", form: "po", variant: "default" },
  APPROVE: { label: "Approve", form: "approval", variant: "default" },
  REJECT: { label: "Reject", form: "approval", variant: "destructive" },
  MARK_PURCHASED: { label: "Mark Purchased", variant: "default" },
  ADD_TRACKING: { label: "Add Tracking & Mark Shipped", form: "tracking", variant: "default" },
  MARK_SHIPPED: { label: "Mark Shipped", variant: "default" },
  RECORD_INVOICE: { label: "Record Invoice / Receipts", form: "invoice", variant: "default" },
  SEND_TO_AP: { label: "Send to AP", variant: "default" },
  CONFIRM_GOODS_RECEIVED: { label: "Confirm Goods Received", form: "confirmGoods", variant: "default" },
  PUT_ON_HOLD: { label: "Put on Hold", form: "hold", variant: "destructive" },
  RESUME_WORKFLOW: { label: "Resume Request", variant: "default" },
  COMPLETE: { label: "Complete", variant: "default" },
};

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    if (typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [year, month, day] = iso.split("-").map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return String(iso);
  }
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(iso);
  }
}

export function formatMoney(val: number | null | undefined, currency: string = "USD"): string {
  if (val == null) val = 0;
  const curr = (currency || "USD").toUpperCase().trim();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  } catch {
    return `${curr} ${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}


export const SHIPPED_TO_LOCATIONS = [
  "Vancouver, BC",
  "Virginia Beach, VA",
  "Berlin, BE",
  "Lahore, PB",
  "Jacksonville, FL",
  "Toronto, ON",
  "Sharjah, SH",
  "Baton Rouge, LA",
  "Greensboro, NC",
  "Park Ridge, IL",
  "Sunshine Coast, QLD",
  "Dublin, DU",
  "Beaverton, OR",
  "London, GL",
  "Gladstone, QLD",
  "Davao City, DVO",
  "Naperville, IL",
  "West Palm Beach, FL",
  "Lake Worth Beach, FL",
  "Taipei City, TP",
  "Mesa, AZ",
  "Spokane, WA",
  "Dunboyne, MH",
  "Chicago, IL",
  "Rock Hill, SC",
  "Arlington, VA",
  "Brisbane, QLD",
  "Grand Prairie, AB",
  "Santa Rosa, CA",
  "Portland, OR",
  "Pensacola, FL",
  "Waynesboro, VA",
  "Los Angeles, CA",
  "Sivrihisar, ES",
  "Williamsburg, VA",
  "Lebanon, OH",
  "Lake Mary, FL",
  "Weston-super-Mare, NSM",
  "Sydney, NSW",
  "Taguig, NCR",
  "Forest, VA",
  "Tucson, AZ",
  "Pasig, NCR",
  "Orlando, FL",
  "Winter Garden, FL",
  "Ho Chi Minh City, HCM",
  "Ontario, CA",
  "Jonesboro, AR",
  "Manassas, VA",
  "Woodland Park, CO",
  "Seoul, SE",
  "Medellín, ANT",
  "Kiowa, CO",
  "Hammonds Plains, NS",
  "Murray, UT",
  "Fort Pierce, FL",
  "Remote",
  "Halifax, NS",
  "Tokyo, TK",
  "Bristol, BST",
  "Salt Lake City, UT",
  "Liloan, CEB",
  "Los Baños, LAG",
  "Jamesboro, AK",
  "Chesterfield, VA",
  "Jonesboro, AZ",
  "Calamba, LAG",
  "Eagle Mountain, UT",
  "Cali, ON",
  "Marikina, NCR",
  "Aiea, HI",
  "Batangas, BTG",
  "Mandaluyong City, NCR",
  "Beaumont, TX",
  "Carmel, IN",
  "Stockholm, ST",
  "Manchester, GM",
  "Washington, DC",
  "Ketchum, ID",
  "McDonough, GA",
];

export const TAX_RATE = 0.08;

export function formatActivityAction(action: string | null | undefined): string {
  if (!action) return "Activity";
  const clean = action.trim().toUpperCase();
  const map: Record<string, string> = {
    STATUS_CHANGED: "Status Updated",
    CREATED: "Request Created",
    SUBMIT_REQUEST: "Request Submitted",
    REQUEST_SUBMITTED: "Request Submitted",
    START_REVIEW: "Review Started",
    CREATE_PO: "Purchase Order Created",
    PO_CREATED: "Purchase Order Created",
    SUBMITTED_FOR_APPROVAL: "Submitted for Approval",
    APPROVE: "Approved",
    APPROVED: "Approved",
    REJECT: "Rejected",
    REJECTED: "Rejected",
    RECORD_INVOICE: "Invoice Recorded",
    INVOICE_RECORDED: "Invoice Recorded",
    INVOICE_PAID: "Invoice Paid",
    SEND_TO_AP: "Sent to Accounts Payable",
    ADD_TRACKING: "Tracking Added",
    TRACKING_ADDED: "Tracking Added",
    MARK_SHIPPED: "Marked as Shipped",
    SHIPPED: "Marked as Shipped",
    CONFIRM_GOODS_RECEIVED: "Goods Received Confirmed",
    GOODS_RECEIVED: "Goods Received",
    PUT_ON_HOLD: "Placed on Hold",
    ON_HOLD: "Placed on Hold",
    RESUME_WORKFLOW: "Workflow Resumed",
    REQUEST_EDITED: "Request Edited",
    DELETE_REQUEST: "Request Deleted",
    REVIEW_STATUS_UPDATED: "Review Status Updated",
  };
  if (map[clean]) return map[clean];
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatActivityValue(val: string | null | undefined): string {
  if (!val) return "";
  return getStatusLabel(val);
}


export const REQUEST_TYPE_LABEL: Record<string, string> = {
  SPEND: "Spend",
  QUOTE: "Quote",
  ACCOUNTS_PAYABLE: "Accounts Payable",
  "ACCOUNTS PAYABLE": "Accounts Payable",
  ADMIN: "Admin",
  RECURRING: "Recurring Payment",
  SCHEDULED_PAYMENT: "Scheduled Payment",
  "SCHEDULED PAYMENT": "Scheduled Payment",
  ALL: "All Types",
};

export function formatRequestType(type: string | null | undefined): string {
  if (!type) return "—";
  const clean = String(type).trim().toUpperCase();
  if (REQUEST_TYPE_LABEL[clean]) return REQUEST_TYPE_LABEL[clean];
  return clean.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
