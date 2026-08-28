import { revalidatePath } from "next/cache";

export function revalidateSubscriptionPaths(): void {
  revalidatePath("/");
  revalidatePath("/suscripciones");
  revalidatePath("/calendario");
  revalidatePath("/estadisticas");
}

export function revalidateSettingsPaths(): void {
  revalidatePath("/configuracion");
  revalidatePath("/");
  revalidatePath("/estadisticas");
}
