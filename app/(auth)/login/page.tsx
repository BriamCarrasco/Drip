"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AuthCard, AuthError, AuthField, AuthSubmitButton } from "@/components/AuthCard";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [username, setUsername] = useState("");

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
