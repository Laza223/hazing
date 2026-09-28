import { requireCustomer } from "@/lib/customer/auth";
import { AccountNav } from "./account-nav";

export default async function CuentaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCustomer();
  return (
    <section className="mx-auto max-w-[1600px] space-y-6 px-4 py-10 md:px-10">
      <h1 className="font-display text-2xl text-ink">Mi cuenta</h1>
      <AccountNav />
      <div>{children}</div>
    </section>
  );
}
