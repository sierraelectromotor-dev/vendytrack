import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.rol === "SUPERADMIN") {
    redirect("/superadmin");
  }

  if (user.rol === "CLIENTE") {
    redirect("/cliente");
  }

  if (user.rol === "ADMIN") {
    redirect("/admin");
  }

  redirect("/rutero");
}
