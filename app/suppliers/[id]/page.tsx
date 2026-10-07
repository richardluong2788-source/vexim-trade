import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Banknote,
  Clock,
  FileText,
  MapPin,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  ShieldCheck,
  Star,
} from "lucide-react";

import { listBuyersWithSupplier } from "@/lib/queries";
import { getStore } from "@/lib/db";
import { Breadcrumbs, Badge, Card, EmptyState, cx, formatMoney } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { StageBadge } from "@/components/stage-select";
import { DeleteSupplierButton } from "@/components/supplier-actions";

export const dynamic = "force-dynamic";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplier = await getStore().getSupplier(id);
  if (!supplier) notFound();

  const buyers = (await listBuyersWithSupplier()).filter((b) => b.supplier_id === id);
  const active = buyers.filter((b) => !["completed", "lost"].includes(b.stage));

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[{ label: "Nhà cung cấp", href: "/suppliers" }, { label: supplier.name }]}
          />
        }
        title={supplier.name}
        sub={[supplier.province, supplier.products].filter(Boolean).join(" · ")}
        actions={
          <>
            <Link href={`/suppliers/${id}/edit`} className="btn btn-ghost">
              <Pencil className="h-4 w-4" />
              Sửa
            </Link>
            <DeleteSupplierButton supplierId={id} name={supplier.name} linked={buyers.length} />
          </>
        }
      />

      <Card className="mb-5 grid grid-cols-2 divide-ink-200 sm:grid-cols-4 sm:divide-x">
        <Cell label="Trạng thái">
          <Badge
            className={
              supplier.status === "active"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-ink-100 text-ink-500"
            }
          >
            {supplier.status === "active" ? "Đang hợp tác" : "Tạm ngưng"}
          </Badge>
        </Cell>
        <Cell label="Đánh giá">
          <span className="inline-flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={cx(
                  "h-4 w-4",
                  n <= (supplier.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-ink-200",
                )}
              />
            ))}
          </span>
        </Cell>
        <Cell label="Lead time">
          <span className="font-black">{supplier.lead_time_days ? `${supplier.lead_time_days} ngày` : "—"}</span>
        </Cell>
        <Cell label="Đơn đang chạy">
          <span className="font-black">{active.length}</span>
          <span className="text-[11.5px] text-ink-400"> / {buyers.length} tổng</span>
        </Cell>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="border-b border-ink-200 px-4 py-3">
            <h2 className="text-[15px] font-bold text-ink-900">Thông tin liên hệ</h2>
          </div>
          <ul className="divide-y divide-ink-100">
            <Row icon={<MessageCircle className="h-3.5 w-3.5" />} label="Người liên hệ" value={supplier.contact_name} />
            <Row icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={supplier.email} />
            <Row icon={<Phone className="h-3.5 w-3.5" />} label="Điện thoại" value={supplier.phone} />
            <Row icon={<MessageCircle className="h-3.5 w-3.5" />} label="Zalo" value={supplier.zalo} />
            <Row icon={<MapPin className="h-3.5 w-3.5" />} label="Địa chỉ" value={[supplier.address, supplier.province].filter(Boolean).join(", ")} />
            <Row icon={<FileText className="h-3.5 w-3.5" />} label="Mã số thuế" value={supplier.tax_id} />
            <Row icon={<Banknote className="h-3.5 w-3.5" />} label="Thanh toán" value={supplier.payment_terms} />
            <Row icon={<Clock className="h-3.5 w-3.5" />} label="Mặt hàng" value={supplier.products} />
          </ul>
          {supplier.notes && (
            <div className="border-t border-ink-200 bg-amber-50/50 px-4 py-3">
              <p className="mb-1 text-[11px] font-bold tracking-wide text-amber-700 uppercase">Ghi chú</p>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-ink-700">{supplier.notes}</p>
            </div>
          )}
          {!supplier.email && (
            <div className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-900">
              NCC chưa có email nên <strong>không nhận được</strong> thông báo tiến độ tự động. Hãy bổ
              sung email ở nút “Sửa”.
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
            <div>
              <h2 className="text-[15px] font-bold text-ink-900">Đơn hàng đang giao cho NCC này</h2>
              <p className="mt-0.5 text-xs text-ink-500">
                Tổng giá trị {formatMoney(buyers.reduce((s, b) => s + (b.deal_value ?? 0), 0))}
              </p>
            </div>
          </div>
          {buyers.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Chưa có đơn nào gắn NCC này"
              sub="Vào trang buyer hoặc pipeline, chọn NCC ở cột “Nhà cung cấp” để gắn."
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {buyers.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/buyers/${b.id}`}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-brand-50/40"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink-900">
                        {b.hide_buyer_from_supplier ? (
                          <>
                            Khách thị trường {b.country || "nước ngoài"}{" "}
                            <span className="font-normal text-ink-400">(ẩn danh)</span>
                          </>
                        ) : (
                          b.company
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-ink-500">
                        {b.product || "—"} · {b.quantity || "—"}
                      </span>
                    </span>
                    <span className="text-[13px] font-bold text-ink-800">
                      {formatMoney(b.deal_value)}
                    </span>
                    <StageBadge stage={b.stage} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t border-ink-200 bg-ink-50 px-4 py-2.5 text-[11.5px] text-ink-500">
            <ShieldCheck className="mr-1 inline h-3 w-3" />
            Đơn đánh dấu “ẩn danh” sẽ không tiết lộ tên buyer trong email gửi NCC.
          </p>
        </Card>
      </div>
    </>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[11px] font-bold tracking-wide text-ink-500 uppercase">{label}</p>
      <div className="mt-1 text-[13.5px] text-ink-900">{children}</div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <li className="flex items-start gap-2.5 px-4 py-2.5">
      <span className="mt-0.5 shrink-0 text-ink-400">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold tracking-wide text-ink-500 uppercase">
          {label}
        </span>
        <span className="block text-[13px] break-words text-ink-800">
          {value || <span className="text-ink-300">—</span>}
        </span>
      </span>
    </li>
  );
}
