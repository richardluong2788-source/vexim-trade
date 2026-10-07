import "server-only";

import { getStore } from "@/lib/db";
import type { BuyerWithSupplier, Supplier } from "@/lib/types";

export async function listBuyersWithSupplier(): Promise<BuyerWithSupplier[]> {
  const store = getStore();
  const [buyers, suppliers] = await Promise.all([
    store.listBuyers(),
    store.listSuppliers(),
  ]);
  const map = new Map<string, Supplier>(suppliers.map((s) => [s.id, s]));

  return buyers.map((b) => {
    const sup = b.supplier_id ? map.get(b.supplier_id) ?? null : null;
    return {
      ...b,
      supplier: sup
        ? {
            id: sup.id,
            name: sup.name,
            email: sup.email,
            phone: sup.phone,
            contact_name: sup.contact_name,
          }
        : null,
    };
  });
}

export async function getBuyerWithSupplier(id: string) {
  const all = await listBuyersWithSupplier();
  return all.find((b) => b.id === id) ?? null;
}
