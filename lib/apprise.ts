import { execFile } from "node:child_process";

export type NotificationInput = {
  url: string;
  title: string;
  body: string;
};

export function sendNotification({ url, title, body }: NotificationInput): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("apprise", ["-t", title, "-b", body, url], (error, stdout, stderr) => {
      if (error) {
        console.error(`[apprise] fallo al notificar a "${url}":`, stderr || error.message);
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}
