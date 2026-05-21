"use client";

import { useState } from "react";

type InstallCommandProps = {
  command: string;
};

export function InstallCommand({ command }: InstallCommandProps) {
  const [copied, setCopied] = useState(false);

  async function copyCommand() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button className="install-command" type="button" onClick={copyCommand} aria-label={`Copy ${command}`}>
      <code>{command}</code>
      <span aria-live="polite">{copied ? "copied!" : ""}</span>
    </button>
  );
}
