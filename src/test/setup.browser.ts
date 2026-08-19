import "@testing-library/jest-dom/vitest";
import "@/index.css";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// No MSW here. The browser project asserts geometry, so it stubs `fetch` per
// test rather than standing up a service worker.
afterEach(cleanup);
