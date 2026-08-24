import { auth } from "@/auth";
import { getSubscriptionsForUser } from "@/lib/subscriptions";
import { SubscriptionsTable } from "@/components/dashboard/SubscriptionsTable";

export default async function SuscripcionesPage() {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const subscriptions = getSubscriptionsForUser(userId);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:px-8 sm:py-9 lg:px-14">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Suscripciones</h1>
        <p className="mt-1.5 text-sm text-muted">
          Gestiona tus suscripciones, ordenadas por próxima fecha de cobro.
        </p>
      </div>

      <SubscriptionsTable subscriptions={subscriptions} />
    </div>
  );
}
