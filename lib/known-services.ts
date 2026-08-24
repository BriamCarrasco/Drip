export type KnownService = {
  name: string;
  category: string;
  logoUrl: string;
};

function simpleIcon(slug: string, hexColor: string): string {
  return `https://cdn.simpleicons.org/${slug}/${hexColor}`;
}

export const knownServices: KnownService[] = [
  { name: "Netflix", category: "Streaming", logoUrl: simpleIcon("netflix", "E50914") },
  { name: "Spotify", category: "Streaming", logoUrl: simpleIcon("spotify", "1ED760") },
  { name: "YouTube Premium", category: "Streaming", logoUrl: simpleIcon("youtube", "FF0000") },
  { name: "Max", category: "Streaming", logoUrl: simpleIcon("max", "002BE7") },
  { name: "Twitch", category: "Streaming", logoUrl: simpleIcon("twitch", "9146FF") },
  { name: "Apple Music", category: "Streaming", logoUrl: simpleIcon("applemusic", "FA243C") },
  { name: "Notion", category: "Productividad", logoUrl: simpleIcon("notion", "000000") },
  { name: "Figma", category: "Diseño", logoUrl: simpleIcon("figma", "F24E1E") },
  { name: "Dropbox", category: "Almacenamiento", logoUrl: simpleIcon("dropbox", "0061FF") },
  { name: "Google Drive", category: "Almacenamiento", logoUrl: simpleIcon("googledrive", "4285F4") },
  { name: "iCloud+", category: "Almacenamiento", logoUrl: simpleIcon("icloud", "3693F3") },
  { name: "GitHub", category: "Hosting", logoUrl: simpleIcon("github", "181717") },
];
