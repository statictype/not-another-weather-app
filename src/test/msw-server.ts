import { setupServer } from "msw/node";
import { handlers } from "./msw-handlers";

/** Override per-test with `server.use(...)`. */
export const server = setupServer(...handlers);
