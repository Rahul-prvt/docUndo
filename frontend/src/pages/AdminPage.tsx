import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Modal, Feedback } from "../components/ui";
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
        setError("The verification service is temporarily unavailable. Please try again later.");
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
    if (clean === adminKey) void fetchPendingDoctors(clean);
  };

  const handleClearKey = () => {
    localStorage.removeItem("admin_key");
    setAdminKey("");
    setInputKey("");
    setDoctors([]);
    setIsKeyPromptOpen(true);
    setError(null);
    setStatusMsg(null);
  };

  const handleConfirmVerification = async () => {
    if (!noteModal) return;
    const { doctor, verified } = noteModal;
    const doctorId = doctor.id;

    setActionLoading((prev) => ({ ...prev, [doctorId]: true }));

    try {
      await adminApi.verifyDoctor(doctorId, verified, noteText.trim() || undefined, adminKey);
      setStatusMsg({
        text: verified
          ? `✓ ${doctor.name} was successfully verified.`
          : `${doctor.name} was rejected.`,
        type: "success",
      });
      setNoteModal(null);
      setNoteText("");
      // Remove from list
      setDoctors((prev) => prev.filter((d) => d.id !== doctorId));
    } catch (err: any) {
      setNoteModal(null);
      setStatusMsg({
        text: err.response?.data?.detail || `Failed to update Dr. ${doctor.name}.`,
        type: "error",
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [doctorId]: false }));
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
    <div className="page-container">
      <div className="mx-auto max-w-6xl">
        {/* Header Breadcrumb / Navigation */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="brand-mark">D</span>
              <h1 className="text-2xl font-bold tracking-tight text-[#12201e]">
                Doctor verification
              </h1>
              <span className="rounded-full bg-[#e6e8e1] px-2.5 py-0.5 text-xs font-semibold text-[#53615c]">
                Admin
              </span>
            </div>
            <p className="mt-1 text-sm text-[#718079]">
              Review medical licenses and manage registration decisions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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
            role={statusMsg.type === "error" ? "alert" : "status"}
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

        <Modal open={isKeyPromptOpen} onOpenChange={setIsKeyPromptOpen} title="Admin access" description="Enter your administrator key to review the verification queue.">
          {error && <Feedback>{error}</Feedback>}
          <form onSubmit={handleSaveKey} className="mt-4 space-y-4">
            <div><label htmlFor="admin-key" className="field-label">Administrator key</label><input id="admin-key" type="password" autoComplete="off" className="field" value={inputKey} onChange={e => setInputKey(e.target.value)} required /></div>
            <button type="submit" disabled={loading || !inputKey.trim()} className="btn-primary w-full">{loading ? 'Checking access…' : 'Open verification queue'}</button>
            <Link to="/" className="btn-ghost w-full">Return to doctor search</Link>
          </form>
        </Modal>
        <Modal open={!!noteModal} onOpenChange={open => { if (!open && !Object.values(actionLoading).some(Boolean)) { setNoteModal(null); setNoteText(''); } }} title={noteModal?.verified ? 'Approve registration' : 'Reject registration'} description={noteModal ? `Review ${noteModal.doctor.name} · License ${noteModal.doctor.license_no}` : undefined}>
          <label htmlFor="admin-notes" className="field-label">Internal notes (optional)</label>
          <textarea id="admin-notes" className="field" rows={3} value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Record the reason for your decision" />
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button disabled={Object.values(actionLoading).some(Boolean)} onClick={() => { setNoteModal(null); setNoteText(''); }} className="btn-secondary">Cancel</button>
            <button disabled={Object.values(actionLoading).some(Boolean)} onClick={handleConfirmVerification} className={noteModal?.verified ? 'btn-primary' : 'btn-danger'}>{Object.values(actionLoading).some(Boolean) ? 'Saving…' : noteModal?.verified ? 'Approve registration' : 'Reject registration'}</button>
          </div>
        </Modal>

        {error && !isKeyPromptOpen && <div className="mb-5"><Feedback>{error}<button onClick={() => void fetchPendingDoctors()} className="btn-secondary mt-3 block">Try again</button></Feedback></div>}
        {!adminKey && !isKeyPromptOpen && <div className="panel empty-state"><h2 className="text-lg font-bold">Console locked</h2><button onClick={() => setIsKeyPromptOpen(true)} className="btn-primary mt-4">Enter administrator key</button></div>}
        {adminKey && !error && <>
        {/* Summary Stats & Search */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#e6e8e1] bg-white p-5 shadow-sm">
            <p className="eyebrow text-[#718079]">Pending Approvals</p>
            <p className="mt-2 text-3xl font-extrabold text-[#12201e]">{doctors.length}</p>
            <p className="mt-1 text-xs text-[#718079]">Awaiting license verification</p>
          </div>

          <div className="sm:col-span-2 rounded-2xl border border-[#e6e8e1] bg-white p-5 shadow-sm flex flex-col justify-center">
            <label htmlFor="queue-filter" className="field-label">Search verification queue</label>
            <div className="relative">
              <input
                id="queue-filter" type="search"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search by name, license number, specialty, or email..."
                className="field pr-12"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter("")}
                  aria-label="Clear search" className="btn-ghost absolute right-0 top-0 w-11 px-0"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Queue List */}
        {loading && doctors.length === 0 ? (
          <div role="status" className="panel empty-state">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#12201e] border-t-transparent" />
            <p className="text-sm font-semibold text-[#53615c]">Fetching pending verifications...</p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="rounded-2xl border border-[#e6e8e1] bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eefaf4] text-2xl">
              ✓
            </div>
            <h3 className="text-base font-bold text-[#12201e]">{searchFilter ? "No matching registrations" : "Queue up to date"}</h3>
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
          <div className="overflow-hidden rounded-xl border border-[#dce3df] bg-white divide-y divide-[#dce3df]">
            {filteredDoctors.map((doc) => {
              const isActioning = actionLoading[doc.id];
              return (
                <div
                  key={doc.id}
                  className="flex flex-col justify-between gap-4 p-5 hover:bg-[#f8faf9] xl:flex-row xl:items-center"
                >
                  {/* Doctor Info */}
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-[#12201e]">
                        {doc.name}
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
                            className="break-all underline hover:text-[#12201e]"
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
                      className="btn-danger"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => setNoteModal({ doctor: doc, verified: true })}
                      disabled={isActioning}
                      className="btn-primary"
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
        </>}
      </div>
    </div>
  );
}
