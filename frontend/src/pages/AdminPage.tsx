import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../lib/api";

interface PendingDoctor {
  id: string;
  name: string;
  specialty: string;
  license_no: string;
  email?: string;
  created_at: string;
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState<string>(
    () => localStorage.getItem("admin_key") || ""
  );
  const [inputKey, setInputKey] = useState<string>("");
  const [isKeyPromptOpen, setIsKeyPromptOpen] = useState<boolean>(!adminKey);
  const [doctors, setDoctors] = useState<PendingDoctor[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Rejection/Note modal state
  const [noteModal, setNoteModal] = useState<{
    doctor: PendingDoctor;
    verified: boolean;
  } | null>(null);
  const [noteText, setNoteText] = useState<string>("");

  const fetchPendingDoctors = async (keyToUse?: string) => {
    const key = keyToUse ?? adminKey;
    if (!key) {
      setIsKeyPromptOpen(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await adminApi.listPending(key);
      setDoctors(res.data || []);
      setIsKeyPromptOpen(false);
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        setError("Invalid or expired admin key. Please re-enter your key.");
        setIsKeyPromptOpen(true);
      } else if (err.response?.status === 503) {
        setError("Supabase database is not configured on the backend.");
      } else {
        setError(err.response?.data?.detail || "Failed to load pending doctors.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminKey) {
      fetchPendingDoctors(adminKey);
    }
  }, [adminKey]);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputKey.trim();
    if (!clean) return;
    localStorage.setItem("admin_key", clean);
    setAdminKey(clean);
    fetchPendingDoctors(clean);
  };

  const handleClearKey = () => {
    localStorage.removeItem("admin_key");
    setAdminKey("");
    setInputKey("");
    setDoctors([]);
    setIsKeyPromptOpen(true);
  };

  const handleConfirmVerification = async () => {
    if (!noteModal) return;
    const { doctor, verified } = noteModal;
    const doctorId = doctor.id;

    setActionLoading((prev) => ({ ...prev, [doctorId]: true }));
    setNoteModal(null);

    try {
      await adminApi.verifyDoctor(doctorId, verified, noteText.trim() || undefined, adminKey);
      setStatusMsg({
        text: verified
          ? `✓ Dr. ${doctor.name} was successfully verified.`
          : `✕ Dr. ${doctor.name} was rejected.`,
        type: verified ? "success" : "error",
      });
      // Remove from list
      setDoctors((prev) => prev.filter((d) => d.id !== doctorId));
    } catch (err: any) {
      setStatusMsg({
        text: err.response?.data?.detail || `Failed to update Dr. ${doctor.name}.`,
        type: "error",
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [doctorId]: false }));
      setNoteText("");
    }
  };

