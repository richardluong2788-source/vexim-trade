"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronDown, Mail, MailX, RotateCw, Users } from "lucide-react";

import { resendLoggedEmailAction } from "@/app/actions";
import type { EmailLog } from "@/lib/types";
import { Badge, Button, EmptyState, cx, relativeTime } from "@/components/ui";
import { useToast } from "@/components/toast";

export function EmailLogList({
  logs,
  buyerNames,
}: {
  logs: EmailLog[];
  buyerNames: Record<string, string>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [dir, setDir] = useState("all");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return logs.filter((e) => {
      if (dir !== "all" && e.direction !== dir) return false;
      if (status !== "all" && e.status !== status) return false;
      if (!needle) return true;
      return [e.subject, e.recipients.join(" "), buyerNames[e.buyer_id] ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [logs, q, dir, status, buyerNames]);

  async function resend(id: string) {
    setBusyId(id);
    const res = await resendLoggedEmailAction(id);
    toast.push({ kind: res.ok ? "success" : "error", title: res.message });
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-200 p-3">
        <input
          className="input min-w-[200px] flex-1"
          placeholder="Tìm chủ đề, người nhận, buyer..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input w-auto" value={dir} onChange={(e) => setDir(e.target.value)}>
          <option value="all">Mọi người nhận</option>
          <option value="buyer">Gửi buyer</option>
          <option value="supplier">Gửi NCC</option>
        </select>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Mọi trạng thái</option>
          <option value="sent">Đã gửi</option>
          <option value="simulated">Demo (chưa gửi)</option>
          <option value="failed">Lỗi</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-5 w-5" />}
          title="Chưa có email nào"
          sub="Mỗi lần đổi trạng thái buyer, hệ thống ghi lại email đã gửi vào đây kèm nội dung đầy đủ."
        />
      ) : (
        <ul className="divide-y divide-ink-100">
          {rows.map((e) => {
            const isOpen = open === e.id;
            return (
              <li key={e.id}>
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-ink-50/60">
                  <span
                    className={cx(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      e.direction === "buyer"
                        ? "bg-brand-50 text-brand-700"
                        : "bg-amber-50 text-amber-700",
                    )}
                  >
                    {e.direction === "buyer" ? (
                      <Mail className="h-4 w-4" />
                    ) : (
                      <Users className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-ink-900">{e.subject}</p>
                    <p className="mt-0.5 truncate text-[11.5px] text-ink-500">
                      {buyerNames[e.buyer_id] ?? "—"} · tới {e.recipients.join(", ")}
                    </p>
                  </div>
                  <Badge
                    className={
                      e.status === "sent"
                        ? "bg-emerald-50 text-emerald-700"
                        : e.status === "failed"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"
                    }
                  >
                    {e.status === "sent" ? "đã gửi" : e.status === "failed" ? "lỗi" : "demo"}
                  </Badge>
                  <span className="hidden text-[11.5px] text-ink-400 sm:block">
                    {relativeTime(e.created_at)}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === e.id}
                      onClick={() => void resend(e.id)}
                      title="Gửi lại email này"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      Gửi lại
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setOpen(isOpen ? null : e.id)}
                      title="Xem nội dung"
                    >
                      <ChevronDown className={cx("h-3.5 w-3.5 transition", isOpen && "rotate-180")} />
                      Xem
                    </Button>
                  </div>
                </div>

                {e.error && (
                  <p className="flex items-center gap-1.5 bg-red-50 px-4 py-2 text-[11.5px] text-red-700">
                    <MailX className="h-3.5 w-3.5" />
                    {e.error}
                  </p>
                )}

                {isOpen && (
                  <iframe
                    title={`Nội dung email ${e.subject}`}
                    srcDoc={e.body_html}
                    sandbox=""
                    className="h-[520px] w-full border-t border-ink-200 bg-white"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
