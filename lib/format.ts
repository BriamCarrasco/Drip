export function formatCLP(amount: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(Math.round(amount));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00`));
}
