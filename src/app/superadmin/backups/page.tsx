import { BackupClient } from "./BackupClient";

export const metadata = {
  title: "Copias de Seguridad | Superadmin",
};

export const dynamic = "force-dynamic";

export default function BackupsPage() {
  return <BackupClient />;
}
