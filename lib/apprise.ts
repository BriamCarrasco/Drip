import { execFile } from "node:child_process";

export type NotificationInput = {
  url: string;
  title: string;
  body: string;
};

const NOTIFICATION_TIMEOUT_MS = 15_000;

export function sendNotification({ url, title, body }: NotificationInput): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(
      "apprise",
      ["-t", title, "-b", body, url],
      { timeout: NOTIFICATION_TIMEOUT_MS },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`[apprise] fallo al notificar a "${url}":`, stderr || error.message);
          resolve(false);
          return;
        }
        resolve(true);
      }
    );
  });
}
