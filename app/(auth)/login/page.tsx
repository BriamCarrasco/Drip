"use client";

import { Suspense, useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthCard, AuthError, AuthField, AuthSubmitButton } from "@/components/AuthCard";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

function LoginForm() {
  const searchParams = useSearchParams();
  const renamed = searchParams.get("renamed");
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [username, setUsername] = useState(renamed ?? "");

  return (
    <AuthCard
      title="Inicia sesión"
      subtitle="Ingresa tus datos para acceder a tu panel."
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="font-semibold text-accent hover:underline">
            Crear cuenta
          </Link>
        </>
      }
    >
      <form action={formAction} className="flex flex-col gap-4.5">
        {renamed && !state.error && (
          <p className="rounded-lg bg-success-tint px-3.5 py-2.5 text-[13px] text-success">
            Tu nombre de usuario ahora es <strong>{renamed}</strong>. Inicia sesión de nuevo.
          </p>
        )}
        <AuthError message={state.error} />
        <AuthField
          label="Nombre de usuario"
          name="username"
          placeholder="Nombre de usuario"
          value={username}
          onChange={setUsername}
        />
        <AuthField label="Contraseña" name="password" type="password" placeholder="••••••••" />
        <AuthSubmitButton pending={pending}>Iniciar sesión</AuthSubmitButton>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
