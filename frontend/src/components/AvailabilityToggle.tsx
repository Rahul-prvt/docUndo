import React, { useState } from "react";
import { doctorApi } from "../lib/api";
import { Feedback } from './ui';

interface AvailabilityToggleProps {
  initialAvailable: boolean;
  active?: boolean;
  onChange?: (available: boolean) => void;
}

export const AvailabilityToggle: React.FC<AvailabilityToggleProps> = ({
  initialAvailable,
  active = true,
  onChange,
}) => {
  const [available, setAvailable] = useState(initialAvailable);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = async () => {
    setSaving(true);
    setError('');
    try {
      const next = !available;
      await doctorApi.toggleAvailability(next);
      setAvailable(next);
      onChange?.(next);
    } catch {
      setError('Availability could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-sm"><button
      id="availability-toggle"
      onClick={toggle}
      disabled={saving || !active}
      aria-pressed={available}
      title={!active ? "Verification is required before going live" : available ? "You are live for patients — click to go offline" : "Click to show that you are live now"}
      className={`flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
        available
          ? "bg-[#e8f4ec] text-[#22603d] hover:bg-[#d7ebdf]"
          : "bg-[#e6e8e1] text-[#718079] hover:bg-[#d5d9d2]"
      } disabled:opacity-50`}
    >
      <span
        className={`h-2 w-2 rounded-full ${available ? "bg-[#23634e]" : "bg-[#718079]"}`}
      />
      {saving ? "Saving…" : !active ? "Verification pending" : available ? "Live now" : "Go live"}
    </button>
    {error && <div className="mt-2"><Feedback>{error}</Feedback></div>}</div>
  );
};
