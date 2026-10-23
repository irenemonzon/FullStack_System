import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DuplicateGuestWarning from "../components/DuplicateGuestWarning";
import { makeGuest } from "./utils";

const duplicate = {
  ...makeGuest({ birthDate: "1985-09-05", phone: "0412 345 678" }),
  matchedOn: ["name" as const, "birthDate" as const],
};

describe("DuplicateGuestWarning", () => {
  it("lists each possible match with its details and what matched", () => {
    render(<DuplicateGuestWarning duplicates={[duplicate]} onOpen={() => {}} onRegisterAnyway={() => {}} registering={false} />);

    expect(screen.getByRole("alert")).toHaveTextContent("This guest may already be registered");
    expect(screen.getByText("Alex Smith")).toBeInTheDocument();
    expect(screen.getByText("05/09/1985 · 3021 · 0412 345 678")).toBeInTheDocument();
    expect(screen.getByText("Matches: name, birth date")).toBeInTheDocument();
  });

  it("opens the existing profile or registers anyway", async () => {
    const onOpen = jest.fn();
    const onRegisterAnyway = jest.fn();
    render(
      <DuplicateGuestWarning duplicates={[duplicate]} onOpen={onOpen} onRegisterAnyway={onRegisterAnyway} registering={false} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Open existing profile" }));
    expect(onOpen).toHaveBeenCalledWith(duplicate.id);

    await userEvent.click(screen.getByRole("button", { name: /register anyway/ }));
    expect(onRegisterAnyway).toHaveBeenCalled();
  });

  it("disables register anyway while saving", () => {
    render(<DuplicateGuestWarning duplicates={[duplicate]} onOpen={() => {}} onRegisterAnyway={() => {}} registering />);
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });
});
