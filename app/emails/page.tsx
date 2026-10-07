import { getStore } from "@/lib/db";
import { emailMode } from "@/lib/config";
import { PageHeader } from "@/components/page-header";
import { EmailLogList } from "@/components/email-log-list";
import { Card } from "@/components/ui";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Nhật ký email" };

export default async function EmailsPage() {
  const store = getStore();
  const [logs, buyers] = await Promise.all([store.listEmails(300), store.listBuyers()]);
  const names: Record<string, string> = {};
  for (const b of buyers) names[b.id] = b.company;
  const mode = emailMode();

  return (
    <>
      <PageHeader
        title="Nhật ký email"
        sub="Toàn bộ email hệ thống đã gửi (hoặc đã tạo ở chế độ demo) cho buyer và nhà cung cấp, kèm nội dung đầy đủ."
      />

      {mode === "local" && (
        <Card className="mb-5 flex flex-wrap items-center gap-2 border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Chưa cấu hình <code className="rounded bg-amber-100 px-1">RESEND_API_KEY</code> nên các email
          dưới đây ở trạng thái <strong>demo</strong> — nội dung đã tạo sẵn nhưng chưa gửi thật. Nút
          “Gửi lại” sẽ gửi thật ngay khi có key.
        </Card>
      )}

      <EmailLogList logs={logs} buyerNames={names} />
    </>
  );
}
