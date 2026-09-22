export type { GLCodeOption } from "./chartOfAccount";

export interface TaskHistoryItem {
  id: number;
  task_id: number;
  changed_by: string;
  changed_by_name: string;
  action: string;
  old_value?: string;
  new_value?: string;
  comment?: string;
  created_at: string;
}

export type RequestType = "ADMIN" | "SPEND" | "RECURRING" | "QUOTE" | "ACCOUNTS_PAYABLE";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export const RequestStatus = {
  Initial: "INITIAL",
  New: "NEW",
  UnderReview: "UNDER_REVIEW",
  WaitingApproval: "WAITING_APPROVAL",
  Approved: "APPROVED",
  WaitingPayment: "WAITING_PAYMENT",
  Purchased: "PURCHASED",
  Shipped: "SHIPPED",
  GoodsReceived: "GOODS_RECEIVED",
  InvoiceReceived: "INVOICE_RECEIVED",
  Completed: "COMPLETED",
  Rejected: "REJECTED",
  OnHold: "ON_HOLD",
} as const;

export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ApprovalDecision = "APPROVED" | "REJECTED";

export type PaymentStatus = "UNPAID" | "WAITING_PAYMENT" | "PAID";

export type PaymentMethod = "CC" | "DC" | "W" | string;

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CC: "Credit Card",
  DC: "Debit Card",
  W: "Wire",
  WIRE: "Wire Transfer",
};

export type Currency = {
  code: string;
  name: string;
  symbol: string;
};

export interface ExchangeRateResult {
  from_currency: string;
  to_currency: string;
  exchange_rate: number;
  rate_date: string;
  source: string;
}

export type NotificationStatus = "SENT" | "READ";

export type WorkflowAction =
  | "SUBMIT_REQUEST"
  | "DELETE_REQUEST"
  | "START_REVIEW"
  | "CREATE_PO"
  | "APPROVE"
  | "REJECT"
  | "MARK_PURCHASED"
  | "ADD_TRACKING"
  | "MARK_SHIPPED"
  | "CONFIRM_GOODS_RECEIVED"
  | "RECORD_INVOICE"
  | "SEND_TO_AP"
  | "PUT_ON_HOLD"
  | "RESUME_WORKFLOW"
  | "COMPLETE";

export type ProductInfo = {
  name: string;
  price: string;
  category: string;
  brand: string;
  description: string;
  vendor: string;
  currency: string;
  original_price?: string | null;
  original_currency?: string | null;
};

export type FrequencyType =
  | "DAILY"
  | "WEEKLY"
  | "BI_WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "SEMI_ANNUALLY"
  | "ANNUALLY"
  | "CUSTOM";

export interface CustomScheduleDate {
  date: string;
  amount?: number | null;
  note?: string | null;
}

export interface RecurringSchedule {
  is_scheduled: boolean;
  frequency: FrequencyType | string;
  start_date: string;
  end_date?: string | null;
  total_installments?: number | null;
  completed_installments: number;
  amount_per_cycle?: number | null;
  total_amount?: number | null;
  custom_dates?: string[] | null;
  schedule_dates?: CustomScheduleDate[] | null;
}

export type PurchaseRequest = {
  id: string;
  title: string;
  requester: string;
  department: string;
  request_date: string;
  request_type: RequestType;
  priority: Priority;
  status: RequestStatus;
  item_mode?: ItemMode;
  sku?: string | null;
  hold_reason?: string | null;
  hold_date?: string | null;
  assigned_user: string | null;
  requester_id?: string | null;
  requester_email?: string | null;
  assigned_user_id?: string | null;
  assigned_user_ids?: string[] | null;
  description: string | null;
  item_url?: string | null;
  product_info?: ProductInfo | null;
  quantity: number;
  unit_price: number;
  amount: number;
  currency?: string | null;
  category?: string | null;
  gl_code?: string | null;
  project_name?: string | null;
  items?: PurchaseRequestItem[];
  quote_data?: any;
  review_status?: "WAITING_FOR_REVIEW" | "REVIEWED" | null;
  current_approval_level?: number | null;
  requires_second_level?: boolean | null;
  due_date?: string | null;
  recurring_schedule?: RecurringSchedule | null;
  created_at: string;
  updated_at: string;
};

export type PurchaseOrder = {
  id: string;
  request_id: string;
  vendor: string;
  item: string;
  description: string | null;
  quote_number: string | null;
  sku?: string | null;
  item_url?: string | null;
  product_info?: ProductInfo | null;
  quantity?: number;
  unit_price?: number;
  amount: number;
  currency?: string | null;
  category?: string | null;
  gl_code?: string | null;
  payment_method?: PaymentMethod | null;
  shipped_to_location?: string | null;
  approval_status: ApprovalStatus;
  expected_delivery_date?: string | null;
  tracking_number: string | null;
  shipping_note?: string | null;
  goods_received: boolean;
  goods_received_at: string | null;
  goods_received_by: string | null;
  goods_received_note?: string | null;
  created_at: string;
};

