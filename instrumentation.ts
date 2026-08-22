export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const globalForScheduler = globalThis as unknown as { __schedulerStarted?: boolean };
  if (globalForScheduler.__schedulerStarted) return;
  globalForScheduler.__schedulerStarted = true;

  const cron = await import("node-cron");
  const { runDailyCheck } = await import("@/lib/scheduler");

  cron.schedule(
    "0 9 * * *",
    () => {
      runDailyCheck().then(({ checked, notified }) => {
        console.log(`[scheduler] revisadas ${checked} suscripciones, ${notified} notificaciones enviadas`);
      });
    },
    { timezone: process.env.TZ || "America/Santiago" }
  );
}
