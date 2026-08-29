import React from "react";
import { useTranslation } from "../lib/i18n";

interface DoctorCardProps {
  doctor: any;
  onClick?: (doctor: any) => void;
  isDetailView?: boolean;
  className?: string;
}

export const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onClick, isDetailView = false, className = "" }) => {
  const { t } = useTranslation();
  const isAvailable = doctor?.available ?? true;
  const specialty = doctor?.specialty || "General Care";
  const address = doctor?.clinic?.address || "Clinic address to be confirmed";
  const distance = doctor?.distance_km != null ? `${doctor.distance_km.toFixed(1)} km` : "Nearby";

  return (
    <article
      onClick={() => onClick?.(doctor)}
      className={`group overflow-hidden rounded-2xl border border-[#dce0d9] bg-[#fffefa] ${onClick ? "cursor-pointer transition duration-200 hover:-translate-y-0.5 hover:border-[#8fa298] hover:shadow-lg hover:shadow-[#12201e]/5" : ""} ${className}`}
    >
      <div className="p-5">
        <div className="flex gap-4">
          {/* Avatar */}
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#dceee7] text-lg font-bold text-[#23634e]">
            {(doctor?.name || "D").replace("Dr. ", "").charAt(0)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="truncate text-base font-bold">{doctor?.name || "Doctor"}</h3>
                <p className="mt-0.5 text-sm text-[#60706a]">{specialty}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-[.62rem] font-bold uppercase tracking-wide ${isAvailable ? "bg-[#e5f5c4] text-[#355b22]" : "bg-[#e6e8e1] text-[#718079]"}`}>
                {isAvailable ? t("doc.available") : t("doc.offline")}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[#e6e8e1] pt-3 text-xs text-[#65736d]">
              <span className="truncate pr-3">{address}</span>
              <strong className="shrink-0 text-[#23634e]">{distance}</strong>
            </div>
          </div>
        </div>
      </div>

      {isDetailView && (
        <div className="border-t border-[#e6e8e1] bg-[#f5f7f2] px-5 py-4">
          <p className="text-sm leading-6 text-[#53615c]">
            {doctor?.bio || "A patient-centred practitioner dedicated to clear, thoughtful care."}
          </p>
          {doctor?.consult_fee && (
            <div className="mt-3 inline-flex rounded-lg bg-white px-3 py-2 text-sm font-semibold">
              {t("doc.fee")}: ₹{doctor.consult_fee}
            </div>
          )}
        </div>
      )}
    </article>
  );
};
