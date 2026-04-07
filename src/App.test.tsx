import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { __resetHistoryStoreForTests } from "@/hooks/use-history";
import { App } from "./App";

function renderApp() {
  __resetHistoryStoreForTests();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}

describe("App (smoke)", () => {
  it("renders the header and the inviting empty state", () => {
    renderApp();
    expect(screen.getByRole("heading", { name: /oasis/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /where to/i })).toBeInTheDocument();
  });

  it("renders the search input with a label", () => {
    renderApp();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
  });
});
