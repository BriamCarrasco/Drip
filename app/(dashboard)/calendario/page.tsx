import { auth } from "@/auth";
import { getSubscriptionsForUser } from "@/lib/subscriptions";
import { getPaymentLog } from "@/lib/payment-log";
import { RenewalsCalendar, type PaidOccurrence } from "@/components/dashboard/RenewalsCalendar";
import { EmptyStateNote } from "@/components/dashboard/EmptyStateNote";
import { PageContainer } from "@/components/dashboard/PageContainer";

export default async function CalendarioPage() {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const subscriptions = getSubscriptionsForUser(userId).filter((sub) => sub.isActive);

  const payments: PaidOccurrence[] = subscriptions.flatMap((sub) =>
    getPaymentLog(sub.id).map((payment) => ({
      subscriptionId: sub.id,
      name: sub.name,
      logoUrl: sub.logoUrl,
      amount: payment.amount,
      currency: payment.currency,
      date: payment.paidAt.slice(0, 10),
    }))
  );

  return (
    <PageContainer>
      <div>
        <h1 className="font-heading text-2xl font-semibold">Calendario</h1>
        <p className="mt-1.5 text-sm text-muted">Vista mensual de tus próximos cobros.</p>
      </div>

      {subscriptions.length === 0 ? (
        <EmptyStateNote>Todavía no tienes suscripciones registradas.</EmptyStateNote>
      ) : (
        <RenewalsCalendar subscriptions={subscriptions} payments={payments} />
      )}
    </PageContainer>
  );
}
