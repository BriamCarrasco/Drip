"use client";

import { useEffect, useState } from "react";

const AUTO_HIDE_MS = 4000;

function InlineMessageBody({ text, tone }: { text: string; tone: "success" | "error" }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (tone !== "success") return;
    const timeout = setTimeout(() => setDismissed(true), AUTO_HIDE_MS);
    return () => clearTimeout(timeout);
  }, [tone]);

  if (dismissed) return null;

  return (
    <span
      className={`animate-message-in inline-block text-[13px] font-medium ${
        tone === "success" ? "text-success" : "text-danger"
      }`}
    >
      {text}
    </span>
  );
}

export function InlineMessage({
  text,
  tone,
  pending,
}: {
  text: string;
  tone: "success" | "error";
  pending: boolean;
}) {
  const [prevPending, setPrevPending] = useState(pending);
  const [seq, setSeq] = useState(0);

  if (pending !== prevPending) {
    setPrevPending(pending);
    if (!pending) setSeq((n) => n + 1);
  }

  return <InlineMessageBody key={seq} text={text} tone={tone} />;
}
