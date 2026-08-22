"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark, PlusIcon } from "@/components/icons";
import { useSubscriptionModal } from "@/lib/subscription-modal-context";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/suscripciones", label: "Suscripciones" },
  { href: "/configuracion", label: "Configuración" },
];

export function TopBar({ username }: { username: string }) {
  const pathname = usePathname();
  const { openCreateModal } = useSubscriptionModal();
  const showNewButton = pathname !== "/configuracion";
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center justify-between border-b border-border px-14 py-[22px]">
      <div className="flex items-center gap-2.5">
        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-accent">
          <LogoMark />
        </div>
        <span className="font-heading text-base font-semibold">Suscripciones</span>
      </div>

      <div className="flex items-center gap-1.5 rounded-xl bg-surface-muted p-1">
        {navItems.map((item) => {
          const active = item.href === pathname;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "rounded-[9px] bg-accent px-4 py-2 text-[13px] font-semibold text-white"
                  : "rounded-[9px] px-4 py-2 text-[13px] font-medium text-muted-strong hover:text-foreground"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {showNewButton ? (
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-[10px] bg-accent px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90"
        >
          <PlusIcon size={15} />
          Nueva suscripción
        </button>
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-tint text-[13px] font-semibold text-accent">
          {initials}
        </div>
      )}
    </div>
  );
}
