import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { Guest } from "@support-hub/shared";

type MockResponse = { status?: number; body?: unknown };

// Answers the next fetch calls, in order, with these responses.
export function mockApi(...responses: MockResponse[]) {
  const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
  for (const { status = 200, body = {} } of responses) {
    fetchMock.mockImplementationOnce(
      async () =>
        ({
          ok: status >= 200 && status < 300,
          status,
          json: async () => body,
        }) as Response,
    );
  }
  return fetchMock;
}

// The method, path and parsed JSON body of the nth fetch call.
export function fetchCall(n: number) {
  const [url, init] = (globalThis.fetch as jest.MockedFunction<typeof fetch>).mock.calls[n];
  return {
    method: init?.method ?? "GET",
    path: String(url).replace("http://api.test", ""),
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
  };
}

// Shows where the app navigated to, so tests can assert on it.
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

// Renders a screen at `path` (matched by `route`) with a fresh query cache
// and no retries, so failed requests surface immediately.
export function renderScreen(ui: ReactElement, { route, path }: { route: string; path: string }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={ui} />
          <Route path="*" element={null} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

export function makeGuest(overrides: Partial<Guest> = {}): Guest {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    displayName: "Alex Smith",
    gender: "woman",
    postcode: "3021",
    createdAt: "2026-10-01T10:00:00Z",
    updatedAt: "2026-10-01T10:00:00Z",
    ...overrides,
  };
}
