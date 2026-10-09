import { requireCustomer } from "@/lib/customer/auth";
import { prisma } from "@/lib/prisma";
import { ConsentToggle } from "./consent-toggle";
import { DatosForm } from "./datos-form";

export default async function DatosPage() {
  const customer = await requireCustomer();
  const row = await prisma.customer.findUnique({
    where: { id: customer.id },
    select: { name: true, phone: true, email: true, marketingConsent: true },
  });
  return (
    <>
      <DatosForm
        initial={{
          name: row?.name ?? "",
          phone: row?.phone ?? "",
          email: row?.email ?? "",
        }}
      />
      <ConsentToggle initial={row?.marketingConsent ?? false} />
    </>
  );
}
