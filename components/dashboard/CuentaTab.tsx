"use client";

import { useActionState } from "react";
import {
  changePasswordAction,
  changeUsernameAction,
  type ChangePasswordState,
  type ChangeUsernameState,
} from "@/app/(dashboard)/configuracion/actions";
import { InlineMessage } from "@/components/dashboard/InlineMessage";

const initialPasswordState: ChangePasswordState = {};
const initialUsernameState: ChangeUsernameState = {};

const inputClass =
  "rounded-[10px] border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-placeholder outline-none focus:border-accent";
const labelClass = "text-[13px] font-semibold text-label";

export function CuentaTab({
  username,
  signOutAction,
}: {
  username: string;
  signOutAction: () => Promise<void>;
}) {
  const [passwordState, passwordFormAction, passwordPending] = useActionState(
    changePasswordAction,
    initialPasswordState
  );
  const [usernameState, usernameFormAction, usernamePending] = useActionState(
    changeUsernameAction,
    initialUsernameState
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold">Cuenta</h2>
          <p className="mt-1 text-[13px] text-muted">
            Sesión iniciada como <span className="font-medium text-foreground">{username}</span>
          </p>
        </div>
        <form action={signOutAction}>
          <button className="shrink-0 rounded-[10px] border border-border px-4 py-2.5 text-[13px] font-semibold text-danger hover:bg-danger/10">
            Cerrar sesión
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-4 border-t border-border-soft pt-6">
        <div>
          <h3 className="text-[15px] font-semibold">Cambiar contraseña</h3>
        </div>
        <form action={passwordFormAction} className="flex max-w-[420px] flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Contraseña actual</span>
            <input
              required
              type="password"
              name="currentPassword"
              placeholder="••••••••"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Nueva contraseña</span>
            <input
              required
              type="password"
              name="newPassword"
              placeholder="••••••••"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Confirmar nueva contraseña</span>
            <input
              required
              type="password"
              name="confirmNewPassword"
              placeholder="••••••••"
              className={inputClass}
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={passwordPending}
              className="rounded-[10px] bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {passwordPending ? "Guardando..." : "Cambiar contraseña"}
            </button>
            {passwordState.success && (
              <InlineMessage pending={passwordPending} tone="success" text="Contraseña actualizada." />
            )}
            {passwordState.error && (
              <InlineMessage pending={passwordPending} tone="error" text={passwordState.error} />
            )}
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-4 border-t border-border-soft pt-6">
        <div>
          <h3 className="text-[15px] font-semibold">Cambiar nombre de usuario</h3>
          <p className="mt-1 text-[12.5px] text-muted">
            Vas a tener que iniciar sesión de nuevo con el nombre nuevo.
          </p>
        </div>
        <form action={usernameFormAction} className="flex max-w-[420px] flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Nuevo nombre de usuario</span>
            <input
              required
              name="newUsername"
              placeholder="tu_usuario"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Contraseña actual</span>
            <input
              required
              type="password"
              name="currentPassword"
              placeholder="••••••••"
              className={inputClass}
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={usernamePending}
              className="rounded-[10px] bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {usernamePending ? "Guardando..." : "Cambiar usuario"}
            </button>
            {usernameState.error && (
              <InlineMessage pending={usernamePending} tone="error" text={usernameState.error} />
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
