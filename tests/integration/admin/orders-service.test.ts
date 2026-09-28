import { describe, it, expect, vi } from "vitest";
import {
  changeOrderStatus,
  type OrdersDeps,
  type AdminOrder,
} from "@/lib/admin/orders/service";

const order = (over: Partial<AdminOrder> = {}): AdminOrder => ({
  id: "ord-1",
  status: "paid",
  items: [{ id: "oi-1", variantId: "v1", qty: 2 }],
  ...over,
});

function makeDeps(
  o: AdminOrder | null,
  opts: { updateManyCount?: number } = {},
) {
  const tx = {
    order: {
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: opts.updateManyCount ?? 1 })),
    },
    productVariant: { update: vi.fn(async () => ({})) },
  };
  const deps: OrdersDeps = {
    db: {
      order: { findUnique: vi.fn(async () => o) },
      $transaction: vi.fn(async (fn) => fn(tx as never)),
    } as never,
  };
  return { deps, tx };
}

describe("changeOrderStatus", () => {
  it("aplica una transición válida (paid → preparing) sin tocar stock", async () => {
    const { deps, tx } = makeDeps(order({ status: "paid" }));
    const r = await changeOrderStatus("ord-1", "preparing", deps);
    expect(r.id).toBe("ord-1");
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: "ord-1", status: "paid" },
      data: { status: "preparing" },
    });
    expect(tx.productVariant.update).not.toHaveBeenCalled();
  });

  it("rechaza una transición inválida (delivered → preparing) con error claro", async () => {
    const { deps } = makeDeps(order({ status: "delivered" }));
    await expect(changeOrderStatus("ord-1", "preparing", deps)).rejects.toThrow(
      /no se puede pasar/i,
    );
  });

  it("rechaza si el pedido no existe", async () => {
    const { deps } = makeDeps(null);
    await expect(changeOrderStatus("ord-x", "paid", deps)).rejects.toThrow(
      /no existe/i,
    );
  });

  it("cancelar un pedido pagado repone stock de las variantes", async () => {
    const o = order({
      id: "ord-2",
      status: "paid",
      items: [
        { id: "oi-1", variantId: "v1", qty: 2 },
        { id: "oi-2", variantId: "v2", qty: 3 },
      ],
    });
    const { deps, tx } = makeDeps(o);
    const r = await changeOrderStatus("ord-2", "cancelled", deps);
    expect(r.id).toBe("ord-2");
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: "ord-2", status: "paid" },
      data: { status: "cancelled" },
    });
    expect(tx.productVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { stock: { increment: 2 } },
    });
    expect(tx.productVariant.update).toHaveBeenCalledWith({
      where: { id: "v2" },
      data: { stock: { increment: 3 } },
    });
    expect(tx.productVariant.update).toHaveBeenCalledTimes(2);
  });

  it("reembolsar un pedido pagado repone stock de las variantes", async () => {
    const { deps, tx } = makeDeps(order({ status: "paid" }));
    await changeOrderStatus("ord-1", "refunded", deps);
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: "ord-1", status: "paid" },
      data: { status: "refunded" },
    });
    expect(tx.productVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { stock: { increment: 2 } },
    });
  });

  it("NO repone stock al cancelar un pedido pendiente de pago (stock nunca descontado)", async () => {
    const { deps, tx } = makeDeps(order({ status: "pending_payment" }));
    await changeOrderStatus("ord-1", "cancelled", deps);
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: "ord-1", status: "pending_payment" },
      data: { status: "cancelled" },
    });
    expect(tx.productVariant.update).not.toHaveBeenCalled();
  });

  it("rechaza cancelar un pedido ya entregado", async () => {
    const { deps } = makeDeps(order({ status: "delivered" }));
    await expect(changeOrderStatus("ord-1", "cancelled", deps)).rejects.toThrow(
      /no se puede pasar/i,
    );
  });

  it("si otra edición ya cambió el estado (updateMany count 0), aborta sin reponer stock y avisa", async () => {
    const { deps, tx } = makeDeps(order({ status: "paid" }), {
      updateManyCount: 0,
    });
    await expect(changeOrderStatus("ord-1", "cancelled", deps)).rejects.toThrow(
      /cambió mientras lo editabas/i,
    );
    expect(tx.productVariant.update).not.toHaveBeenCalled();
  });

  it("dos llamadas secuenciales con el mismo estado leído (ambas 'paid' → 'cancelled'): una sola reposición", async () => {
    // Simula la carrera real: ambas invocaciones leen `order.status = "paid"` ANTES de que
    // cualquiera escriba (mismo `findUnique` fuera de la tx). El `updateMany` con precondición
    // sobre ese status leído solo le da count=1 a la primera que corre su tx; la segunda,
    // aunque leyó el mismo estado, encuentra el status real ya cambiado y pierde la carrera.
    let realStatus: string = "paid";
    const tx = {
      order: {
        update: vi.fn(async () => ({})),
        updateMany: vi.fn(
          async ({
            where,
            data,
          }: {
            where: { status: string };
            data: { status: string };
          }) => {
            if (where.status !== realStatus) return { count: 0 };
            realStatus = data.status;
            return { count: 1 };
          },
        ),
      },
      productVariant: { update: vi.fn(async () => ({})) },
    };
    const readOrder = order({ status: "paid" }); // ambas invocaciones parten de esta misma lectura
    const deps: OrdersDeps = {
      db: {
        order: { findUnique: vi.fn(async () => readOrder) },
        $transaction: vi.fn(async (fn) => fn(tx as never)),
      } as never,
    };

    const first = await changeOrderStatus("ord-1", "cancelled", deps);
    expect(first.id).toBe("ord-1");
    await expect(changeOrderStatus("ord-1", "cancelled", deps)).rejects.toThrow(
      /cambió mientras lo editabas/i,
    );

    expect(tx.productVariant.update).toHaveBeenCalledTimes(1);
  });
});
