"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 5000;
const MAX_ATTEMPTS = 12; // 12 × 5s = 60s (docs/spec/08-checkout.md §3.5: sin spinner eterno).

/**
 * PendingRefresh — mientras el pedido sigue `pending_payment` (esperando el
 * webhook de MP), refresca la página cada 5s hasta 1 minuto y después deja
 * de intentar. El estado real lo trae el Server Component al re-renderizar.
 */
export function PendingRefresh() {
  const router = useRouter();
  const attempts = useRef(0);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    if (stopped) return;
    const id = setTimeout(() => {
      attempts.current += 1;
      if (attempts.current >= MAX_ATTEMPTS) setStopped(true);
      router.refresh();
    }, INTERVAL_MS);
    return () => clearTimeout(id);
  }, [router, stopped]);

  return null;
}
