// The only place raw status strings are interpreted.
//
// The API is not consistent about spelling: /purchasing/requests returns canonical
// enum values (map_db_status is applied server-side), while /tasks returns whatever
// is in the tasks.status column — which includes display spellings such as
// "Waiting Approval" and "Ordered / Purchased". Everything past this module works
// with the RequestStatus union and never inspects characters.
import { RequestStatus } from "@/types/purchasing";

/** All members, in no particular order. */
export const REQUEST_STATUSES: readonly RequestStatus[] = Object.values(RequestStatus);

const CANONICAL = new Set<string>(REQUEST_STATUSES);

/**
 * Spellings that are not states but map onto one: retired enum keys, verb forms
 * sent by older clients, and the display labels stored in some rows.
 */
const ALIASES: Readonly<Record<string, RequestStatus>> = {
  NEW_REQUEST: RequestStatus.New,
  NEW_PURCHASE_REQUEST: RequestStatus.New,
  NEW_SPEND: RequestStatus.New,
  UNDERREVIEW: RequestStatus.UnderReview,
  IN_REVIEW: RequestStatus.UnderReview,
  PENDING_APPROVAL: RequestStatus.WaitingApproval,
  AWAITING_APPROVAL: RequestStatus.WaitingApproval,
  APPROVE: RequestStatus.Approved,
  REJECT: RequestStatus.Rejected,
  SENT_TO_AP: RequestStatus.WaitingPayment,
  PENDING_PAYMENT: RequestStatus.WaitingPayment,
  AP_PENDING: RequestStatus.WaitingPayment,
  ORDERED: RequestStatus.Purchased,
  ORDER_PLACED: RequestStatus.Purchased,
  IN_TRANSIT: RequestStatus.Shipped,
  RECEIVED: RequestStatus.GoodsReceived,
  ITEMS_RECEIVED: RequestStatus.GoodsReceived,
  INVOICE_RECORDED: RequestStatus.InvoiceReceived,
  CLOSED: RequestStatus.Completed,
  FINALISED: RequestStatus.Completed,
  FINALIZED: RequestStatus.Completed,
  HOLD: RequestStatus.OnHold,
  PAUSED: RequestStatus.OnHold,
};

/**
 * Substring fallback for values that match neither a member nor an alias — for
 * example "Ordered / Purchased", which normalises to ORDERED_/_PURCHASED.
 * Order mirrors `map_db_status` in the backend's purchasing_service, including its
 * precedence; keep the two in sync.
 */
const SUBSTRING_RULES: ReadonlyArray<readonly [string, RequestStatus]> = [
  ["HOLD", RequestStatus.OnHold],
  ["INVOICE RECEIVED", RequestStatus.InvoiceReceived],
  ["GOODS", RequestStatus.GoodsReceived],
  ["UNDER REVIEW", RequestStatus.UnderReview],
  ["WAITING APPROVAL", RequestStatus.WaitingApproval],
  ["WAITING PAYMENT", RequestStatus.WaitingPayment],
  ["SENT TO AP", RequestStatus.WaitingPayment],
  ["PURCHASED", RequestStatus.Purchased],
  ["ORDERED", RequestStatus.Purchased],
  ["SHIPPED", RequestStatus.Shipped],
  ["APPROVED", RequestStatus.Approved],
  ["REJECTED", RequestStatus.Rejected],
  ["NEW", RequestStatus.New],
  ["COMPLETED", RequestStatus.Completed],
];

/** Upper-case, trim, collapse whitespace to underscores. */
function normalise(raw: unknown): string {
  if (raw === null || raw === undefined || raw === "") return "";
  let value: unknown = raw;
  if (typeof raw === "object") {
    const rec = raw as Record<string, unknown>;
    value = rec.value ?? rec.status ?? rec.name ?? String(raw);
  }
  return String(value).toUpperCase().trim().replace(/\s+/g, "_");
}

/**
 * Convert an arbitrary API/DB value into a workflow state.
 *
 * Returns null for absent input and for values that cannot be identified — the
 * caller decides what to do with "no state" rather than getting a wrong one.
 */
export function parseRequestStatus(raw: unknown): RequestStatus | null {
  const key = normalise(raw);
  if (!key) return null;
  if (CANONICAL.has(key)) return key as RequestStatus;
  if (key in ALIASES) return ALIASES[key];

  const spaced = key.replace(/_/g, " ");
  for (const [needle, status] of SUBSTRING_RULES) {
    if (spaced.includes(needle)) return status;
  }
  return null;
}

/**
 * Canonical pipeline order — the single source of truth for "how far along".
 * Exception states are absent by design: they have no position.
 */
export const PIPELINE_ORDER: readonly RequestStatus[] = [
  RequestStatus.Initial,
  RequestStatus.New,
  RequestStatus.UnderReview,
  RequestStatus.WaitingApproval,
  RequestStatus.Approved,
  RequestStatus.Purchased,
  RequestStatus.Shipped,
  RequestStatus.GoodsReceived,
  RequestStatus.InvoiceReceived,
  RequestStatus.WaitingPayment,
  RequestStatus.Completed,
];

/** Position in the pipeline, or null for states that sit outside it. */
export function pipelineRank(status: RequestStatus): number | null {
  const i = PIPELINE_ORDER.indexOf(status);
  return i === -1 ? null : i;
}

/** States that interrupt the pipeline rather than advance it. */
export function isExceptionStatus(status: RequestStatus): boolean {
  return status === RequestStatus.Rejected || status === RequestStatus.OnHold;
}
