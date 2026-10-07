export type Priority = "low" | "normal" | "high";

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  zalo: string | null;
  address: string | null;
  province: string | null;
  products: string | null;
  tax_id: string | null;
  payment_terms: string | null;
  lead_time_days: number | null;
  rating: number | null;
  notes: string | null;
  status: "active" | "paused";
  created_at: string;
  updated_at: string;
}

export interface Buyer {
  id: string;
  company: string;
  contact_name: string | null;
  email: string | null;
  cc_emails: string | null;
  phone: string | null;
  country: string | null;
  website: string | null;
  product: string | null;
  spec: string | null;
  quantity: string | null;
  target_price: string | null;
  incoterm: string | null;
  port: string | null;
  expected_ship_date: string | null;
  deal_value: number | null;
  /** null khi chưa chọn NCC – điều hoàn toàn bình thường ở giai đoạn đầu */
  supplier_id: string | null;
  /** Ẩn danh buyer khi email cho supplier (mặc định: ẩn) */
  hide_buyer_from_supplier: boolean;
  stage: string;
  owner: string | null;
  source: string | null;
  priority: Priority;
  next_action: string | null;
  next_action_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ActivityType =
  | "created"
  | "updated"
  | "stage_change"
  | "supplier_change"
  | "note"
  | "email";

export interface Activity {
  id: string;
  buyer_id: string;
  type: ActivityType;
  from_stage: string | null;
  to_stage: string | null;
  message: string;
  created_by: string | null;
  created_at: string;
}

export interface EmailLog {
  id: string;
  buyer_id: string;
  supplier_id: string | null;
  stage: string;
  direction: "buyer" | "supplier" | "both";
  subject: string;
  recipients: string[];
  body_html: string;
  status: "sent" | "failed" | "simulated";
  provider: "resend" | "local";
  error: string | null;
  created_at: string;
}

export interface BuyerWithSupplier extends Buyer {
  supplier: Pick<Supplier, "id" | "name" | "email" | "phone" | "contact_name"> | null;
}

export type BuyerInput = Omit<Buyer, "id" | "created_at" | "updated_at">;
export type SupplierInput = Omit<Supplier, "id" | "created_at" | "updated_at">;
