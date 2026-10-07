/**
 * Định nghĩa pipeline (trạng thái của buyer).
 * Đây là nơi duy nhất cần sửa nếu Vexim muốn đổi/ thêm/ bớt giai đoạn.
 */

export type StageKey =
  | "lead"
  | "contacted"
  | "quoted"
  | "negotiation"
  | "confirmed"
  | "production"
  | "shipping"
  | "completed"
  | "lost";

export interface StageDef {
  key: StageKey;
  /** Nhãn tiếng Việt hiển thị trong giao diện */
  label: string;
  /** Nhãn tiếng Anh dùng trong email gửi buyer */
  labelEn: string;
  /** Mô tả ngắn hiện ra trong dropdown */
  hint: string;
  /** Màu chủ đạo (hex) – dùng cho dot, badge, cột kanban */
  color: string;
  /** Có phải là trạng thái kết thúc funnel không */
  terminal?: boolean;
  /** Mặc định KHÔNG gửi email khi chuyển sang trạng thái này */
  silent?: boolean;
  /** Từ trạng thái này trở đi hệ thống sẽ nhắc gắn NCC */
  wantsSupplier?: boolean;
}

export const STAGES: StageDef[] = [
  {
    key: "lead",
    label: "Khách mới",
    labelEn: "New enquiry",
    hint: "Vừa nhận được yêu cầu, chưa trao đổi",
    color: "#64748b",
  },
  {
    key: "contacted",
    label: "Đã liên hệ",
    labelEn: "In contact",
    hint: "Đã phản hồi buyer, đang tìm hiểu nhu cầu",
    color: "#0ea5e9",
  },
  {
    key: "quoted",
    label: "Báo giá & gửi mẫu",
    labelEn: "Quotation & sample",
    hint: "Đã gửi báo giá / mẫu cho buyer",
    color: "#8b5cf6",
    wantsSupplier: true,
  },
  {
    key: "negotiation",
    label: "Đàm phán",
    labelEn: "Negotiating",
    hint: "Đang thương lượng giá, quy cách, điều khoản",
    color: "#f59e0b",
    wantsSupplier: true,
  },
  {
    key: "confirmed",
    label: "Chốt PI & cọc",
    labelEn: "PI confirmed & deposit received",
    hint: "Đã ký PI, nhận tiền cọc – chuẩn bị sản xuất",
    color: "#10b981",
    wantsSupplier: true,
  },
  {
    key: "production",
    label: "Đang sản xuất",
    labelEn: "In production",
    hint: "NCC đang sản xuất / gom hàng",
    color: "#0d9488",
    wantsSupplier: true,
  },
  {
    key: "shipping",
    label: "Đang giao hàng",
    labelEn: "Shipped",
    hint: "Đã xuất hàng, đang làm chứng từ",
    color: "#2563eb",
    wantsSupplier: true,
  },
  {
    key: "completed",
    label: "Hoàn tất",
    labelEn: "Completed",
    hint: "Buyer đã nhận hàng & thanh toán đủ",
    color: "#16a34a",
    terminal: true,
  },
  {
    key: "lost",
    label: "Mất đơn / Hoãn",
    labelEn: "On hold / lost",
    hint: "Buyer dừng – chỉ ghi nhận nội bộ, không gửi email",
    color: "#dc2626",
    terminal: true,
    silent: true,
  },
];

/** Thứ tự funnel (không gồm "lost") – dùng cho thanh tiến độ trong email */
export const FUNNEL_STAGES = STAGES.filter((s) => s.key !== "lost");

const MAP = new Map(STAGES.map((s) => [s.key, s]));

export function getStage(key: string | null | undefined): StageDef {
  return MAP.get((key ?? "lead") as StageKey) ?? STAGES[0];
}

export function stageIndex(key: string | null | undefined): number {
  const i = FUNNEL_STAGES.findIndex((s) => s.key === key);
  return i === -1 ? 0 : i;
}

export function isStage(key: unknown): key is StageKey {
  return typeof key === "string" && MAP.has(key as StageKey);
}

/** Nội dung email mặc định theo từng trạng thái */
export const STAGE_EMAIL_COPY: Record<
  StageKey,
  { buyerSubject: string; buyerBody: string; nextStep: string; supplierBody: string }
