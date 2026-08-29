import React, { useState } from "react";
import { doctorApi } from "../lib/api";

interface AvailabilityToggleProps {
  doctorId: string;
  initialAvailable: boolean;
}

export const AvailabilityToggle: React.FC<AvailabilityToggleProps> = ({
  initialAvailable,
}) => {
  const [available, setAvailable] = useState(initialAvailable);
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    setSaving(true);
    try {
      const next = !available;
      await doctorApi.toggleAvailability(next);
      setAvailable(next);
    } catch {
      // silently swallow — could add a toast here
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      id="availability-toggle"
      onClick={toggle}
      disabled={saving}
      title={available ? "You are visible to patients — click to go offline" : "Click to appear in patient search"}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 ${
        available
          ? "bg-[#e5f5c4] text-[#355b22] hover:bg-[#d2f09a]"
          : "bg-[#e6e8e1] text-[#718079] hover:bg-[#d5d9d2]"
      } disabled:opacity-50`}
    >
      <span
        className={`h-2 w-2 rounded-full ${available ? "bg-[#52c41a] animate-pulse" : "bg-[#a8b3ac]"}`}
      />
      {saving ? "Saving…" : available ? "Available now" : "Offline"}
    </button>
  );
};