export type InvoiceItemDetail = {
  id?: string;
  invoice_id?: string;
  item: string;
  request_item_id?: number | null;
  description: string;
  sku?: string | null;
  quantity: number;
  unit_price: number;
  amount: number;
  category?: string | null;
  gl_code: string;
  asset_flag: boolean;
  created_at?: string;
};

export type Invoice = {
  id: string;
  request_id: string;
  po_id: string | null;
  vendor: string;
  amount: number;
  invoice_date: string;
  due_date: string | null;
  payment_status: PaymentStatus;
  paid_date: string | null;
  category?: string | null;
  gl_code: string | null;
  bank_account?: string | null;
  asset_flag: boolean;
  invoice_type?: string | null;
  description?: string | null;
  created_at: string;
  items?: InvoiceItemDetail[];
};

export type Approval = {
  id: string;
  request_id: string;
  approver: string;
  approval_date: string;
  decision: ApprovalDecision;
  comment: string | null;
};

export type PurchasingNotification = {
  id: number;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link_url?: string;
  entity_type?: string;
  entity_id?: string;
  sender_name?: string;
  sender_avatar?: string;
  attachments?: any[];
  is_read: boolean;
  created_at: string;
  read_at?: string;
};

export type AttachmentInfo = {
  id: string;
  filename: string;
  content_type: string | null;
  size: number;
  uploaded_at: string;
  uploaded_by?: string | null;
  uploader_name?: string | null;
};

export type RequestDetail = {
  request: PurchaseRequest;
  purchase_order: PurchaseOrder | null;
  invoice: Invoice | null;
  wire_transfer?: WireTransfer | null;
  approvals: Approval[];
  notifications: PurchasingNotification[];
  available_actions: WorkflowAction[];
  ordered_date: string | null;
  attachments: AttachmentInfo[];
  history: TaskHistoryItem[];
};

export type PurchasingSummary = {
  total_requests: number;
  open_requests: number;
  awaiting_approval: number;
  unpaid_invoices: number;
  unpaid_amount: number;
  completed: number;
  status_counts: Record<string, number>;
  status_amounts?: Record<string, number>;
  recurring_total?: number;
  recurring_due_soon_count?: number;
  recurring_due_soon_amount?: number;
  recurring_waiting_review?: number;
  recurring_reviewed?: number;
  recurring_rejected?: number;
  my_approvals_count?: number;
  user_action_counts?: Record<string, number>;
  user_unread_notif_counts?: Record<string, number>;
  has_user_notifications?: Record<string, boolean>;
};

export type RequestCreateInput = {
  title: string;
  requester: string;
  department: string;
  request_type: RequestType;
  priority: Priority;
  item_mode?: ItemMode;
  description?: string | null;
  assigned_user?: string | null;
  item_url?: string | null;
  product_info?: ProductInfo | null;
  quantity?: number;
  unit_price?: number;
  amount?: number;
  currency?: string | null;
  gl_code?: string | null;
  project_name?: string | null;
  items?: PurchaseRequestItem[];
  quote_file_id?: string | null;
  quote_data?: any;
  due_date?: string | null;
  recurring_schedule?: RecurringSchedule | null;
  wire_transfer?: WireTransferInput;
};

export type PurchaseOrderInput = {
  vendor: string;
  item: string;
  description?: string | null;
  quote_number?: string | null;
  item_url?: string | null;
  product_info?: ProductInfo | null;
  expected_delivery_date?: string | null;
  quantity?: number;
  unit_price?: number;
  amount: number;
  currency?: string | null;
  payment_method?: PaymentMethod | null;
  shipped_to_location?: string | null;
  gl_code?: string | null;
  items?: any[] | null;
};

export type InvoiceItemInput = {
  request_item_id?: number | null;
  description: string;
  sku?: string | null;
  quantity: number;
  unit_price: number;
  amount: number;
  gl_code: string;
  asset_flag?: boolean;
};

export type InvoiceInput = {
  vendor: string;
  amount: number;
  invoice_date: string;
  due_date?: string | null;
  gl_code?: string | null;
  bank_account?: string | null;
  asset_flag?: boolean;
  invoice_type?: string | null;
  description?: string | null;
  items?: InvoiceItemInput[];
};

export type ApprovalInput = {
  approver: string;
  comment?: string | null;
  pass_to_level_2?: boolean;
};

export type TrackingInput = {
  tracking_number: string;
  note?: string;
};

export type HoldInput = {
  reason: string;
};

export type ConfirmGoodsInput = {
  description?: string;
  note?: string;
};


