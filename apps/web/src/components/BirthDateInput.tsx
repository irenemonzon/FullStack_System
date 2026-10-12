import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { enAU } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { format, parse } from "date-fns";
import { BIRTH_DATE_FORMAT, EARLIEST_BIRTH_DATE, parseBirthDate } from "../lib/date";
import { CalendarIcon } from "./icons";
import { input } from "../lib/ui";

// Keeps typed input in DD/MM/YYYY shape: digits only, slashes inserted
// automatically, so volunteers never have to type them.
function maskDDMMYYYY(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

// Birth date field: type DD/MM/YYYY, or pick from a calendar with month and
// year dropdowns (a birth date is usually decades back, so paging month by
// month would be impractical). `value` is the DD/MM/YYYY text the parent
// validates with parseBirthDate on submit.
export default function BirthDateInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const iso = parseBirthDate(value);
  const selected = iso ? parse(iso, "yyyy-MM-dd", new Date()) : undefined;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(maskDDMMYYYY(e.target.value))}
        placeholder="DD/MM/YYYY"
        inputMode="numeric"
        autoComplete="off"
        className={`${input} pr-12`}
      />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Choose birth date from calendar"
        aria-expanded={open}
        className="absolute right-2 top-1/2 mt-0.5 -translate-y-1/2 rounded-lg p-2 text-neutral-500 transition hover:bg-brand-50 hover:text-brand-700"
      >
        <CalendarIcon />
      </button>

      {open && (
        <div className="birth-date-picker absolute left-0 z-30 mt-2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-lg">
          <DayPicker
            mode="single"
            locale={enAU}
            captionLayout="dropdown"
            startMonth={EARLIEST_BIRTH_DATE}
            endMonth={new Date()}
            disabled={{ after: new Date() }}
            defaultMonth={selected ?? new Date(1990, 0)}
            selected={selected}
            onSelect={(date) => {
              if (!date) return;
              onChange(format(date, BIRTH_DATE_FORMAT));
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
