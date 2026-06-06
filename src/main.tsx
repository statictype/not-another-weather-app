import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/App";
import { getHistorySnapshot } from "@/hooks/use-history";
import { injectAirComfortPalette } from "@/lib/air-comfort-palette";
import { createQueryClient } from "@/lib/query-client";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

// Generate the air-comfort palette's CSS custom properties from their single
// source and inject them before first paint (both the app and /moods need
// them). See src/lib/air-comfort-palette.ts.
injectAirComfortPalette();

const root = createRoot(rootElement);

if (window.location.pathname === "/moods") {
  void import("@/components/mood-preview").then(({ MoodPreview }) => {
    root.render(
      <StrictMode>
        <MoodPreview />
      </StrictMode>,
    );
  });
} else {
  // Bootstrap the URL from history before React mounts so the app only
  // ever sees the "URL is the source of truth for the active city" path.
  // `replaceState` (not push) keeps the back-button history stack clean.
  // See docs/rfcs/007-url-driven-city.md, decisions D1–D3.
  const bootstrapUrl = new URL(window.location.href);
  if (!bootstrapUrl.searchParams.get("city")) {
    const last = getHistorySnapshot()[0];
    if (last) {
      bootstrapUrl.searchParams.set("city", last.query);
      window.history.replaceState(null, "", bootstrapUrl.toString());
    }
  }

  const queryClient = createQueryClient();

  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
}
