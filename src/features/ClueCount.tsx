import { useEffect, useId, useRef, useState } from "react";
import { GameIcon } from "./GameIcon";

const counts = [...Array.from({ length: 10 }, (_, count) => String(count)), "unlimited"];
const label = (value: string) => (value === "unlimited" ? "Unlimited" : value);

export function ClueCount({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (!open) return;
    options.current[counts.indexOf(value)]?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, value]);
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <div ref={root} className="count-picker">
      <button
        ref={trigger}
        className="count-trigger"
        type="button"
        disabled={disabled}
        aria-label={`Clue count: ${label(value)}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span>{value === "unlimited" ? "∞" : value}</span>
        <GameIcon kind="chevron" />
      </button>
      {open && (
        <div
          id={id}
          className="count-options"
          role="listbox"
          aria-label="Clue count"
          onKeyDown={(event) => {
            const index = options.current.indexOf(document.activeElement as HTMLButtonElement);
            const step =
              event.key === "ArrowRight" || event.key === "ArrowDown"
                ? 1
                : event.key === "ArrowLeft" || event.key === "ArrowUp"
                  ? -1
                  : 0;
            if (step || event.key === "Home" || event.key === "End") {
              event.preventDefault();
              options.current[
                event.key === "Home" ? 0 : event.key === "End" ? 10 : (index + step + 11) % 11
              ]?.focus();
            } else if (event.key === "Escape") {
              event.preventDefault();
              close();
            } else if (event.key === "Tab") close();
          }}
        >
          {counts.map((count, index) => (
            <button
              key={count}
              type="button"
              role="option"
              aria-label={label(count)}
              aria-selected={count === value}
              tabIndex={count === value ? 0 : -1}
              ref={(element) => {
                options.current[index] = element;
              }}
              onClick={() => {
                onChange(count);
                close();
              }}
            >
              {count === "unlimited" ? "∞" : count}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
