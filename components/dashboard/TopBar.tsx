"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import {
  BarChartIcon,
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
  { href: "/estadisticas", label: "Estadísticas", icon: BarChartIcon },
  { href: "/configuracion", label: "Configuración", icon: SettingsIcon },
];

export function TopBar({ username }: { username: string }) {
  const pathname = usePathname();
  const { openCreateModal } = useSubscriptionModal();
  const showNewButton = pathname !== "/configuracion";
  const initials = username.slice(0, 2).toUpperCase();

  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>());
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const container = navRef.current;
    const activeItem = itemRefs.current.get(pathname);
    if (!container || !activeItem) return;

    function measure() {
      const containerRect = container!.getBoundingClientRect();
      const itemRect = activeItem!.getBoundingClientRect();
      setPill({ left: itemRect.left - containerRect.left, width: itemRect.width });
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [pathname]);

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-8 sm:py-4 lg:px-14 lg:py-[22px]">
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-accent">
          <LogoMark />
        </div>
        <span className="hidden font-heading text-base font-semibold sm:inline">D(r)ip</span>
      </div>

      <div
        ref={navRef}
        className="relative flex items-center gap-0.5 rounded-xl bg-surface-muted p-1 sm:gap-1.5"
      >
        {pill && (
          <span
            aria-hidden
            className="absolute inset-y-1 rounded-[9px] bg-accent transition-all duration-300 ease-out motion-reduce:transition-none"
            style={{ left: pill.left, width: pill.width }}
          />
        )}
        {navItems.map((item) => {
          const active = item.href === pathname;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              ref={(el) => {
                if (el) itemRefs.current.set(item.href, el);
                else itemRefs.current.delete(item.href);
              }}
              className={
                active
                  ? "relative z-10 flex items-center gap-2 rounded-[9px] px-2.5 py-2 text-[13px] font-semibold text-white transition-colors duration-300 sm:px-4"
                  : "relative z-10 flex items-center gap-2 rounded-[9px] px-2.5 py-2 text-[13px] font-medium text-muted-strong transition-colors duration-300 hover:text-foreground sm:px-4"
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
