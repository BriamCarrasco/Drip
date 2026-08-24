"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarIcon,
  HomeIcon,
  ListIcon,
  LogoMark,
  PlusIcon,
  SettingsIcon,
} from "@/components/icons";
import { useSubscriptionModal } from "@/lib/subscription-modal-context";

const navItems = [
  { href: "/", label: "Inicio", icon: HomeIcon },
  { href: "/suscripciones", label: "Suscripciones", icon: ListIcon },
  { href: "/calendario", label: "Calendario", icon: CalendarIcon },
  { href: "/configuracion", label: "Configuración", icon: SettingsIcon },
];

export function TopBar({ username }: { username: string }) {
  const pathname = usePathname();
  const { openCreateModal } = useSubscriptionModal();
  const showNewButton = pathname !== "/configuracion";
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-8 sm:py-4 lg:px-14 lg:py-[22px]">
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-accent">
          <LogoMark />
        </div>
        <span className="hidden font-heading text-base font-semibold sm:inline">Suscripciones</span>
      </div>

      <div className="flex items-center gap-0.5 rounded-xl bg-surface-muted p-1 sm:gap-1.5">
        {navItems.map((item) => {
          const active = item.href === pathname;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "flex items-center gap-2 rounded-[9px] bg-accent px-2.5 py-2 text-[13px] font-semibold text-white sm:px-4"
                  : "flex items-center gap-2 rounded-[9px] px-2.5 py-2 text-[13px] font-medium text-muted-strong hover:text-foreground sm:px-4"
              }
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {showNewButton ? (
        <button
          onClick={openCreateModal}
          className="flex shrink-0 items-center gap-2 rounded-[10px] bg-accent px-3 py-2.5 text-[13px] font-semibold text-white hover:opacity-90 sm:px-4"
        >
          <PlusIcon size={15} />
          <span className="hidden sm:inline">Nueva suscripción</span>
        </button>
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-tint text-[13px] font-semibold text-accent">
          {initials}
        </div>
      )}
    </div>
  );
}
