"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AuthCard, AuthError, AuthField, AuthSubmitButton } from "@/components/AuthCard";
import { registerAction, type RegisterState } from "./actions";

const initialState: RegisterState = {};

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  const [username, setUsername] = useState("");

  return (
    <AuthCard
      title="Crea tu cuenta"
      subtitle="Crea una cuenta para llevar el control de tus suscripciones."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-accent hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form action={formAction} className="flex flex-col gap-4.5">
        <AuthError message={state.error} />
        <AuthField
          label="Nombre de usuario"
          name="username"
          placeholder="Nombre de usuario"
          value={username}
          onChange={setUsername}
        />
        <AuthField label="Contraseña" name="password" type="password" placeholder="••••••••" />
        <AuthField
          label="Confirmar contraseña"
          name="confirmPassword"
          type="password"
          placeholder="••••••••"
        />
        <AuthSubmitButton pending={pending}>Crear cuenta</AuthSubmitButton>
      </form>
    </AuthCard>
  );
}
