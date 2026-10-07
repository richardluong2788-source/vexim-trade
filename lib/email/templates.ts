import { COMPANY } from "@/lib/config";
import {
  FUNNEL_STAGES,
  STAGE_EMAIL_COPY,
  getStage,
  stageIndex,
  type StageKey,
} from "@/lib/pipeline";
import type { Buyer, Supplier } from "@/lib/types";

export interface EmailPayload {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(input: string | null | undefined): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Mã đơn nội bộ ổn định, dùng trong tiêu đề email thay cho UUID */
export function shortCode(id: string): string {
  const clean = id.replace(/-/g, "");
  let h = 0;
  for (let i = 0; i < clean.length; i++) {
    h = (h * 31 + clean.charCodeAt(i)) >>> 0;
  }
  return `VXT-${h.toString(36).toUpperCase().padStart(6, "0").slice(-6)}`;
}

export function money(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `USD ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

const BRAND = "#0f766e";
const INK = "#0f172a";
const MUTED = "#64748b";
const LINE = "#e2e8f0";
const SOFT = "#f8fafc";

function shell(opts: { title: string; body: string; footer: string }): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(opts.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#eef2f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.title)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${LINE};">
            <tr>
              <td style="background:${BRAND};padding:20px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:.4px;">
                      ${escapeHtml(COMPANY.name.toUpperCase())}
                    </td>
                    <td align="right" style="color:#a7f3d0;font-size:12px;">${escapeHtml(COMPANY.tagline)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr><td style="padding:28px;">${opts.body}</td></tr>
            <tr>
              <td style="background:${SOFT};padding:20px 28px;border-top:1px solid ${LINE};font-size:12px;color:${MUTED};line-height:18px;">
                ${opts.footer}
              </td>
            </tr>
          </table>
          <p style="color:#94a3b8;font-size:11px;margin:14px 0 0;">
            Đây là email tự động từ hệ thống quản lý đơn hàng của ${escapeHtml(COMPANY.name)}.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function progressBar(stageKey: string, lang: "en" | "vi"): string {
  const current = stageIndex(stageKey);
  const isLost = stageKey === "lost";
  const cells = FUNNEL_STAGES.map((s, i) => {
    const done = i < current && !isLost;
    const active = i === current && !isLost;
    const bg = active ? BRAND : done ? "#99f6e4" : "#e2e8f0";
    const fg = active ? "#ffffff" : done ? "#0f766e" : "#94a3b8";
    const label = lang === "vi" ? s.label : s.labelEn;
    return `<td align="center" style="width:${Math.floor(100 / FUNNEL_STAGES.length)}%;padding:0 2px;vertical-align:top;">
      <div style="background:${bg};color:${fg};border-radius:999px;font-size:11px;font-weight:700;padding:5px 2px;white-space:nowrap;overflow:hidden;">
        ${done ? "&#10003;" : i + 1}
      </div>
      <div style="font-size:9px;color:${active ? INK : "#94a3b8"};margin-top:5px;line-height:12px;font-weight:${active ? 700 : 400};">${escapeHtml(label)}</div>
    </td>`;
  }).join("");

  if (isLost) {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;">
      <tr><td style="padding:12px 16px;color:#b91c1c;font-size:13px;font-weight:600;">
        ${lang === "vi" ? "Đơn hàng đang tạm hoãn." : "This order is currently on hold."}
      </td></tr>
    </table>`;
  }

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 22px;">
    <tr>${cells}</tr>
  </table>`;
}

function statusPill(stageKey: string, lang: "en" | "vi"): string {
  const stage = getStage(stageKey);
  const label = lang === "vi" ? stage.label : stage.labelEn;
  return `<div style="display:inline-block;background:${stage.color};color:#ffffff;font-size:12px;font-weight:700;padding:6px 14px;border-radius:999px;letter-spacing:.3px;">
    ${escapeHtml(label.toUpperCase())}
  </div>`;
}

function summaryTable(
  rows: { label: string; value: string }[],
  labelWidth = "42%",
): string {
  const body = rows
    .filter((r) => r.value && r.value !== "—")
    .map(
      (r) => `<tr>
        <td style="padding:9px 12px;border-bottom:1px solid ${LINE};color:${MUTED};font-size:13px;width:${labelWidth};">${escapeHtml(r.label)}</td>
        <td style="padding:9px 12px;border-bottom:1px solid ${LINE};color:${INK};font-size:13px;font-weight:600;">${escapeHtml(r.value)}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:10px;overflow:hidden;">
    <tr><td style="background:${SOFT};padding:10px 12px;font-size:12px;font-weight:700;color:${INK};letter-spacing:.4px;">ORDER DETAILS / THÔNG TIN ĐƠN HÀNG</td></tr>
    <tr><td style="padding:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table></td></tr>
  </table>`;
}

function nextStepBox(text: string, title: string): string {
  if (!text) return "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ecfeff;border-left:4px solid ${BRAND};border-radius:8px;margin-top:18px;">
    <tr><td style="padding:14px 16px;">
      <div style="font-size:11px;font-weight:800;color:${BRAND};letter-spacing:.6px;margin-bottom:6px;">${escapeHtml(title)}</div>
      <div style="font-size:13px;line-height:20px;color:#134e4a;">${escapeHtml(text)}</div>
    </td></tr>
  </table>`;
}

