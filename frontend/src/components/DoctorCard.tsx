import React from "react";
import { useTranslation } from "../lib/i18n";

interface DoctorCardProps {
  doctor: any;
  onClick?: (doctor: any) => void;
  isDetailView?: boolean;
  className?: string;
}

interface StoredHoursDay {
  day?: string;
  is_open?: boolean;
  start?: string | null;
  end?: string | null;
}

const shortDay = (day: string) => day.slice(0, 3);

const displayTime = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
};

export const formatOpeningHours = (value?: string | null) => {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value) as StoredHoursDay[];
    if (!Array.isArray(parsed)) return value;
    const openDays = parsed.filter((item) => item.is_open && item.day && item.start && item.end);
    if (!openDays.length) return "Closed";

    const groups: Array<{ first: string; last: string; start: string; end: string }> = [];
    for (const item of openDays) {
      const previous = groups[groups.length - 1];
      if (previous && previous.start === item.start && previous.end === item.end) {
        previous.last = item.day!;
      } else {
        groups.push({ first: item.day!, last: item.day!, start: item.start!, end: item.end! });
      }
    }
    return groups.map((group) => {
      const days = group.first === group.last ? shortDay(group.first) : `${shortDay(group.first)}–${shortDay(group.last)}`;
      return `${days} ${displayTime(group.start)}–${displayTime(group.end)}`;
    }).join(", ");
  } catch {
    return value;
  }
};

export const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onClick, isDetailView = false, className = "" }) => {
  const { t } = useTranslation();
  const isAvailable = doctor?.available ?? false;
  const specialty = doctor?.specialty || "General Care";
  const address = doctor?.clinic?.address || "Clinic address to be confirmed";
  const distance = doctor?.distance_km != null ? `${doctor.distance_km.toFixed(1)} km` : "Nearby";
  const phone = doctor?.clinic?.phone || null;
  const openingHours = formatOpeningHours(doctor?.clinic?.opening_hours);

  return (
    <article
      className={`group relative overflow-hidden rounded-xl border border-[#dce3df] bg-white ${onClick ? "transition-colors hover:border-[#8fa298] focus-within:border-[#23634e]" : ""} ${className}`}
    >
      <div className="p-5">
        <div className="flex gap-4">
          {/* Avatar */}
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#e8f1ec] text-lg font-bold text-[#23634e]">
            {(doctor?.name || "D").replace("Dr. ", "").charAt(0)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="break-words text-base font-bold">{doctor?.name || "Doctor"}</h3>
                <p className="mt-0.5 text-sm text-[#60706a]">{specialty}</p>
              </div>
              {isAvailable && <span className="badge badge-success"><span className="h-2 w-2 rounded-full bg-[#238452]" />Live</span>}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[#e6e8e1] pt-3 text-xs text-[#65736d]">
              <span className="break-words pr-3 leading-5">{address}</span>
              <strong className="shrink-0 text-[#23634e]">{distance}</strong>
            </div>
          </div>
        </div>
      </div>

      {onClick && <button type="button" onClick={() => onClick(doctor)} className="btn-ghost mx-5 mb-3 px-0 after:absolute after:inset-0" aria-label={`${t('doc.view_profile')}: ${doctor?.name || 'Doctor'}`}>{t('doc.view_profile')} <span aria-hidden="true">→</span></button>}

      {isDetailView && (
        <div className="border-t border-[#e6e8e1] bg-[#f5f7f2] px-5 py-4 space-y-3">
          <p className="text-sm leading-6 text-[#53615c]">
            {doctor?.bio || specialty}
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            {doctor?.consult_fee != null && (
              <div className="inline-flex rounded-lg bg-white px-3 py-2 text-sm font-semibold">
                {t("doc.fee")}: ₹{doctor.consult_fee}
              </div>
            )}
            {phone && (
              <a
                href={`tel:${phone}`}
                onClick={e => e.stopPropagation()}
                className="btn-primary"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.07 3.38 2 2 0 0 1 3.06 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z"/>
                </svg>
                Call clinic
              </a>
            )}
            {phone && (
              <a
                href={`https://wa.me/${phone.replace(/\D/g,'')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="btn-secondary"
              >
                WhatsApp
              </a>
            )}
          </div>
          {doctor?.clinic?.name && <p className="text-sm font-semibold text-[#344b40]">{doctor.clinic.name}</p>}
          {openingHours && <p className="text-sm text-[#53665e]">Hours: {openingHours}</p>}
          {!phone && <p className="text-sm text-[#53665e]">{t('doc.no_phone')}</p>}
        </div>
      )}
    </article>
  );
};

