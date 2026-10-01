"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

// Copies text for pasting into YouTube Studio, confirming for a moment.
export function CopyButton({ text, label, disabled }: { text: string; label: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button
      type="button"
      onClick={() => void copy()}
      disabled={disabled || !text}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-border transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
    >
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      {copied ? "Copied" : label}
    </button>
  );
}
