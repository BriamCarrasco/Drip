import { auth } from "@/auth";
import { getSettingsForUser } from "@/lib/settings";
import { ConfiguracionForm } from "@/components/dashboard/ConfiguracionForm";
import { signOutAction } from "./actions";

export default async function ConfiguracionPage() {
  const session = await auth();
  const username = session?.user?.username ?? "";
  const settings = getSettingsForUser(Number(session?.user?.id));

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-7 px-14 py-10">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Configuración</h1>
        <p className="mt-1.5 text-sm text-muted">
          Ajusta las notificaciones y preferencias por defecto de tu cuenta.
        </p>
      </div>

      <ConfiguracionForm settings={settings} username={username} signOutAction={signOutAction} />
    </div>
  );
}
