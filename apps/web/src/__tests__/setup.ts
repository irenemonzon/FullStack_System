import "@testing-library/jest-dom";

process.env.VITE_API_URL = "http://api.test";

// The real client needs Supabase env vars and talks to the network; tests
// get a signed-in session instead. RequireAuth tests override getSession.
jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: { access_token: "test-token" } } })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
}));

// jsdom has no fetch; each test queues the API responses it expects with
// mockApi() (see utils.tsx).
beforeEach(() => {
  globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
    throw new Error(`Unexpected fetch to ${String(input)} — mock it with mockApi()`);
  }) as typeof fetch;
});