  const filteredDoctors = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      d.specialty.toLowerCase().includes(searchFilter.toLowerCase()) ||
      d.license_no.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (d.email && d.email.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#f8f9f6] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header Breadcrumb / Navigation */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="brand-mark">D</span>
              <h1 className="text-2xl font-bold tracking-tight text-[#12201e]">
                Doctor Verification Console
              </h1>
              <span className="rounded-full bg-[#e6e8e1] px-2.5 py-0.5 text-xs font-semibold text-[#53615c]">
                Admin
              </span>
            </div>
            <p className="mt-1 text-sm text-[#718079]">
              Review submitted medical licenses and approve doctors to appear in public search.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/" className="btn-secondary text-xs">
              ← Public App
            </Link>
            {adminKey && (
              <button
                onClick={handleClearKey}
                className="rounded-xl border border-[#e6e8e1] bg-white px-3 py-2 text-xs font-semibold text-[#718079] hover:text-[#12201e]"
                title="Log out of admin"
              >
                Lock Console
              </button>
            )}
            <button
              onClick={() => fetchPendingDoctors()}
              disabled={loading}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <svg
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Status banner */}
        {statusMsg && (
          <div
            className={`mb-6 flex items-center justify-between rounded-xl p-4 text-sm font-medium ${
              statusMsg.type === "success"
                ? "border border-[#8ad1af] bg-[#eefaf4] text-[#0f5b3a]"
                : "border border-[#f4b6b6] bg-[#fdf2f2] text-[#9c2121]"
            }`}
          >
            <span>{statusMsg.text}</span>
            <button
              onClick={() => setStatusMsg(null)}
              className="ml-4 text-xs font-bold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Admin Key Modal / Prompt */}
        {isKeyPromptOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-[#e6e8e1] bg-white p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e6e8e1] text-lg">
                  🔐
                </div>
                <div>
                  <h3 className="font-bold text-[#12201e]">Admin Access Required</h3>
                  <p className="text-xs text-[#718079]">
                    Enter the secret key configured in your backend environment.
                  </p>
                </div>
              </div>

              {error && (
                <p className="mb-4 rounded-lg bg-[#fdf2f2] p-2.5 text-xs font-medium text-[#9c2121]">
                  {error}
                </p>
              )}

              <form onSubmit={handleSaveKey} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#53615c] mb-1">
                    Admin Secret Key
                  </label>
                  <input
                    type="password"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="Enter admin secret key"
                    className="w-full rounded-xl border border-[#d7dbd3] px-3 py-2 text-sm focus:border-[#12201e] focus:outline-none"
                    required
                  />
                  <p className="mt-1 text-[11px] text-[#718079]">
                    Default dev key: <code className="bg-[#f0f2eb] px-1 rounded">change-me-in-production</code>
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!inputKey.trim()}
                    className="btn-primary w-full text-center"
                  >
                    Authenticate Console
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Verification Note Modal */}
        {noteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-[#e6e8e1] bg-white p-6 shadow-2xl">
              <h3 className="text-base font-bold text-[#12201e] mb-1">
                {noteModal.verified ? "Approve Doctor Registration" : "Reject Doctor Registration"}
              </h3>
              <p className="text-xs text-[#718079] mb-4">
                Confirm action for <strong>Dr. {noteModal.doctor.name}</strong> (License:{" "}
                {noteModal.doctor.license_no}).
              </p>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-[#53615c] mb-1">
                  Admin Internal Notes (Optional)
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={
                    noteModal.verified
                      ? "e.g., Medical Council registration verified via official portal on 2026-09."
                      : "e.g., Invalid license number or unverified qualification."
                  }
                  rows={3}
                  className="w-full rounded-xl border border-[#d7dbd3] p-3 text-sm focus:border-[#12201e] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNoteModal(null);
                    setNoteText("");
                  }}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVerification}
                  className={`rounded-xl px-4 py-2 text-xs font-bold text-white transition ${
                    noteModal.verified
                      ? "bg-[#146b44] hover:bg-[#0f5b3a]"
                      : "bg-[#be2828] hover:bg-[#9c2121]"
                  }`}
                >
                  Confirm {noteModal.verified ? "Approval" : "Rejection"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats & Search */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#e6e8e1] bg-white p-5 shadow-sm">
            <p className="eyebrow text-[#718079]">Pending Approvals</p>
            <p className="mt-2 text-3xl font-extrabold text-[#12201e]">{doctors.length}</p>
            <p className="mt-1 text-xs text-[#718079]">Awaiting license verification</p>
          </div>

          <div className="sm:col-span-2 rounded-2xl border border-[#e6e8e1] bg-white p-5 shadow-sm flex flex-col justify-center">
            <label className="eyebrow text-[#718079] mb-2">Filter Queue</label>
            <div className="relative">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search by name, license number, specialty, or email..."
                className="w-full rounded-xl border border-[#d7dbd3] bg-[#f8f9f6] px-4 py-2.5 text-sm focus:border-[#12201e] focus:bg-white focus:outline-none"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter("")}
                  className="absolute right-3 top-2.5 text-xs text-[#718079] hover:text-[#12201e]"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Queue List */}
        {loading && doctors.length === 0 ? (
          <div className="rounded-2xl border border-[#e6e8e1] bg-white p-12 text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#12201e] border-t-transparent" />
            <p className="text-sm font-semibold text-[#53615c]">Fetching pending verifications...</p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="rounded-2xl border border-[#e6e8e1] bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eefaf4] text-2xl">
              🎉
            </div>
            <h3 className="text-base font-bold text-[#12201e]">All Clear!</h3>
            <p className="mt-1 text-sm text-[#718079]">
              {searchFilter
                ? "No pending doctors match your search filter."
                : "There are currently no doctors waiting for license verification."}
            </p>
            {searchFilter && (
              <button
                onClick={() => setSearchFilter("")}
                className="btn-secondary mt-4 text-xs"
              >
                Clear Filter
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDoctors.map((doc) => {
              const isActioning = actionLoading[doc.id];
              return (
                <div
                  key={doc.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-[#e6e8e1] bg-white p-5 shadow-sm transition hover:shadow-md md:flex-row md:items-center"
                >
                  {/* Doctor Info */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-[#12201e]">
                        Dr. {doc.name}
                      </h3>
                      <span className="rounded-full bg-[#12201e] px-2.5 py-0.5 text-xs font-semibold text-white">
                        {doc.specialty}
                      </span>
                      <span className="rounded-full bg-[#fdf5e6] border border-[#fae2b6] px-2.5 py-0.5 text-xs font-semibold text-[#8f5b00]">
                        ⏳ Pending Review
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-[#53615c] sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <span className="font-semibold text-[#718079]">License No: </span>
                        <code className="rounded bg-[#f0f2eb] px-1.5 py-0.5 font-mono font-bold text-[#12201e]">
                          {doc.license_no}
                        </code>
                      </div>
                      {doc.email && (
                        <div>
                          <span className="font-semibold text-[#718079]">Email: </span>
                          <a
                            href={`mailto:${doc.email}`}
                            className="underline hover:text-[#12201e]"
                          >
                            {doc.email}
                          </a>
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-[#718079]">Registered: </span>
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => setNoteModal({ doctor: doc, verified: false })}
                      disabled={isActioning}
                      className="rounded-xl border border-[#f4b6b6] bg-white px-3.5 py-2 text-xs font-bold text-[#9c2121] hover:bg-[#fdf2f2] transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => setNoteModal({ doctor: doc, verified: true })}
                      disabled={isActioning}
                      className="rounded-xl bg-[#146b44] px-4 py-2 text-xs font-bold text-white hover:bg-[#0f5b3a] transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isActioning ? (
                        <span>Saving...</span>
                      ) : (
                        <>
                          <span>✓</span> Approve License
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
