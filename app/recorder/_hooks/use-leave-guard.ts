import { useEffect } from "react";

// While a take is being recorded or saved, leaving this page would lose it.
// Closing or reloading the tab asks first, and links open in a new tab so
// the recording carries on here.
export function useLeaveGuard(active: boolean): void {
  useEffect(() => {
    if (!active) {
      return;
    }
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers need a value set to show their "Leave site?" prompt.
      event.returnValue = "";
    };
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) {
        return;
      }
      const url = new URL(link.href, window.location.href);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return;
      }
      const samePage = url.origin === window.location.origin && url.pathname === window.location.pathname;
      if (samePage && url.search === window.location.search) {
        // A jump within this page doesn't leave it.
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      window.open(url.href, "_blank", "noopener");
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    // Capture phase: this must run before the router handles the click.
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, [active]);
}
