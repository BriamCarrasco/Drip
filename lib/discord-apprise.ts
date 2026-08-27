export function isDiscordAppriseUrl(url: string): boolean {
  const trimmed = url.trim();
  return /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//i.test(trimmed) || trimmed.startsWith("discord://");
}
