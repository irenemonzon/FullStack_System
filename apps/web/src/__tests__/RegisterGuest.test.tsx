import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterGuest from "../screens/RegisterGuest";
import { fetchCall, makeGuest, mockApi, renderScreen } from "./utils";

function renderRegister() {
  renderScreen(<RegisterGuest />, { route: "/guests/new", path: "/guests/new" });
}

async function fillRequired({ postcode }: { postcode?: string } = {}) {
  await userEvent.type(screen.getByLabelText(/^Name/), "Alex Smith");
  await userEvent.click(screen.getByLabelText("Woman"));
  if (postcode !== undefined) await userEvent.type(screen.getByLabelText(/^Postcode/), postcode);
}

const save = () => userEvent.click(screen.getByRole("button", { name: "Save guest" }));

describe("Register guest", () => {
  it("won't submit without a postcode", async () => {
    renderRegister();
    await fillRequired();
    await save();

    expect(screen.getByLabelText(/^Postcode/)).toBeInvalid();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("treats a postcode of only spaces as missing", async () => {
    renderRegister();
    await fillRequired({ postcode: "   " });
    await save();

    expect(await screen.findByRole("alert")).toHaveTextContent(/enter a postcode/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("asks for a gender before saving", async () => {
    renderRegister();
    await userEvent.type(screen.getByLabelText(/^Name/), "Alex Smith");
    await userEvent.type(screen.getByLabelText(/^Postcode/), "3021");
    await save();

    expect(await screen.findByRole("alert")).toHaveTextContent("Please select a gender.");
    expect(fetch).not.toHaveBeenCalled();
  });

  it('saves with the default postcode from "No postcode" and opens the new profile', async () => {
    const guest = makeGuest({ postcode: "3012" });
    mockApi({ status: 201, body: guest });
    renderRegister();

    await fillRequired();
    await userEvent.click(screen.getByRole("button", { name: "No postcode" }));
    expect(screen.getByLabelText(/^Postcode/)).toHaveValue("3012");
    await save();

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(`/guests/${guest.id}`));
    expect(fetchCall(0)).toEqual({
      method: "POST",
      path: "/api/guests",
      body: { displayName: "Alex Smith", gender: "woman", postcode: "3012" },
    });
  });

  it("warns about a possible duplicate, then registers anyway on request", async () => {
    const existing = { ...makeGuest({ id: "22222222-2222-4222-8222-222222222222" }), matchedOn: ["name", "postcode"] };
    const created = makeGuest();
    mockApi(
      { status: 409, body: { error: "This guest may already be registered", duplicates: [existing] } },
      { status: 201, body: created },
    );
    renderRegister();

    await fillRequired({ postcode: "3021" });
    await save();

    expect(await screen.findByText("Matches: name, postcode")).toBeInTheDocument();
    // Hidden (Tailwind's `hidden`, not loaded here) and disabled while the warning shows.
    expect(screen.getByRole("button", { name: "Save guest" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /register anyway/ }));

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(`/guests/${created.id}`));
    expect(fetchCall(1).path).toBe("/api/guests?allowDuplicate=true");
  });

  it("drops the duplicate warning when a compared field is edited", async () => {
    const existing = { ...makeGuest(), matchedOn: ["name", "postcode"] };
    mockApi({ status: 409, body: { error: "duplicate", duplicates: [existing] } });
    renderRegister();

    await fillRequired({ postcode: "3021" });
    await save();
    expect(await screen.findByText("Matches: name, postcode")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/^Postcode/), "5");
    expect(screen.queryByText("Matches: name, postcode")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save guest" })).toBeEnabled();
  });

  it("shows an error when saving fails", async () => {
    mockApi({ status: 500, body: { error: "boom" } });
    renderRegister();

    await fillRequired({ postcode: "3021" });
    await save();

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save this guest. Try again.");
  });
});
