import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Clean up any stale service workers left from previous dev sessions
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

// Global listener: Pressing Enter on single-line inputs dismisses the soft keyboard
if (typeof window !== "undefined") {
  window.addEventListener(
    "keydown",
    (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        const target = e.target as HTMLElement | null;
        if (target && target.tagName === "INPUT") {
          const input = target as HTMLInputElement;
          const type = (input.type || "text").toLowerCase();
          // Exclude checkbox, radio, button, submit, image, file, reset
          const isSingleLineText = ![
            "checkbox",
            "radio",
            "button",
            "submit",
            "image",
            "file",
            "reset",
          ].includes(type);

          if (isSingleLineText) {
            // Dismiss software keyboard by blurring active element
            input.blur();
          }
        }
      }
    },
    { capture: true },
  );
}

createRoot(document.getElementById("root")!).render(<App />);
