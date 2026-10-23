import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GuestFormFields, { emptyGuestForm, readGuestForm, type GuestFormValues } from "../components/GuestFormFields";

const filled: GuestFormValues = { ...emptyGuestForm, displayName: "Alex", gender: "woman", postcode: "3021" };

describe("readGuestForm", () => {
  it("requires a gender", () => {
    expect(readGuestForm({ ...filled, gender: null })).toEqual({ error: "Please select a gender." });
  });

  it("requires a postcode, treating spaces as empty", () => {
    for (const postcode of ["", "   "]) {
      const result = readGuestForm({ ...filled, postcode });
      expect("error" in result && result.error).toMatch(/enter a postcode.*No postcode.*3012/);
    }
  });

  it("rejects a birth date that isn't a real DD/MM/YYYY date", () => {
    expect(readGuestForm({ ...filled, birthDateInput: "31/02/1990" })).toHaveProperty("error");
  });

  it("converts the birth date to ISO and empty optional fields to null", () => {
    expect(readGuestForm({ ...filled, birthDateInput: "05/09/1985" })).toEqual({
      data: {
        displayName: "Alex",
        gender: "woman",
        birthDate: "1985-09-05",
        postcode: "3021",
        phone: null,
        preferredLanguage: null,
        dietary: null,
        notes: null,
      },
    });
  });
});

describe("GuestFormFields", () => {
  it("marks name, gender and postcode as required with *", () => {
    render(<GuestFormFields values={emptyGuestForm} onChange={() => {}} />);

    expect(screen.getByLabelText("Name *")).toBeRequired();
    expect(screen.getByLabelText("Postcode *")).toBeRequired();
    expect(screen.getByRole("group", { name: "Gender *" })).toBeInTheDocument();
    expect(screen.getByLabelText("Phone")).not.toBeRequired();
    expect(screen.queryByText(/\(required\)/)).not.toBeInTheDocument();
  });

  it('fills in 3012 when "No postcode" is tapped', async () => {
    const onChange = jest.fn();
    render(<GuestFormFields values={emptyGuestForm} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "No postcode" }));
    expect(onChange).toHaveBeenCalledWith({ postcode: "3012" });
  });

  it("reports which gender was picked", async () => {
    const onChange = jest.fn();
    render(<GuestFormFields values={emptyGuestForm} onChange={onChange} />);

    await userEvent.click(screen.getByLabelText("Non-binary"));
    expect(onChange).toHaveBeenCalledWith({ gender: "non_binary" });
  });
});
