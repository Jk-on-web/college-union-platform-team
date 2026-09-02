/**
 * RequestDepartmentModal
 * ─────────────────────
 * Lightweight modal that lets a student request a missing department.
 * Calls academicsService.requestNewDepartment() and shows a toast on success.
 *
 * Props:
 *   onClose  () => void          — close without submitting
 *   onSuccess (data) => void     — called after successful submission
 *   notify   (msg: string) => void  — toast function from outlet context
 */
import React, { useState, useEffect, useRef } from "react";
import { X, AlertCircle, Loader, PlusCircle } from "lucide-react";
import { academicsService } from "../../../services/api/academicsService";

export default function RequestDepartmentModal({ onClose, onSuccess, notify }) {
  const [name,       setName]       = useState("");
  const [code,       setCode]       = useState("");
  const [reason,     setReason]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState(null);

  const nameRef = useRef(null);

  // Focus the name field when modal opens
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError("Department name is required."); return; }
    if (!code.trim()) { setError("Department code is required (e.g. CSE, ECE, ME)."); return; }

    setSubmitting(true);
    try {
      const res = await academicsService.requestNewDepartment({
        name:   name.trim(),
        code:   code.trim().toUpperCase(),
        reason: reason.trim(),
      });

      if (res.ok) {
        notify("Department requested! It will appear once approved by an admin.");
        onSuccess?.(res.data);
        onClose();
      } else {
        setError(res.error || "Submission failed. Please try again.");
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    /* ── Backdrop ─────────────────────────────────────────────────────── */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="req-dept-title"
      style={{
        position:        "fixed",
        inset:           0,
        zIndex:          1000,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        padding:         "20px",
        background:      "rgba(0,0,0,0.45)",
        backdropFilter:  "blur(4px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── Panel ─────────────────────────────────────────────────────── */}
      <div
        style={{
          background:   "#fff",
          borderRadius: "16px",
          width:        "100%",
          maxWidth:     "440px",
          boxShadow:    "0 24px 60px rgba(0,0,0,0.18)",
          overflow:     "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            padding:        "18px 22px 14px",
            borderBottom:   "1px solid var(--line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <PlusCircle size={18} color="var(--brand)" />
            <h3 id="req-dept-title" style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
              Request a Department
            </h3>
          </div>
          <button
            className="textbtn"
            style={{ padding: "4px", borderRadius: "6px" }}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} noValidate style={{ padding: "20px 22px 24px" }}>
          <p style={{ margin: "0 0 16px", fontSize: "11px", color: "var(--muted)", lineHeight: 1.6 }}>
            Don't see your department in the list? Submit a request and an admin will
            review and add it. You'll be able to upload materials once it's approved.
          </p>

          {/* Department name */}
          <label style={{ display: "block", marginBottom: "13px" }}>
            <span style={{ display: "block", fontSize: "11px", fontWeight: 700, marginBottom: "5px", color: "var(--ink)" }}>
              Department Name *
            </span>
            <input
              ref={nameRef}
              type="text"
              placeholder="e.g. Information Technology"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              style={{
                display:      "block",
                width:        "100%",
                padding:      "9px 11px",
                border:       "1px solid var(--line)",
                borderRadius: "8px",
                fontSize:     "12px",
                background:   submitting ? "#f9fafb" : "#fff",
                boxSizing:    "border-box",
              }}
            />
          </label>

          {/* Department code */}
          <label style={{ display: "block", marginBottom: "13px" }}>
            <span style={{ display: "block", fontSize: "11px", fontWeight: 700, marginBottom: "5px", color: "var(--ink)" }}>
              Department Code *
            </span>
            <input
              type="text"
              placeholder="e.g. IT, BCA, BBA"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={8}
              disabled={submitting}
              style={{
                display:      "block",
                width:        "100%",
                padding:      "9px 11px",
                border:       "1px solid var(--line)",
                borderRadius: "8px",
                fontSize:     "12px",
                textTransform:"uppercase",
                background:   submitting ? "#f9fafb" : "#fff",
                boxSizing:    "border-box",
              }}
            />
          </label>

          {/* Reason (optional) */}
          <label style={{ display: "block", marginBottom: "16px" }}>
            <span style={{ display: "block", fontSize: "11px", fontWeight: 700, marginBottom: "5px", color: "var(--ink)" }}>
              Reason <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span>
            </span>
            <textarea
              placeholder="Why should this department be added? Briefly describe…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              rows={3}
              style={{
                display:      "block",
                width:        "100%",
                padding:      "9px 11px",
                border:       "1px solid var(--line)",
                borderRadius: "8px",
                fontSize:     "12px",
                resize:       "vertical",
                fontFamily:   "inherit",
                background:   submitting ? "#f9fafb" : "#fff",
                boxSizing:    "border-box",
              }}
            />
          </label>

          {/* Error */}
          {error && (
            <div
              role="alert"
              style={{
                display:      "flex",
                alignItems:   "flex-start",
                gap:          "7px",
                padding:      "9px 12px",
                borderRadius: "8px",
                background:   "var(--redbg, #fff5f5)",
                border:       "1px solid #fca5a5",
                color:        "var(--red, #dc2626)",
                fontSize:     "11px",
                marginBottom: "14px",
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: "1px" }} />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="outline small"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary small"
              disabled={submitting}
              style={{ minWidth: "120px" }}
            >
              {submitting ? (
                <>
                  <Loader size={12} style={{ animation: "spin 1s linear infinite" }} />
                  Submitting…
                </>
              ) : (
                "Submit Request"
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
