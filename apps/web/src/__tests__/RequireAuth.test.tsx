import type { Session } from "@supabase/supabase-js";
import { screen, waitFor } from "@testing-library/react";
import RequireAuth from "../components/RequireAuth";
import { supabase } from "../lib/supabaseClient";
import { renderScreen } from "./utils";

function mockSession(session: Partial<Session> | null) {
  jest
    .mocked(supabase.auth.getSession)
    .mockResolvedValueOnce({ data: { session }, error: null } as Awaited<ReturnType<typeof supabase.auth.getSession>>);
}

function renderProtected() {
  renderScreen(
    <RequireAuth>
      <p>Check-in screen</p>
    </RequireAuth>,
    { route: "/", path: "/" },
  );
}

describe("RequireAuth", () => {
  it("shows the screen when signed in", async () => {
    mockSession({ access_token: "test-token" });
    renderProtected();

    expect(await screen.findByText("Check-in screen")).toBeInTheDocument();
  });

  it("sends a signed-out user to the login screen", async () => {
    mockSession(null);
    renderProtected();

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/login"));
    expect(screen.queryByText("Check-in screen")).not.toBeInTheDocument();
  });
});
