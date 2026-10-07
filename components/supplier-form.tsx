"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";

import { createSupplierAction, updateSupplierAction } from "@/app/actions";
import type { Supplier } from "@/lib/types";
import { Button, Field } from "@/components/ui";
import { useToast } from "@/components/toast";

type FormState = Record<string, string | number>;

function init(s?: Supplier | null): FormState {
  return {
    name: s?.name ?? "",
    contact_name: s?.contact_name ?? "",
    email: s?.email ?? "",
    phone: s?.phone ?? "",
    zalo: s?.zalo ?? "",
    address: s?.address ?? "",
    province: s?.province ?? "",
    products: s?.products ?? "",
    tax_id: s?.tax_id ?? "",
    payment_terms: s?.payment_terms ?? "",
    lead_time_days: s?.lead_time_days ?? "",
    rating: s?.rating ?? 4,
    notes: s?.notes ?? "",
    status: s?.status ?? "active",
  };
}

export function SupplierForm({ supplier }: { supplier?: Supplier | null }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(() => init(supplier));
  const [busy, setBusy] = useState(false);

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));
  const v = (k: string) => String(form[k] ?? "");
  const dirty = supplier ? JSON.stringify(init(supplier)) !== JSON.stringify(form) : false;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!v("name").trim()) {
      toast.push({ kind: "error", title: "Chưa nhập tên nhà cung cấp." });
      return;
    }
    setBusy(true);
    const payload = { ...form, lead_time_days: v("lead_time_days") ? Number(v("lead_time_days")) : null };
    try {
      const res = supplier
        ? await updateSupplierAction(supplier.id, payload)
        : await createSupplierAction(payload);
      toast.push({ kind: res.ok ? "success" : "error", title: res.message });
      if (res.ok) {
        if (supplier) router.refresh();
        else if (res.id) router.push(`/suppliers/${res.id}`);
      }
    } catch (err) {
      toast.push({ kind: "error", title: "Lỗi khi lưu", lines: [err instanceof Error ? err.message : String(err)] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="card p-5">
        <h2 className="mb-4 text-sm font-bold text-ink-900">Thông tin liên hệ</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Tên nhà cung cấp / xưởng" required className="sm:col-span-2">
            <input
              className="input"
              value={v("name")}
              onChange={(e) => set("name", e.target.value)}
              placeholder="VD: CTCP Nông sản Mekong Delta"
              autoFocus
            />
          </Field>
          <Field label="Người liên hệ">
            <input
              className="input"
              value={v("contact_name")}
              onChange={(e) => set("contact_name", e.target.value)}
              placeholder="VD: Trần Văn Hùng"
            />
          </Field>
          <Field label="Email" hint="Email nhận thông báo đơn hàng (tiếng Việt)">
            <input
              type="email"
              className="input"
              value={v("email")}
              onChange={(e) => set("email", e.target.value)}
              placeholder="sales@xuong.vn"
            />
          </Field>
          <Field label="Điện thoại">
            <input
              className="input"
              value={v("phone")}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+84 9xx xxx xxx"
            />
          </Field>
          <Field label="Zalo">
            <input
              className="input"
              value={v("zalo")}
              onChange={(e) => set("zalo", e.target.value)}
              placeholder="09xxxxxxxx"
            />
          </Field>
          <Field label="Địa chỉ">
            <input
              className="input"
              value={v("address")}
              onChange={(e) => set("address", e.target.value)}
              placeholder="KCN / xã / huyện"
            />
          </Field>
          <Field label="Tỉnh / Thành">
            <input
              className="input"
              value={v("province")}
              onChange={(e) => set("province", e.target.value)}
              placeholder="VD: Cần Thơ"
            />
          </Field>
          <Field label="Mã số thuế">
            <input
              className="input"
              value={v("tax_id")}
              onChange={(e) => set("tax_id", e.target.value)}
              placeholder="1800123456"
            />
          </Field>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-bold text-ink-900">Năng lực &amp; điều kiện</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Mặt hàng cung cấp" className="sm:col-span-2 lg:col-span-3">
            <input
              className="input"
              value={v("products")}
              onChange={(e) => set("products", e.target.value)}
              placeholder="VD: Gạo 5% tấm, gạo Jasmine, gạo ST25"
            />
          </Field>
          <Field label="Điều khoản thanh toán">
            <input
              className="input"
              value={v("payment_terms")}
              onChange={(e) => set("payment_terms", e.target.value)}
              placeholder="30% cọc, 70% trước khi giao"
            />
          </Field>
          <Field label="Thời gian giao (ngày)">
            <input
              type="number"
              min={0}
              className="input"
              value={v("lead_time_days")}
              onChange={(e) => set("lead_time_days", e.target.value)}
              placeholder="21"
            />
          </Field>
          <Field label="Đánh giá (1–5 sao)">
            <div className="flex gap-1 pt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set("rating", n)}
                  className="text-2xl leading-none transition hover:scale-110"
                  aria-label={`${n} sao`}
                  style={{ color: n <= Number(form.rating || 0) ? "#f59e0b" : "#cbd5e1" }}
                >
                  ★
                </button>
              ))}
            </div>
          </Field>
          <Field label="Trạng thái">
            <select className="input" value={v("status")} onChange={(e) => set("status", e.target.value)}>
              <option value="active">Đang hợp tác</option>
              <option value="paused">Tạm ngưng</option>
            </select>
          </Field>
          <Field label="Ghi chú" className="sm:col-span-2">
            <textarea
              rows={3}
              className="input resize-y"
              value={v("notes")}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Chứng chỉ, điểm mạnh/yếu, lưu ý khi làm việc..."
            />
          </Field>
        </div>
      </section>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-ink-200 bg-white/95 px-4 py-3 shadow-card backdrop-blur">
        {supplier && dirty && (
          <span className="mr-auto rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            Chưa lưu thay đổi
          </span>
        )}
        {supplier && (
          <Button type="button" variant="ghost" onClick={() => setForm(init(supplier))} disabled={!dirty || busy}>
            Hoàn tác
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {supplier ? "Lưu thay đổi" : "Tạo nhà cung cấp"}
        </Button>
      </div>
    </form>
  );
}
