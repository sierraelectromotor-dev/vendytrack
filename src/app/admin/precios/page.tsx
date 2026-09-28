import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PreciosPage() {
  redirect("/admin/clientes");
}
