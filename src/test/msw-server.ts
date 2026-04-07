import { setupServer } from "msw/node";
import { handlers } from "./msw-handlers";

/**
 * Single MSW server instance shared across the frontend test suite.
 * Handlers can be overridden per-test via `server.use(...)`.
 */
export const server = setupServer(...handlers);
