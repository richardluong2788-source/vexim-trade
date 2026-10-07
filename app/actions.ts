"use server";

import { revalidatePath } from "next/cache";

import { getStore } from "@/lib/db";
import { resendLoggedEmail, sendStageUpdate } from "@/lib/email/send";
import { getStage, isStage } from "@/lib/pipeline";
import type { Buyer, BuyerInput, SupplierInput } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  message: string;
  details?: string[];
  id?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function bool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "on" || v === "1") return true;
  if (v === "false" || v === "off" || v === "0") return false;
  return fallback;
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

/* ------------------------------ BUYER ------------------------------ */

function parseBuyerInput(raw: Partial<BuyerInput> & Record<string, unknown>): BuyerInput {
  const supplierId = str(raw.supplier_id as string | null);
  return {
    company: str(raw.company) ?? "Khách chưa đặt tên",
    contact_name: str(raw.contact_name),
    email: str(raw.email),
    cc_emails: str(raw.cc_emails),
    phone: str(raw.phone),
    country: str(raw.country),
    website: str(raw.website),
    product: str(raw.product),
    spec: str(raw.spec),
    quantity: str(raw.quantity),
    target_price: str(raw.target_price),
    incoterm: str(raw.incoterm),
    port: str(raw.port),
    expected_ship_date: str(raw.expected_ship_date),
    deal_value: num(raw.deal_value),
    supplier_id: supplierId,
    hide_buyer_from_supplier: bool(raw.hide_buyer_from_supplier, true),
    stage: isStage(raw.stage) ? raw.stage : "lead",
    owner: str(raw.owner),
    source: str(raw.source),
    priority: (["low", "normal", "high"].includes(String(raw.priority))
      ? String(raw.priority)
      : "normal") as Buyer["priority"],
    next_action: str(raw.next_action),
    next_action_date: str(raw.next_action_date),
    notes: str(raw.notes),
  };
}

