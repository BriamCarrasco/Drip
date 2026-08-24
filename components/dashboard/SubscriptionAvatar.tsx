"use client";

import { useEffect, useRef, useState } from "react";
import { getAvatarStyle } from "@/lib/avatar";

function toDisplaySrc(logoUrl: string): string {
  if (/^https?:\/\//i.test(logoUrl)) {
    return `/api/logo?u=${encodeURIComponent(logoUrl)}`;
  }
  return logoUrl;
}

export function SubscriptionAvatar({
  name,
  logoUrl,
  size = 38,
  rounded = "rounded-[11px]",
  className = "",
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
  rounded?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const avatar = getAvatarStyle(name);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, [logoUrl]);

  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={imgRef}
        src={toDisplaySrc(logoUrl)}
        alt={name}
        onError={() => setFailed(true)}
        style={{ width: size, height: size }}
        className={`shrink-0 ${rounded} object-cover ${className}`}
      />
    );
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center ${rounded} text-sm font-semibold ${className}`}
      style={{ width: size, height: size, background: avatar.bg, color: avatar.color }}
    >
      {avatar.letter}
    </span>
  );
}
