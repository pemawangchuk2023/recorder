"use client";

import { Keyboard, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useEffect, useState, type ReactNode } from "react";

export interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; action: string }[];
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-b-2 bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground">
      {children}
    </kbd>
  );
}

// A button that opens the list of keyboard shortcuts; pressing "?" anywhere
// outside a text field opens it too.
export function ShortcutsHelp({ groups, note }: { groups: ShortcutGroup[]; note?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "?" && !event.ctrlKey && !event.metaKey && !event.altKey && !isTyping(event.target)) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
        <Keyboard className="size-4" aria-hidden="true" />
        Keyboard shortcuts
        <Key>?</Key>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-y-auto rounded-3xl border bg-card p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-xl font-semibold">Keyboard shortcuts</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                {note ?? "Shortcuts work while this page is in front."}
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>
          {groups.map((group) => (
            <section key={group.title} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{group.title}</h3>
              <dl className="flex flex-col divide-y">
                {group.shortcuts.map((shortcut) => (
                  <div key={shortcut.action} className="flex items-center justify-between gap-4 py-2">
                    <dt className="text-base">{shortcut.action}</dt>
                    <dd className="flex shrink-0 items-center gap-1">
                      {shortcut.keys.map((key, index) => (
                        <span key={key} className="flex items-center gap-1">
                          {index > 0 && <span className="text-muted-foreground">+</span>}
                          <Key>{key}</Key>
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
