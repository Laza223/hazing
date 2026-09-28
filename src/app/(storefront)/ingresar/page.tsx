import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/customer/auth";
import { sanitizeNext } from "@/lib/http/sanitize-next";
import { IngresarForm } from "./ingresar-form";

export const metadata: Metadata = { title: "Ingresar" };

interface IngresarPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function IngresarPage({
  searchParams,
}: IngresarPageProps) {
  const params = await searchParams;
  const nextParam = typeof params.next === "string" ? params.next : null;
  const next = sanitizeNext(nextParam, "/cuenta");

  const customer = await getCustomer();
  if (customer) redirect(next);

  const errorParam = typeof params.error === "string" ? params.error : null;
  const initialError =
    errorParam === "auth"
      ? "No pudimos verificar el link. Intentá de nuevo."
      : null;

  return (
    <section className="mx-auto max-w-[1600px] px-4 py-10 md:px-10">
      <h1 className="mb-8 text-center font-display text-2xl text-ink">
        Tu cuenta
      </h1>
      <IngresarForm initialError={initialError} next={next} />
    </section>
  );
}
