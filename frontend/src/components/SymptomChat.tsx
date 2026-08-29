import React, { useState } from "react";
import { triageApi } from "../lib/api";
import { useTranslation } from "../lib/i18n";

interface SymptomChatProps {
  onSpecialtySelected?: (specialty: string, aiAvailable?: boolean) => void;
}

export const SymptomChat: React.FC<SymptomChatProps> = ({ onSpecialtySelected }) => {
  const { t } = useTranslation();
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await triageApi.suggest(symptoms);
      setResult(response.data);
      onSpecialtySelected?.(response.data.suggested_specialty, response.data.ai_available);
    } catch (err: any) {
      setError(err.message || "Failed to get suggestion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-[1.25rem] bg-[#214b41] text-white shadow-xl shadow-[#214b41]/10">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <p className="eyebrow text-[#d5ff78]">{t("symptom.title")}</p>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10">✦</span>
        </div>
        <h3 className="display mt-3 text-2xl leading-tight">{t("search.hero_eyebrow")}</h3>
        <p className="mt-2 text-sm leading-6 text-[#c8d7d0]">{t("symptom.placeholder")}</p>
        <form onSubmit={handleSubmit} className="mt-5">
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder={t("symptom.placeholder")}
            className="min-h-28 w-full resize-none rounded-xl border-0 bg-white/10 p-3 text-sm text-white placeholder:text-[#b8cac1] outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-[#d5ff78]"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !symptoms.trim()}
            className="mt-3 w-full rounded-xl bg-[#d5ff78] px-4 py-3 text-sm font-bold text-[#12201e] transition hover:bg-[#e0ff9a] disabled:opacity-50"
          >
            {loading ? t("symptom.thinking") : t("symptom.analyze") + " →"}
          </button>
        </form>
      </div>

      {result && (
        <div className="border-t border-white/10 bg-black/10 p-5">
          <p className="text-sm font-bold text-[#d5ff78]">
            {t("symptom.suggest")} {result.suggested_specialty}
          </p>
          <p className="mt-2 text-xs leading-5 text-[#c8d7d0]">{t("symptom.disclaimer")}</p>
        </div>
      )}

      {error && (
        <div className="border-t border-red-300/20 bg-red-950/20 p-4 text-sm text-red-100">{error}</div>
      )}
    </section>
  );
};
