export function buildTelegramAppriseUrl(token: string, chatId: string, threadId?: string): string {
  const cleanToken = token.trim();
  const cleanChatId = chatId.trim();
  const cleanThread = threadId?.trim();
  const chatSegment = cleanThread ? `${cleanChatId}:${cleanThread}` : cleanChatId;
  return `tgram://${cleanToken}/${chatSegment}/`;
}

export function parseTelegramAppriseUrl(
  url: string
): { token: string; chatId: string; threadId: string } | null {
  const match = url.trim().match(/^tgram:\/\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return null;

  const [, token, chatSegment] = match;
  const [chatId, threadId] = chatSegment.split(":");
  if (!token || !chatId) return null;

  return { token, chatId, threadId: threadId ?? "" };
}