export async function createBuyerAction(
  raw: Partial<BuyerInput> & Record<string, unknown>,
): Promise<ActionResult & { id?: string }> {
  const input = parseBuyerInput(raw);
  if (!input.company || input.company === "Khách chưa đặt tên") {
    return { ok: false, message: "Vui lòng nhập tên công ty / buyer." };
  }
  if (input.email && !EMAIL_RE.test(input.email)) {
    return { ok: false, message: "Email buyer không hợp lệ." };
  }
  const store = getStore();
  try {
    const created = await store.createBuyer(input);
    await store.addActivity({
      buyer_id: created.id,
      type: "created",
      from_stage: null,
      to_stage: created.stage,
      message: `Tạo khách hàng "${created.company}"`,
      created_by: created.owner,
    });
    revalidateAll();
    return {
      ok: true,
      message: `Đã thêm buyer "${created.company}" vào pipeline.`,
      id: created.id,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Lỗi không xác định" };
  }
}

export async function updateBuyerAction(
  id: string,
  raw: Partial<BuyerInput> & Record<string, unknown>,
): Promise<ActionResult> {
  const store = getStore();
  const before = await store.getBuyer(id);
  if (!before) return { ok: false, message: "Không tìm thấy khách hàng." };

  const patch = parseBuyerInput(raw);
  if (patch.email && !EMAIL_RE.test(patch.email)) {
    return { ok: false, message: "Email buyer không hợp lệ." };
  }

  try {
    const after = await store.updateBuyer(id, patch);
    if (before.supplier_id !== after.supplier_id) {
      const sup = after.supplier_id
        ? await store.getSupplier(after.supplier_id)
        : null;
      await store.addActivity({
        buyer_id: id,
        type: "supplier_change",
        message: sup
          ? `Gắn nhà cung cấp: ${sup.name}`
          : "Đã gỡ nhà cung cấp khỏi đơn",
        created_by: after.owner,
      });
    }
    revalidateAll();
    return { ok: true, message: "Đã lưu thông tin buyer." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Lỗi không xác định" };
  }
}

export async function deleteBuyerAction(id: string): Promise<ActionResult> {
  try {
    await getStore().deleteBuyer(id);
    revalidateAll();
    return { ok: true, message: "Đã xoá buyer." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Lỗi không xác định" };
  }
}

export async function addNoteAction(
  buyerId: string,
  text: string,
  author?: string | null,
): Promise<ActionResult> {
  const clean = str(text);
  if (!clean) return { ok: false, message: "Nội dung ghi chú trống." };
  try {
    await getStore().addActivity({
      buyer_id: buyerId,
      type: "note",
      message: clean,
      created_by: author ?? null,
    });
    revalidateAll();
    return { ok: true, message: "Đã thêm ghi chú." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Lỗi không xác định" };
  }
}

/* ------------------------- THAY ĐỔI TRẠNG THÁI ----------------------- */

export interface ChangeStageOptions {
  sendEmail?: boolean;
  force?: boolean;
  note?: string | null;
  messageToBuyer?: string | null;
  messageToSupplier?: string | null;
}

export async function changeStageAction(
  buyerId: string,
  stage: string,
  options: ChangeStageOptions = {},
): Promise<ActionResult> {
  if (!isStage(stage)) return { ok: false, message: "Trạng thái không hợp lệ." };

  const store = getStore();
  const buyer = await store.getBuyer(buyerId);
  if (!buyer) return { ok: false, message: "Không tìm thấy khách hàng." };

  const from = buyer.stage;
  const details: string[] = [];

  try {
    const updated = await store.updateBuyer(buyerId, { stage });
    await store.addActivity({
      buyer_id: buyerId,
      type: "stage_change",
      from_stage: from,
      to_stage: stage,
      message: `${getStage(from).label} → ${getStage(stage).label}`,
      created_by: updated.owner,
    });

    if (options.sendEmail !== false) {
      const supplier = updated.supplier_id
        ? await store.getSupplier(updated.supplier_id)
        : null;
      const result = await sendStageUpdate({
        buyer: updated,
        supplier,
        stage,
        note: options.note ?? null,
        force: options.force,
        messageToBuyer: options.messageToBuyer,
        messageToSupplier: options.messageToSupplier,
      });
      details.push(...result.messages);
      if (result.simulated && result.sent) {
        details.unshift(
          "Chưa cấu hình RESEND_API_KEY — email được tạo ở chế độ DEMO, xem nội dung ở mục Nhật ký email.",
        );
      }
      if (result.sent) {
        await store
          .addActivity({
            buyer_id: buyerId,
            type: "email",
            message: `Gửi email cập nhật "${getStage(stage).label}" → ${
              result.buyerSent && result.supplierSent
                ? "buyer + NCC"
                : result.buyerSent
                  ? "buyer"
                  : "NCC"
            }`,
            created_by: updated.owner,
          })
          .catch(() => null);
      }
    } else {
      details.push("Không gửi email (đã tắt ở hộp thoại).");
    }

    revalidateAll();
    return {
      ok: true,
      message: `Đã chuyển "${updated.company}" sang: ${getStage(stage).label}`,
      details,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Lỗi không xác định" };
  }
}

/** Gắn / gỡ nhanh NCC ngay trên danh sách */
export async function attachSupplierAction(
  buyerId: string,
  supplierId: string | null,
): Promise<ActionResult> {
  const store = getStore();
  const buyer = await store.getBuyer(buyerId);
  if (!buyer) return { ok: false, message: "Không tìm thấy khách hàng." };
  try {
    await store.updateBuyer(buyerId, { supplier_id: supplierId });
    const sup = supplierId ? await store.getSupplier(supplierId) : null;
    await store.addActivity({
      buyer_id: buyerId,
      type: "supplier_change",
      message: sup ? `Gắn nhà cung cấp: ${sup.name}` : "Đã gỡ nhà cung cấp",
      created_by: buyer.owner,
    });
    revalidateAll();
    return {
      ok: true,
      message: sup ? `Đã gắn NCC "${sup.name}".` : "Đã gỡ NCC khỏi đơn.",
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Lỗi không xác định" };
  }
}

/* ----------------------------- SUPPLIER ----------------------------- */

function parseSupplierInput(
  raw: Partial<SupplierInput> & Record<string, unknown>,
): SupplierInput {
  const rating = num(raw.rating);
  return {
    name: str(raw.name) ?? "",
    contact_name: str(raw.contact_name),
    email: str(raw.email),
    phone: str(raw.phone),
    zalo: str(raw.zalo),
    address: str(raw.address),
    province: str(raw.province),
    products: str(raw.products),
    tax_id: str(raw.tax_id),
    payment_terms: str(raw.payment_terms),
    lead_time_days: num(raw.lead_time_days),
    rating: rating === null ? null : Math.max(1, Math.min(5, Math.round(rating))),
    notes: str(raw.notes),
    status: raw.status === "paused" ? "paused" : "active",
  };
}

export async function createSupplierAction(
  raw: Partial<SupplierInput> & Record<string, unknown>,
): Promise<ActionResult & { id?: string }> {
  const input = parseSupplierInput(raw);
  if (!input.name) return { ok: false, message: "Vui lòng nhập tên nhà cung cấp." };
  if (input.email && !EMAIL_RE.test(input.email)) {
    return { ok: false, message: "Email nhà cung cấp không hợp lệ." };
  }
  try {
    const created = await getStore().createSupplier(input);
    revalidateAll();
    return {
      ok: true,
      message: `Đã thêm nhà cung cấp "${created.name}".`,
      id: created.id,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Lỗi không xác định" };
  }
}

export async function updateSupplierAction(
  id: string,
  raw: Partial<SupplierInput> & Record<string, unknown>,
): Promise<ActionResult> {
  const input = parseSupplierInput(raw);
  if (!input.name) return { ok: false, message: "Vui lòng nhập tên nhà cung cấp." };
  if (input.email && !EMAIL_RE.test(input.email)) {
    return { ok: false, message: "Email nhà cung cấp không hợp lệ." };
  }
  try {
    await getStore().updateSupplier(id, input);
    revalidateAll();
    return { ok: true, message: "Đã lưu thông tin nhà cung cấp." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Lỗi không xác định" };
  }
}

export async function deleteSupplierAction(id: string): Promise<ActionResult> {
  try {
    await getStore().deleteSupplier(id);
    revalidateAll();
    return { ok: true, message: "Đã xoá nhà cung cấp." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Lỗi không xác định" };
  }
}

/* ------------------------------ EMAIL ------------------------------- */

export async function resendLoggedEmailAction(emailId: string): Promise<ActionResult> {
  const store = getStore();
  const logs = await store.listEmails(500);
  const log = logs.find((e) => e.id === emailId);
  if (!log) return { ok: false, message: "Không tìm thấy email trong nhật ký." };
  const res = await resendLoggedEmail({
    to: log.recipients,
    subject: log.subject,
    html: log.body_html,
  });
  revalidateAll();
  return res.ok
    ? {
        ok: true,
        message:
          res.status === "simulated"
            ? "[DEMO] Email đã được tạo lại (chưa cấu hình Resend)."
            : "Đã gửi lại email thành công.",
      }
    : { ok: false, message: `Gửi lại thất bại: ${res.error}` };
}

/** Gửi lại thông báo tiến độ ở trạng thái hiện tại (không đổi trạng thái) */
export async function sendUpdateNowAction(
  buyerId: string,
  opts: {
    sendBuyer?: boolean;
    sendSupplier?: boolean;
    messageToBuyer?: string | null;
    messageToSupplier?: string | null;
  } = {},
): Promise<ActionResult> {
  const store = getStore();
  const buyer = await store.getBuyer(buyerId);
  if (!buyer) return { ok: false, message: "Không tìm thấy khách hàng." };
  const stage = buyer.stage;
  if (!isStage(stage)) return { ok: false, message: "Trạng thái không hợp lệ." };

  const supplier = buyer.supplier_id ? await store.getSupplier(buyer.supplier_id) : null;
  const details: string[] = [];

  const wantBuyer = opts.sendBuyer !== false;
  const wantSupplier = opts.sendSupplier !== false && Boolean(supplier?.email);

  if (!wantBuyer && !wantSupplier) {
    return { ok: false, message: "Không có người nhận nào được chọn." };
  }

  const result = await sendStageUpdate({
    buyer,
    supplier,
    stage,
    force: true,
    skipBuyer: !wantBuyer,
    skipSupplier: !wantSupplier,
    messageToBuyer: opts.messageToBuyer,
    messageToSupplier: opts.messageToSupplier,
  });
  details.push(...result.messages);

  if (result.sent) {
    await store
      .addActivity({
        buyer_id: buyerId,
        type: "email",
        message: `Gửi lại thông báo tiến độ "${getStage(stage).label}"`,
        created_by: buyer.owner,
      })
      .catch(() => null);
  }

  revalidateAll();
  return {
    ok: result.sent && !result.failed,
    message: result.sent ? "Đã gửi email cập nhật tiến độ." : "Không gửi được email.",
    details,
  };
}
