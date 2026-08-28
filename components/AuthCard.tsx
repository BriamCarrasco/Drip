import { LogoMark } from "@/components/icons";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-[420px] flex-col gap-7">
        <div className="flex items-center justify-center gap-2.5">
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-accent">
            <LogoMark />
          </div>
          <span className="font-heading text-base font-semibold">D(r)ip</span>
        </div>

        <div className="flex flex-col gap-1.5 text-center">
          <h1 className="font-heading text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>

        <div className="flex flex-col gap-4.5 rounded-2xl border border-border bg-surface p-6 sm:p-8">
          {children}
        </div>

        <p className="text-center text-[13.5px] text-muted">{footer}</p>
      </div>
    </div>
  );
}

export function AuthField({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-label">{label}</span>
      <input
        name={name}
        type={type}
        required
        placeholder={placeholder}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="rounded-[10px] border border-border px-3.5 py-3 text-sm text-foreground placeholder:text-placeholder outline-none focus:border-accent"
      />
    </label>
  );
}

export function AuthError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger">{message}</p>;
}

export function AuthSubmitButton({
  children,
  pending,
}: {
  children: React.ReactNode;
  pending?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1.5 rounded-[10px] bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Cargando..." : children}
    </button>
  );
}
