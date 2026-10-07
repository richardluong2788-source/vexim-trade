import { Resend } from "resend";

import { FROM_ADDRESS, resendConfigured } from "@/lib/config";
import { getStore } from "@/lib/db";
import {
  buildBuyerEmail,
  buildSupplierEmail,
  type EmailPayload,
} from "@/lib/email/templates";
import { getStage, type StageKey } from "@/lib/pipeline";
import type { Buyer, Supplier } from "@/lib/types";

interface TransportResult {
  ok: boolean;
  status: "sent" | "simulated" | "failed";
  provider: "resend" | "local";
  error: string | null;
}

async function transport(opts: {
  to: string[];
  cc?: string[];
  payload: EmailPayload;
}): Promise<TransportResult> {
  if (!resendConfigured()) {
    // Chế độ demo: không gọi API thật, chỉ ghi log để xem trước trong app
    return { ok: true, status: "simulated", provider: "local", error: null };
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: opts.to,
      cc: opts.cc?.length ? opts.cc : undefined,
      subject: opts.payload.subject,
      html: opts.payload.html,
      text: opts.payload.text,
    });
    if (error) {
      return {
        ok: false,
        status: "failed",
        provider: "resend",
        error: `${error.name}: ${error.message}`,
      };
    }
    return { ok: true, status: "sent", provider: "resend", error: null };
  } catch (err) {
    return {
      ok: false,
      status: "failed",
      provider: "resend",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface StageUpdateResult {
  sent: boolean;
  buyerSent: boolean;
  supplierSent: boolean;
  simulated: boolean;
  failed: boolean;
  messages: string[];
}

export interface SendStageUpdateParams {
  buyer: Buyer;
  supplier: Supplier | null;
  stage: StageKey;
  note?: string | null;
  /** Bắt buộc gửi kể cả với trạng thái "Mất đơn / Hoãn" */
  force?: boolean;
  /** Ghi chú thêm vào email buyer */
  messageToBuyer?: string | null;
  /** Ghi chú thêm vào email supplier */
  messageToSupplier?: string | null;
  /** Bỏ qua email buyer (dùng khi gửi lại thủ công cho riêng NCC) */
  skipBuyer?: boolean;
  /** Bỏ qua email supplier (dùng khi gửi lại thủ công cho riêng buyer) */
  skipSupplier?: boolean;
}

/**
 * Gửi email cập nhật tiến độ cho buyer và (nếu đã chọn) supplier.
 * Quy tắc nghiệp vụ:
 *   - Buyer: luôn gửi nếu có email.
 *   - Supplier: CHỈ gửi khi buyer đã được gắn NCC và NCC có email.
 *     (Giai đoạn đầu thường chưa có NCC -> chỉ gửi buyer.)
 *   - Trạng thái "Mất đơn / Hoãn": mặc định KHÔNG gửi.
 */
export async function sendStageUpdate(
  params: SendStageUpdateParams,
): Promise<StageUpdateResult> {
  const { buyer, supplier, stage, force = false } = params;
  const store = getStore();
  const stageDef = getStage(stage);
  const messages: string[] = [];
  let buyerSent = false;
  let supplierSent = false;
  let simulated = false;
  let failed = false;

  if (stageDef.silent && !force) {
    messages.push(
      `Trạng thái "${stageDef.label}" không gửi email tự động — chỉ ghi nhận nội bộ.`,
    );
    return {
      sent: false,
      buyerSent,
      supplierSent,
      simulated,
      failed,
      messages,
    };
  }

  // ---------- 1. Email cho buyer ----------
  if (params.skipBuyer) {
    messages.push("Bỏ qua email buyer theo lựa chọn của người gửi.");
  } else if (buyer.email && buyer.email.trim()) {
    const payload = buildBuyerEmail({
      buyer,
      stage,
      note: params.messageToBuyer ?? params.note ?? null,
    });
    const cc = (buyer.cc_emails ?? "")
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await transport({ to: [buyer.email.trim()], cc, payload });
    buyerSent = res.ok;
    simulated = simulated || res.status === "simulated";
    failed = failed || !res.ok;
    messages.push(
      res.ok
        ? `${res.status === "simulated" ? "[DEMO] Đã tạo" : "Đã gửi"} email buyer → ${buyer.email}${cc.length ? ` (cc: ${cc.join(", ")})` : ""}`
        : `Gửi email buyer thất bại: ${res.error}`,
    );
    await store
      .addEmail({
        buyer_id: buyer.id,
        supplier_id: null,
        stage,
        direction: "buyer",
        subject: payload.subject,
        recipients: [buyer.email.trim(), ...cc],
        body_html: payload.html,
        status: res.status,
        provider: res.provider,
        error: res.error,
      })
      .catch(() => null);
  } else {
    messages.push("Buyer chưa có email — bỏ qua email buyer.");
  }

  // ---------- 2. Email cho supplier (chỉ khi đã gắn NCC) ----------
  if (params.skipSupplier) {
    messages.push("Bỏ qua email nhà cung cấp theo lựa chọn của người gửi.");
  } else if (!supplier) {
    messages.push(
      "Chưa gắn nhà cung cấp cho khách này — email chỉ gửi tới buyer.",
    );
  } else if (!supplier.email || !supplier.email.trim()) {
    messages.push(`NCC "${supplier.name}" chưa có email — bỏ qua email NCC.`);
  } else {
    const payload = buildSupplierEmail({
      buyer,
      supplier,
      stage,
      note: params.messageToSupplier ?? params.note ?? null,
    });
    const res = await transport({ to: [supplier.email.trim()], payload });
    supplierSent = res.ok;
    simulated = simulated || res.status === "simulated";
    failed = failed || !res.ok;
    messages.push(
      res.ok
        ? `${res.status === "simulated" ? "[DEMO] Đã tạo" : "Đã gửi"} email NCC → ${supplier.email}`
        : `Gửi email NCC thất bại: ${res.error}`,
    );
    await store
      .addEmail({
        buyer_id: buyer.id,
        supplier_id: supplier.id,
        stage,
        direction: "supplier",
        subject: payload.subject,
        recipients: [supplier.email.trim()],
        body_html: payload.html,
        status: res.status,
        provider: res.provider,
        error: res.error,
      })
      .catch(() => null);
  }

  return {
    sent: buyerSent || supplierSent,
    buyerSent,
    supplierSent,
    simulated,
    failed,
    messages,
  };
}

/** Gửi lại đúng một email đã log (dùng ở trang Nhật ký email) */
export async function resendLoggedEmail(opts: {
  to: string[];
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error: string | null; status: "sent" | "simulated" | "failed" }> {
  const res = await transport({
    to: opts.to,
    payload: { subject: opts.subject, html: opts.html, text: "" },
  });
  return { ok: res.ok, error: res.error, status: res.status };
}
