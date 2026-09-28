import Link from "next/link";
import { LogOut } from "lucide-react";

import { requireAdmin } from "@/lib/admin/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/admin/login/actions";

export const metadata = {
  robots: { index: false },
};

export default async function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-paper md:flex-row">
      <AdminSidebar
        email={admin.email}
        logout={
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full justify-center gap-2"
            >
              <LogOut className="size-4 shrink-0" aria-hidden />
              Salir
            </Button>
          </form>
        }
      />

      {/* Top bar mobile: la marca y "salir" (en desktop viven en la sidebar). */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper px-4 py-3 md:hidden">
        <Link
          href="/admin"
          className="outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <Wordmark className="h-5 w-auto text-ink" />
        </Link>
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="text"
            size="sm"
            aria-label="Cerrar sesión"
            className="gap-1.5 px-2"
          >
            <LogOut className="size-5" aria-hidden />
          </Button>
        </form>
      </header>

      <main className="flex-1 px-4 py-6 pb-24 md:ml-60 md:px-8 md:py-10 md:pb-10">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
