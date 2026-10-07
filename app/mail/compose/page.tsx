import { getStore } from "@/lib/db";
import { STAGE_CONTENT } from "@/lib/email/stage-content";
import { buildSignature } from "@/lib/email/signature";
import { fill, unwrapEmailShell } from "@/lib/email/templates";
import { isStage } from "@/lib/pipeline";
import { Breadcrumbs } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { ComposeMail, type ComposeInitial, type Contact } from "@/components/compose-mail";

export const dynamic = "force-dynamic";

export const metadata = { title: "Soạn thư" };

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; supplier?: string; draft?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const store = getStore();
  const [buyers, suppliers] = await Promise.all([store.listBuyers(), store.listSuppliers()]);

  const contacts: Contact[] = [
    ...buyers
      .filter((b) => b.email)
      .map((b) => ({ id: b.id, name: b.company, email: b.email, kind: "buyer" as const })),
    ...suppliers
      .filter((s) => s.email)
      .map((s) => ({ id: s.id, name: s.name, email: s.email, kind: "supplier" as const })),
  ];

  // -------- Mở bản nháp --------
  if (sp.draft) {
    const msg = await store.getMessage(sp.draft);
    if (msg) {
      const buyer = buyers.find((b) => b.id === msg.buyer_id) ?? null;
      return (
        <Shell>
          <ComposeMail
            initial={{
              buyerId: msg.buyer_id,
              supplierId: msg.supplier_id,
              direction: msg.direction,
              to: msg.to_emails,
              cc: msg.cc_emails,
              bcc: msg.bcc_emails,
              subject: msg.subject,
              bodyHtml: unwrapEmailShell(msg.body_html),
              attachments: msg.attachments,
              draftId: msg.id,
            }}
            contacts={contacts}
            buyer={buyer}
            signature={buildSignature(msg.created_by)}
          />
        </Shell>
      );
    }
  }

  // -------- Soạn cho một buyer cụ thể --------
  const buyer = sp.to ? (buyers.find((b) => b.id === sp.to) ?? null) : null;
  const supplier = sp.supplier
    ? (suppliers.find((s) => s.id === sp.supplier) ?? null)
    : (buyer?.supplier_id ? (suppliers.find((s) => s.id === buyer.supplier_id) ?? null) : null);

  const direction: "buyer" | "supplier" =
    sp.dir === "supplier" || (!buyer && supplier) ? "supplier" : "buyer";

  const initial: ComposeInitial = { buyerId: buyer?.id ?? null, supplierId: supplier?.id ?? null, direction, to: [], cc: [] };

  if (direction === "buyer" && buyer) {
    initial.to = buyer.email ? [buyer.email] : [];
    initial.cc = (buyer.cc_emails ?? "")
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (isStage(buyer.stage)) {
      const copy = STAGE_CONTENT[buyer.stage].buyer;
      initial.subject = fill(copy.subject, buyer);
      initial.bodyHtml =
        `<p>Dear ${buyer.contact_name || buyer.company},</p>` +
        copy.body.map((p) => `<p>${fill(p, buyer)}</p>`).join("") +
        `<p><strong>What happens next:</strong> ${fill(copy.action, buyer)}</p>` +
        `<p><br/></p>` +
        buildSignature(buyer.owner);
    }
  } else if (direction === "supplier" && supplier) {
    initial.to = supplier.email ? [supplier.email] : [];
    const stage = buyer?.stage && isStage(buyer.stage) ? buyer.stage : "contacted";
    if (buyer) {
      const copy = STAGE_CONTENT[stage].supplier;
      initial.subject = fill(copy.subject, buyer, supplier);
      initial.bodyHtml =
        `<p>Kính gửi Anh/Chị ${supplier.contact_name || supplier.name},</p>` +
        copy.body.map((p) => `<p>${fill(p, buyer, supplier)}</p>`).join("") +
        `<p><strong>Việc cần làm</strong> <em>(hạn: ${fill(copy.deadline, buyer, supplier)})</em>:</p><ol>` +
        copy.tasks.map((t) => `<li>${fill(t, buyer, supplier)}</li>`).join("") +
        `</ol><p><br/></p>` +
        buildSignature(buyer.owner);
    }
  }

  return (
    <Shell
      sub={
        direction === "buyer"
          ? buyer
            ? `Gửi tới ${buyer.company} — nội dung đã nạp sẵn theo giai đoạn hiện tại, bạn có thể sửa tự do.`
            : "Chọn người nhận từ danh sách buyer (gõ vào ô Tới)."
          : supplier
            ? `Gửi tới ${supplier.name} — nội dung tiếng Việt đã nạp sẵn theo giai đoạn hiện tại.`
            : "Chọn người nhận từ danh sách nhà cung cấp."
      }
    >
      <ComposeMail
        initial={initial}
        contacts={contacts}
        buyer={buyer}
        signature={buildSignature(buyer?.owner)}
      />
    </Shell>
  );
}

function Shell({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <>
      <PageHeader
        title="Soạn email"
        sub={sub}
        breadcrumbs={<Breadcrumbs items={[{ label: "Hộp thư", href: "/mail" }, { label: "Soạn thư" }]} />}
      />
      <div className="max-w-4xl">{children}</div>
    </>
  );
}
