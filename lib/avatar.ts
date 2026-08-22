const palette = [
  { bg: "#F3D9D9", color: "#B23A3A" },
  { bg: "#D9F3E3", color: "#1F8A4C" },
  { bg: "#DCEBFA", color: "#2E6FB0" },
  { bg: "#F3D9EA", color: "#A23A82" },
  { bg: "#F6E7CF", color: "#9C6B1F" },
  { bg: "#E7E6E1", color: "#57544C" },
];

export function getAvatarStyle(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const { bg, color } = palette[hash % palette.length];
  return { letter: name.charAt(0).toUpperCase(), bg, color };
}
