import React from "react";

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export type DayName = typeof DAYS[number];

export interface OpeningHoursDay {
  day: DayName;
  is_open: boolean;
  start: string | null;
  end: string | null;
}

export const defaultSchedule = (): OpeningHoursDay[] => DAYS.map((day, index) => ({
  day,
  is_open: index < 5,
  start: index < 5 ? "09:00" : null,
  end: index < 5 ? "17:00" : null,
}));

const TIMES = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2).toString().padStart(2, "0");
  return `${hours}:${index % 2 ? "30" : "00"}`;
});

const formatTime = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
};

export const scheduleErrors = (schedule: OpeningHoursDay[]) => Object.fromEntries(
  schedule
    .filter((item) => item.is_open && (!item.start || !item.end || item.start >= item.end))
    .map((item) => [item.day, "Closing time must be later than opening time."])
);

interface Props {
  value: OpeningHoursDay[];
  onChange: (value: OpeningHoursDay[]) => void;
  errors?: Record<string, string>;
}

export const OpeningHoursEditor: React.FC<Props> = ({ value, onChange, errors = {} }) => {
  const update = (day: DayName, changes: Partial<OpeningHoursDay>) => {
    onChange(value.map((item) => item.day === day ? { ...item, ...changes } : item));
  };

  const copyMonday = () => {
    const monday = value[0];
    onChange(value.map((item, index) => index < 5 ? { ...item, is_open: monday.is_open, start: monday.start, end: monday.end } : item));
  };

  const markWeekdaysOpen = () => {
    onChange(value.map((item, index) => index < 5 ? { ...item, is_open: true, start: item.start || "09:00", end: item.end || "17:00" } : item));
  };

  return (
    <fieldset>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <legend className="text-base font-bold text-[#12201e]">Weekly opening hours</legend>
          <p className="mt-1 text-sm text-[#60706a]">Choose 30-minute time slots. Closed days do not require times.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={markWeekdaysOpen}>Open weekdays</button>
          <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={copyMonday}>Copy Monday to weekdays</button>
        </div>
      </div>

      <div className="divide-y divide-[#e6e8e1] rounded-xl border border-[#dce3df]">
        {value.map((item) => (
          <div key={item.day} className="grid gap-3 p-3 sm:grid-cols-[7rem_6rem_1fr_1rem_1fr] sm:items-center">
            <span className="font-semibold text-[#24332e]">{item.day}</span>
            <label className="flex min-h-[40px] items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={item.is_open}
                onChange={(event) => update(item.day, {
                  is_open: event.target.checked,
                  start: event.target.checked ? item.start || "09:00" : null,
                  end: event.target.checked ? item.end || "17:00" : null,
                })}
              />
              {item.is_open ? "Open" : "Closed"}
            </label>
            {item.is_open ? (
              <>
                <label className="text-xs font-semibold text-[#53665e] sm:sr-only" htmlFor={`${item.day}-start`}>Opens</label>
                <select id={`${item.day}-start`} className="field w-full" value={item.start || "09:00"} onChange={(event) => update(item.day, { start: event.target.value })}>
                  {TIMES.map((time) => <option key={time} value={time}>{formatTime(time)}</option>)}
                </select>
                <span className="hidden text-center text-[#718079] sm:block" aria-hidden="true">→</span>
                <label className="text-xs font-semibold text-[#53665e] sm:sr-only" htmlFor={`${item.day}-end`}>Closes</label>
                <select id={`${item.day}-end`} className="field w-full" value={item.end || "17:00"} onChange={(event) => update(item.day, { end: event.target.value })}>
                  {TIMES.map((time) => <option key={time} value={time}>{formatTime(time)}</option>)}
                </select>
              </>
            ) : <span className="text-sm text-[#718079] sm:col-span-3">Not accepting appointments</span>}
            {errors[item.day] && <p role="alert" className="text-sm text-red-700 sm:col-start-3 sm:col-span-3">{errors[item.day]}</p>}
          </div>
        ))}
      </div>
    </fieldset>
  );
};
