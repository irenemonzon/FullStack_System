import { formatBirthDate, formatRelativeTime, parseBirthDate } from "../lib/date";

describe("parseBirthDate", () => {
  it("converts DD/MM/YYYY to ISO", () => {
    expect(parseBirthDate("05/09/1985")).toBe("1985-09-05");
    expect(parseBirthDate(" 05/09/1985 ")).toBe("1985-09-05");
  });

  it("rejects dates that don't exist instead of rolling them over", () => {
    expect(parseBirthDate("31/02/1990")).toBeUndefined();
  });

  it("rejects the wrong format, future dates and dates before 1900", () => {
    expect(parseBirthDate("5/9/1985")).toBeUndefined();
    expect(parseBirthDate("1985-09-05")).toBeUndefined();
    expect(parseBirthDate(`01/01/${new Date().getFullYear() + 1}`)).toBeUndefined();
    expect(parseBirthDate("31/12/1899")).toBeUndefined();
  });
});

describe("formatBirthDate", () => {
  it("shows an ISO date as DD/MM/YYYY", () => {
    expect(formatBirthDate("1985-09-05")).toBe("05/09/1985");
  });
});

describe("formatRelativeTime", () => {
  const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  it("describes how long ago the last visit was", () => {
    expect(formatRelativeTime(null)).toBe("no previous visits");
    expect(formatRelativeTime(daysAgo(0))).toBe("last visit today");
    expect(formatRelativeTime(daysAgo(1))).toBe("last visit 1 day ago");
    expect(formatRelativeTime(daysAgo(5))).toBe("last visit 5 days ago");
    expect(formatRelativeTime(daysAgo(21))).toBe("last visit 3 wks ago");
    expect(formatRelativeTime(daysAgo(90))).toBe("last visit 3 mo ago");
  });
});
