import type {
  Activity,
  ActivityType,
  Buyer,
  BuyerInput,
  EmailLog,
  Supplier,
  SupplierInput,
} from "@/lib/types";

export interface DataStore {
  mode: "supabase" | "local";
  listSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | null>;
  createSupplier(input: SupplierInput): Promise<Supplier>;
  updateSupplier(id: string, patch: Partial<SupplierInput>): Promise<Supplier>;
  deleteSupplier(id: string): Promise<void>;

  listBuyers(): Promise<Buyer[]>;
  getBuyer(id: string): Promise<Buyer | null>;
  createBuyer(input: BuyerInput): Promise<Buyer>;
  updateBuyer(id: string, patch: Partial<BuyerInput>): Promise<Buyer>;
  deleteBuyer(id: string): Promise<void>;

  listActivities(buyerId?: string): Promise<Activity[]>;
  addActivity(input: {
    buyer_id: string;
    type: ActivityType;
    from_stage?: string | null;
    to_stage?: string | null;
    message: string;
    created_by?: string | null;
  }): Promise<Activity>;

  listEmails(limit?: number): Promise<EmailLog[]>;
  addEmail(input: Omit<EmailLog, "id" | "created_at">): Promise<EmailLog>;
}