/* ------------------------------------------------------------------ */
/* EMAIL GỬI BUYER (tiếng Anh)                                        */
/* LƯU Ý NGHIỆP VỤ: không bao giờ đưa tên/giá nhà cung cấp vào email  */
/* ------------------------------------------------------------------ */

export function buildBuyerEmail(opts: {
  buyer: Buyer;
  stage: StageKey;
  note?: string | null;
}): EmailPayload {
  const { buyer, stage } = opts;
  const copy = STAGE_EMAIL_COPY[stage];
  const name = buyer.contact_name?.trim() || buyer.company;

  const summary = summaryTable([
    { label: "Product", value: buyer.product ?? "—" },
    { label: "Specification", value: buyer.spec ?? "—" },
    { label: "Quantity", value: buyer.quantity ?? "—" },
    { label: "Price term", value: buyer.incoterm ?? "—" },
    { label: "Destination port", value: buyer.port ?? "—" },
    {
      label: "Expected shipment",
      value: buyer.expected_ship_date
        ? new Date(buyer.expected_ship_date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "To be confirmed",
    },
    { label: "Our reference", value: shortCode(buyer.id) },
  ]);

  const body = `
    ${statusPill(stage, "en")}
    <p style="font-size:15px;line-height:24px;margin:18px 0 0;">Dear ${escapeHtml(name)},</p>
    <p style="font-size:15px;line-height:24px;margin:12px 0 0;">${escapeHtml(copy.buyerBody)}</p>
    ${progressBar(stage, "en")}
    ${summary}
    ${nextStepBox(copy.nextStep, "WHAT HAPPENS NEXT")}
    ${
      opts.note
        ? `<p style="font-size:14px;line-height:22px;margin:18px 0 0;padding:12px 14px;background:${SOFT};border-radius:8px;color:#334155;"><strong>Message from our team:</strong><br/>${escapeHtml(opts.note)}</p>`
        : ""
    }
    <p style="font-size:14px;line-height:22px;margin:22px 0 0;">
      Please feel free to reply to this email if you need any clarification.<br/>
      Best regards,
    </p>
    <p style="font-size:14px;line-height:20px;margin:14px 0 0;">
      <strong>${escapeHtml(buyer.owner || COMPANY.name)}</strong><br/>
      <span style="color:${MUTED};">Export Department &middot; ${escapeHtml(COMPANY.name)}</span><br/>
      <span style="color:${MUTED};">${escapeHtml(COMPANY.phone)} &middot; ${escapeHtml(COMPANY.email)}</span>
    </p>`;

  const subject = `[${shortCode(buyer.id)}] ${copy.buyerSubject}`;

  return {
    subject,
    html: shell({
      title: subject,
      body,
      footer: `${escapeHtml(COMPANY.name)} &middot; ${escapeHtml(COMPANY.address)}<br/>
        ${escapeHtml(COMPANY.phone)} &middot; <a href="${escapeHtml(COMPANY.website)}" style="color:${BRAND};text-decoration:none;">${escapeHtml(COMPANY.website)}</a>`,
    }),
    text: [
      subject,
      "",
      `Dear ${name},`,
      copy.buyerBody,
      "",
      `Status: ${getStage(stage).labelEn}`,
      "",
      `Product: ${buyer.product ?? "-"}`,
      `Specification: ${buyer.spec ?? "-"}`,
      `Quantity: ${buyer.quantity ?? "-"}`,
      `Price term: ${buyer.incoterm ?? "-"}`,
      `Port: ${buyer.port ?? "-"}`,
      "",
      copy.nextStep,
      "",
      opts.note ? `Message from our team: ${opts.note}` : "",
      "",
      `Best regards,`,
      `${buyer.owner || COMPANY.name} - Export Department, ${COMPANY.name}`,
      `${COMPANY.phone} | ${COMPANY.email}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

/* ------------------------------------------------------------------ */
/* EMAIL GỬI SUPPLIER (tiếng Việt)                                    */
/* Mặc định ẨN DANH buyer – chỉ nêu thị trường + sản lượng            */
/* ------------------------------------------------------------------ */

export function buildSupplierEmail(opts: {
  buyer: Buyer;
  supplier: Supplier;
  stage: StageKey;
  note?: string | null;
}): EmailPayload {
  const { buyer, supplier, stage } = opts;
  const copy = STAGE_EMAIL_COPY[stage];
  const stageDef = getStage(stage);
  const hidden = buyer.hide_buyer_from_supplier !== false;
  const buyerLabel = hidden
    ? `Khách hàng thị trường ${buyer.country || "nước ngoài"} (ẩn danh)`
    : `${buyer.company}${buyer.country ? ` – ${buyer.country}` : ""}`;

  const summary = summaryTable(
    [
      { label: "Buyer", value: buyerLabel },
      { label: "Mặt hàng", value: buyer.product ?? "—" },
      { label: "Quy cách", value: buyer.spec ?? "—" },
      { label: "Số lượng", value: buyer.quantity ?? "—" },
      { label: "Điều kiện giao", value: buyer.incoterm ?? "—" },
      {
        label: "Ngày giao dự kiến",
        value: buyer.expected_ship_date
          ? new Date(buyer.expected_ship_date).toLocaleDateString("vi-VN")
          : "Chờ xác nhận",
      },
      { label: "Mã đơn nội bộ", value: shortCode(buyer.id) },
    ],
    "38%",
  );

  const body = `
    ${statusPill(stage, "vi")}
    <p style="font-size:15px;line-height:24px;margin:18px 0 0;">
      Kính gửi Anh/Chị ${escapeHtml(supplier.contact_name || supplier.name)},
    </p>
    <p style="font-size:15px;line-height:24px;margin:12px 0 0;">
      Đơn hàng <strong>${escapeHtml(shortCode(buyer.id))}</strong> do ${escapeHtml(COMPANY.name)} thực hiện
      vừa chuyển sang trạng thái <strong>${escapeHtml(stageDef.label)}</strong>.
    </p>
    ${progressBar(stage, "vi")}
    ${summary}
    ${nextStepBox(copy.supplierBody, "VIỆC CẦN PHỐI HỢP")}
    ${
      opts.note
        ? `<p style="font-size:14px;line-height:22px;margin:18px 0 0;padding:12px 14px;background:${SOFT};border-radius:8px;color:#334155;"><strong>Ghi chú từ phòng sale:</strong><br/>${escapeHtml(opts.note)}</p>`
        : ""
    }
    ${
      hidden
        ? `<p style="font-size:12px;line-height:18px;color:${MUTED};margin:16px 0 0;">
            Thông tin buyer được giữ kín theo chính sách bảo mật của ${escapeHtml(COMPANY.name)}.
            Mọi trao đổi về giá và hợp đồng vui lòng làm việc trực tiếp với phòng sale.
          </p>`
        : ""
    }
    <p style="font-size:14px;line-height:22px;margin:20px 0 0;">
      Trân trọng,<br/>
      <strong>${escapeHtml(buyer.owner || "Phòng Xuất khẩu")}</strong><br/>
      <span style="color:${MUTED};">${escapeHtml(COMPANY.name)} &middot; ${escapeHtml(COMPANY.phone)}</span>
    </p>`;

  const subject = `[${shortCode(buyer.id)}] Cập nhật đơn hàng – ${stageDef.label}`;

  return {
    subject,
    html: shell({
      title: subject,
      body,
      footer: `${escapeHtml(COMPANY.name)} &middot; ${escapeHtml(COMPANY.address)}<br/>
        ${escapeHtml(COMPANY.phone)} &middot; <a href="${escapeHtml(COMPANY.website)}" style="color:${BRAND};text-decoration:none;">${escapeHtml(COMPANY.website)}</a>`,
    }),
    text: [
      subject,
      "",
      `Kính gửi Anh/Chị ${supplier.contact_name || supplier.name},`,
      `Đơn hàng ${shortCode(buyer.id)} vừa chuyển sang trạng thái: ${stageDef.label}.`,
      "",
      `Buyer: ${buyerLabel}`,
      `Mặt hàng: ${buyer.product ?? "-"}`,
      `Quy cách: ${buyer.spec ?? "-"}`,
      `Số lượng: ${buyer.quantity ?? "-"}`,
      "",
      copy.supplierBody,
      "",
      opts.note ? `Ghi chú từ phòng sale: ${opts.note}` : "",
      "",
      "Trân trọng,",
      `${buyer.owner || "Phòng Xuất khẩu"} - ${COMPANY.name}`,
      `${COMPANY.phone} | ${COMPANY.email}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
