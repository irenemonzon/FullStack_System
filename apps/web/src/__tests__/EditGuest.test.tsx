import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditGuest from "../screens/EditGuest";
import { fetchCall, makeGuest, mockApi, renderScreen } from "./utils";

const guest = makeGuest({ phone: "0412 345 678", notes: "Prefers tea" });

function renderEdit() {
  renderScreen(<EditGuest />, { route: "/guests/:guestId/edit", path: `/guests/${guest.id}/edit` });
}

const saveChanges = () => userEvent.click(screen.getByRole("button", { name: "Save changes" }));

describe("Edit guest", () => {
  it("fills the form with the guest's current details", async () => {
    mockApi({ body: guest });
    renderEdit();

    expect(await screen.findByLabelText(/^Name/)).toHaveValue("Alex Smith");
    expect(screen.getByLabelText("Woman")).toBeChecked();
    expect(screen.getByLabelText(/^Postcode/)).toHaveValue("3021");
    expect(screen.getByLabelText("Phone")).toHaveValue("0412 345 678");
    expect(fetchCall(0)).toMatchObject({ method: "GET", path: `/api/guests/${guest.id}` });
  });

  it("won't save with the postcode cleared", async () => {
    mockApi({ body: guest });
    renderEdit();

    await userEvent.clear(await screen.findByLabelText(/^Postcode/));
    await userEvent.type(screen.getByLabelText(/^Postcode/), " ");
    await saveChanges();

    expect(await screen.findByRole("alert")).toHaveTextContent(/enter a postcode/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("asks an older guest without a postcode for one before saving", async () => {
    mockApi({ body: makeGuest({ postcode: null }) }, { body: { ...guest, postcode: "3012", phoneSharedWith: [] } });
    renderEdit();

    await userEvent.click(await screen.findByRole("button", { name: "No postcode" }));
    await saveChanges();

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(`/guests/${guest.id}`));
    expect(fetchCall(1)).toMatchObject({ method: "PATCH", body: { postcode: "3012" } });
  });

  it("sends cleared optional fields as null and returns to the profile", async () => {
    mockApi({ body: guest }, { body: { ...guest, phone: null, phoneSharedWith: [] } });
    renderEdit();

    await userEvent.clear(await screen.findByLabelText("Phone"));
    await saveChanges();

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(`/guests/${guest.id}`));
    expect(fetchCall(1)).toEqual({
      method: "PATCH",
      path: `/api/guests/${guest.id}`,
      body: {
        displayName: "Alex Smith",
        gender: "woman",
        birthDate: null,
        postcode: "3021",
        phone: null,
        preferredLanguage: null,
        dietary: null,
        notes: "Prefers tea",
      },
    });
  });

  it("returns to the profile on cancel without saving", async () => {
    mockApi({ body: guest });
    renderEdit();

    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(screen.getByTestId("location")).toHaveTextContent(`/guests/${guest.id}`);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("says so when the guest can't be found", async () => {
    mockApi({ status: 404, body: { error: "Not found" } });
    renderEdit();

    expect(await screen.findByText("This guest couldn't be found.")).toBeInTheDocument();
  });
});
