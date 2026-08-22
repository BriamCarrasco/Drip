import { TopBar } from "@/components/dashboard/TopBar";
import { SubscriptionFormModal } from "@/components/dashboard/SubscriptionFormModal";
import { SubscriptionModalProvider } from "@/lib/subscription-modal-context";
import { auth } from "@/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const username = session?.user?.username ?? "";

  return (
    <SubscriptionModalProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <TopBar username={username} />
        {children}
        <SubscriptionFormModal />
      </div>
    </SubscriptionModalProvider>
  );
}