export type WireTransferInput = {
  entered_by?: string | null;
  entered_by_user_id?: string | null;
  entry_date?: string | null;
  due_date?: string | null;
  payment_date?: string | null;
  vendor?: string | null;
  is_new_vendor?: boolean;
  pay_date?: string | null;
  amount?: number | null;
  currency?: string | null;
  conversion_rate?: string | null;
  pay_from?: string | null;
  invoice_number?: string | null;
  comments?: string | null;
  vendor_address?: string | null;
  bank_address?: string | null;
  vendor_email?: string | null;
  bank_name?: string | null;
  tax_id?: string | null;
  bank_country?: string | null;
  routing_wire?: string | null;
  routing_ach?: string | null;
  bank_account_number?: string | null;
  swift_code?: string | null;
  sort_code?: string | null;
  transit_code_ca?: string | null;
  transit_number_ca?: string | null;
  institution_code?: string | null;
  branch_code?: string | null;
  bsb_australia?: string | null;
  clearing_code?: string | null;
  bank_code?: string | null;
  iban?: string | null;
  bic?: string | null;
  transit?: string | null;
  aba?: string | null;
  region?: string | null;
  contact_name_china?: string | null;
};

export type WireTransfer = WireTransferInput & {
  id: number;
  request_id: number;
  created_at?: string;
  updated_at?: string;
};

export type TransitionInput = {
  action: WorkflowAction;
  wire_transfer?: WireTransferInput;
  purchase_order?: PurchaseOrderInput;
  invoice?: InvoiceInput;
  approval?: ApprovalInput;
  tracking?: TrackingInput;
  hold?: HoldInput;
  confirm_goods?: ConfirmGoodsInput;
  description?: string;
  comment?: string;
  next_due_date?: string;
  due_date?: string;
  recurring_schedule?: RecurringSchedule | null;
};


export type ItemMode = "SINGLE" | "MULTIPLE";

export interface PurchaseRequestItem {
  id?: string;
  request_id?: string;
  item_order?: number;
  sku?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  tax?: number;
  total: number;
  converted_unit_price?: number | null;
  converted_total?: number | null;
  original_unit_price?: number | null;
  original_total?: number | null;
  original_currency?: string | null;
  gl_code?: string | null;
}

export interface QuoteItem {
  description: string;
  sku?: string | null;
  quantity: number;
  unit_price: number;
  discount?: number;
  tax?: number;
  total: number;
  converted_unit_price?: number | null;
  converted_total?: number | null;
  original_unit_price?: number | null;
  original_total?: number | null;
  original_currency?: string | null;
}

export interface QuoteVendor {
  name?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface QuoteCustomer {
  name?: string | null;
  address?: string | null;
}

export interface QuoteTotals {
  subtotal?: number;
  discount?: number;
  shipping?: number;
  tax?: number;
  total: number;
}

export interface QuoteCurrencyConversion {
  original_currency: string;
  target_currency: string;
  exchange_rate: number;
  original_subtotal: number;
  converted_subtotal: number;
  original_tax: number;
  converted_tax: number;
  original_shipping: number;
  converted_shipping: number;
  original_discount: number;
  converted_discount: number;
  original_total: number;
  converted_total: number;
  rate_date?: string | null;
  rate_source: string;
  is_converted: boolean;
}

export interface QuoteExtractionResult {
  vendor?: QuoteVendor | null;
  quote_number?: string | null;
  quote_date?: string | null;
  valid_until?: string | null;
  currency?: string | null;
  customer?: QuoteCustomer | null;
  items: QuoteItem[];
  totals?: QuoteTotals | null;
  payment_terms?: string | null;
  delivery_terms?: string | null;
  notes?: string | null;
  conversion?: QuoteCurrencyConversion | null;
}

export interface QuoteValidationResult {
  status: "passed" | "warning" | "failed";
  warnings: string[];
  line_items_valid: boolean;
  subtotal_valid: boolean;
  total_valid: boolean;
}

export interface QuoteExtractionResponse {
  file_id?: string | null;
  file_name?: string | null;
  ocr_used: boolean;
  page_count: number;
  confidence_score: number;
  extraction: QuoteExtractionResult;
  validation: QuoteValidationResult;
}

export interface BatchApprovalInput {
  request_ids: number[];
  comment?: string | null;
}

export interface BatchRejectInput {
  request_ids: number[];
  comment?: string | null;
}

export interface BatchNotificationSettings {
  enabled: boolean;
  midday_time: string;
  end_of_day_time: string;
  timezone: string;
  recipient_role: string;
  custom_emails?: string[] | null;
}


export type RecurringNotificationSettings = {
  enabled: boolean;
  days_ahead: number;
  sender_email?: string | null;
  reminder_time: string;
  timezone: string;
  include_requester: boolean;
  include_ap: boolean;
  include_treasury: boolean;
  recipient_user_ids?: string[] | null;
  recipient_emails?: string[] | null;
  custom_emails?: string[] | null;
};

export interface ProjectGroupItem {
  id?: number | null;
  name: string;
  code?: string | null;
  description?: string | null;
  request_count: number;
  total_amount: number;
  open_count: number;
  completed_count: number;
  last_activity_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProjectGroupCreateInput {
  name: string;
  code: string;
  description?: string | null;
}

export interface ProjectGroupUpdateInput {
  name?: string | null;
  code?: string | null;
  description?: string | null;
}
