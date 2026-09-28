import { redirect } from "next/navigation";

import { getAdminUser } from "@/lib/admin/auth";
import { Wordmark } from "@/components/brand/wordmark";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Panel · Ingresar",
  robots: { index: false },
};

export default async function AdminLoginPage() {
  const admin = await getAdminUser();
  if (admin) redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Wordmark className="h-6 w-auto text-ink" />
          <p className="text-sm text-ink-3">Panel de la dueña</p>
        </div>

        <div className="rounded-control border border-line bg-paper p-7">
          <div className="mb-6 space-y-1 text-center">
            <h1 className="text-lg font-medium text-ink">Iniciá sesión</h1>
            <p className="text-sm text-ink-3">
              Entrá con tu email y contraseña para administrar la tienda.
            </p>
          </div>
          <LoginForm />
        </div>

        <p className="text-center text-xs text-ink-4">
          Acceso exclusivo para el equipo de Hazing.
        </p>
      </div>
    </main>
  );
}