> = {
  lead: {
    buyerSubject: "Thank you for your enquiry – Vexim Trade",
    buyerBody:
      "Thank you for reaching out to Vexim Trade. We have received your enquiry and our export team is now reviewing your requirements.",
    nextStep: "We will come back to you with clarifying questions within one working day.",
    supplierBody:
      "Phòng sale vừa ghi nhận một yêu cầu mới từ thị trường xuất khẩu. Chưa cần chuẩn bị gì ở bước này – chúng tôi sẽ liên hệ khi cần báo giá.",
  },
  contacted: {
    buyerSubject: "Following up on your enquiry – Vexim Trade",
    buyerBody:
      "Our export team is currently working on your request. To prepare an accurate offer we would like to confirm a few details with you.",
    nextStep:
      "Please confirm the specification, quantity and destination port so we can finalise the quotation.",
    supplierBody:
      "Đơn hàng đang trong giai đoạn trao đổi với buyer. Vui lòng chuẩn bị sẵn thông số sản phẩm và giá tham khảo để chúng tôi gửi yêu cầu báo giá.",
  },
  quoted: {
    buyerSubject: "Quotation for your order – Vexim Trade",
    buyerBody:
      "We are pleased to submit our offer for your order. The quotation covers product specification, packaging, delivery terms and validity as agreed.",
    nextStep:
      "Kindly review the quotation and let us know your comments. Samples can be arranged upon your confirmation.",
    supplierBody:
      "Chúng tôi đã gửi báo giá cho buyer. Vui lòng giữ giá và lịch giao hàng như đã thống nhất trong thời hạn báo giá.",
  },
  negotiation: {
    buyerSubject: "Update on your order – Vexim Trade",
    buyerBody:
      "Thank you for your feedback. We are working with our production network to improve the commercial terms and meet your target.",
    nextStep:
      "We will revert with a revised offer shortly. Please let us know if there is any change in your schedule.",
    supplierBody:
      "Buyer đang đàm phán giá. Vui lòng xác nhận lại giá tốt nhất có thể và số lượng tối thiểu, chúng tôi cần phản hồi trong hôm nay.",
  },
  confirmed: {
    buyerSubject: "Order confirmed – Proforma Invoice & deposit received",
    buyerBody:
      "We are delighted to confirm that your order has been placed and the deposit has been received. Production scheduling starts now.",
    nextStep:
      "We will send you the production plan and keep you updated at every milestone until shipment.",
    supplierBody:
      "ĐƠN ĐÃ CHỐT. Buyer đã ký PI và chúng tôi đã nhận cọc. Vui lòng xác nhận lịch sản xuất và ngày hoàn thành dự kiến.",
  },
  production: {
    buyerSubject: "Production update – your order is in progress",
    buyerBody:
      "Your order is now in production. Our QC team follows the process on site to make sure everything matches the approved sample.",
    nextStep:
      "We will send you photos at each stage and arrange the pre-shipment inspection before packing.",
    supplierBody:
      "Đơn đang sản xuất. Vui lòng cập nhật tiến độ hằng tuần và báo ngay nếu có rủi ro trễ lịch.",
  },
  shipping: {
    buyerSubject: "Your shipment has departed – documents to follow",
    buyerBody:
      "We are pleased to inform you that your goods have been shipped. The full set of shipping documents is being prepared.",
    nextStep:
      "We will send the Bill of Lading, Invoice, Packing List and Certificate of Origin as soon as they are issued.",
    supplierBody:
      "Hàng đã xuất. Vui lòng hoàn tất chứng từ gốc và gửi về văn phòng để chúng tôi gửi bộ chứng từ cho buyer.",
  },
  completed: {
    buyerSubject: "Order completed – thank you for your business",
    buyerBody:
      "Your order has been completed and payment settled. Thank you for trusting Vexim Trade as your sourcing partner.",
    nextStep:
      "We would love to support your next order – our team will stay in touch with new offers from this crop season.",
    supplierBody:
      "Đơn đã hoàn tất và thanh toán xong. Cảm ơn sự hợp tác – chúng tôi sẽ ưu tiên đơn tiếp theo cho xưởng.",
  },
  lost: {
    buyerSubject: "",
    buyerBody: "",
    nextStep: "",
    supplierBody: "",
  },
};
