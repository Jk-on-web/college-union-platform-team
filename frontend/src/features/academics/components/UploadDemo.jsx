import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload,
  Clock3,
  FileText,
  X,
  AlertCircle,
  CheckCircle2,
  Loader,
  PlusCircle,
} from "lucide-react";
import { Card } from "../../../components/common/PagePrimitives";
import { academicsService } from "../../../services/api/academicsService";
import RequestDepartmentModal from "./RequestDepartmentModal";

// ─── File validation constants ────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

function validateFile(file) {
  if (!file) return { valid: false, reason: "No file selected." };

  const ext = "." + file.name.split(".").pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      reason: `Unsupported format "${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(", ")}.`,
    };
  }

  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      reason: `File type "${file.type}" is not allowed. Upload PDF, DOCX, or PPTX files only.`,
    };
  }

  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      reason: `File is too large (${mb} MB). Maximum allowed size is 25 MB.`,
    };
  }

  return { valid: true };
}

// ─── Upload phase enum ────────────────────────────────────────────────────────
const PHASE = {
  IDLE:      "idle",
  UPLOADING: "uploading",
  SAVING:    "saving",
  SUCCESS:   "success",
  ERROR:     "error",
};

export default function UploadDemo({ notify }) {
  const fileInputRef = useRef(null);

  // ── File state ──────────────────────────────────────────────────────────────
  const [file,          setFile]          = useState(null);
  const [fileError,     setFileError]     = useState(null);

  // ── Form fields ─────────────────────────────────────────────────────────────
  const [title,         setTitle]         = useState("");
  const [description,   setDescription]   = useState("");
  const [subject,       setSubject]       = useState(""); // Custom typed subject
  const [academicYear,  setAcademicYear]  = useState("2025-2026");
  const [materialType,  setMaterialType]  = useState("notes");

  // ── Cascading dropdown data & selection ─────────────────────────────────────
  const [departments,   setDepartments]   = useState([]);
  const [semesters,     setSemesters]     = useState([]);
  const [selectedDept,  setSelectedDept]  = useState("");
  const [selectedSem,   setSelectedSem]   = useState("");

  // ── Submit state ─────────────────────────────────────────────────────────────
  const [phase,         setPhase]         = useState(PHASE.IDLE);
  const [submitError,   setSubmitError]   = useState(null);
  const [successData,   setSuccessData]   = useState(null);

  // ── Department request modal ──────────────────────────────────────────────────
  const [deptModalOpen, setDeptModalOpen] = useState(false);

  const isSubmitting = phase === PHASE.UPLOADING || phase === PHASE.SAVING;

  // ── Boot: load approved departments ────────────────────────────────────────
  const refreshDepartments = useCallback(() => {
    academicsService.getApprovedDepartments().then((res) => {
      if (res.ok && res.data?.length > 0) {
        setDepartments(res.data);
        setSelectedDept((prev) => prev || res.data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    refreshDepartments();
  }, [refreshDepartments]);

  // ── Cascade: semesters ──────────────────────────────────────────────────────
  useEffect(() => {
    setSemesters([]);
    setSelectedSem("");
    if (!selectedDept) return;
    academicsService.getSemesters(selectedDept).then((res) => {
      if (res.ok && res.data?.length > 0) {
        setSemesters(res.data);
        setSelectedSem(res.data[0].id);
      }
    });
  }, [selectedDept]);

  // ── Reset form ──────────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setFile(null);
    setFileError(null);
    setTitle("");
    setDescription("");
    setSubject("");
    setMaterialType("notes");
    setAcademicYear("2025-2026");
    setSubmitError(null);
    setSuccessData(null);
    setPhase(PHASE.IDLE);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // ── File picker handler ─────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const validation = validateFile(selected);
    if (!validation.valid) {
      setFileError(validation.reason);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFileError(null);
    setFile(selected);
    if (!title) {
      setTitle(selected.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
    }
  };

  // ── Drop zone handlers ──────────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;

    const validation = validateFile(dropped);
    if (!validation.valid) {
      setFileError(validation.reason);
      return;
    }
    setFileError(null);
    setFile(dropped);
    if (!title) {
      setTitle(dropped.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setFileError("Please select a study material file to upload.");
      return;
    }
    const validation = validateFile(file);
    if (!validation.valid) {
      setFileError(validation.reason);
      return;
    }

    if (!title.trim()) {
      setSubmitError("Please enter a material title before submitting.");
      return;
    }

    if (!subject.trim()) {
      setSubmitError("Please enter the subject name before submitting.");
      return;
    }

    setSubmitError(null);
    setFileError(null);

    setPhase(PHASE.UPLOADING);

    const formData = new FormData();
    formData.append("file",          file);
    formData.append("title",         title.trim());
    formData.append("description",   description.trim());
    formData.append("department_id", selectedDept);
    formData.append("semester_id",   selectedSem);
    formData.append("subject",       subject.trim());
    formData.append("subject_id",    subject.trim());
    formData.append("material_type", materialType);
    formData.append("academic_year", academicYear);

    try {
      const savingTimer = setTimeout(() => setPhase(PHASE.SAVING), 800);
      const res = await academicsService.uploadMaterial(formData);
      clearTimeout(savingTimer);

      if (res.ok) {
        setPhase(PHASE.SUCCESS);
        setSuccessData(res.data);
        notify("Material submitted for maintainer review ✓");
      } else {
        setPhase(PHASE.ERROR);
        setSubmitError(res.error || "Upload failed. Please try again.");
      }
    } catch (err) {
      setPhase(PHASE.ERROR);
      setSubmitError(err.message || "An unexpected error occurred. Please try again.");
    }
  };

  const materialTypes = academicsService.getMaterialTypes();

  // ─── SUCCESS BANNER ─────────────────────────────────────────────────────────
  if (phase === PHASE.SUCCESS && successData) {
    return (
      <Card className="upload-card">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "14px",
            padding: "36px 20px",
            textAlign: "center",
          }}
        >
          <CheckCircle2 size={52} color="var(--green)" />
          <h3 style={{ margin: "0", fontSize: "17px" }}>Submitted for review!</h3>
          <p style={{ margin: "0", color: "var(--muted)", fontSize: "12px", maxWidth: "380px" }}>
            <strong>{successData.title || title}</strong> has been uploaded and is
            pending approval by an Academic Maintainer. You can track its status under
            the <em>My Uploads</em> tab.
          </p>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", marginTop: "4px" }}>
            {[
              successData.departmentCode || successData.department,
              successData.semesterName   || (successData.semester ? `Sem ${successData.semester}` : ""),
              successData.subject        || subject,
              materialTypes.find((t) => t.id === (successData.type || materialType))?.label || materialType,
              successData.size || (file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : ""),
            ]
              .filter(Boolean)
              .map((label, i) => (
                <span key={i} className="pill">{label}</span>
              ))}
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button className="primary small" onClick={resetForm}>
              Upload another
            </button>
          </div>
        </div>
      </Card>
    );
  }

  // ─── UPLOAD FORM ─────────────────────────────────────────────────────────────
  return (
    <Card className="upload-card">
      <form onSubmit={handleSubmit} noValidate>

        {/* ── Drop / Pick Zone ──────────────────────────────────────────────── */}
        <div
          className="upload-zone"
          style={{
            cursor: isSubmitting ? "not-allowed" : "pointer",
            opacity: isSubmitting ? 0.6 : 1,
            borderColor: fileError ? "var(--red)" : undefined,
          }}
          onClick={() => !isSubmitting && fileInputRef.current?.click()}
          onDrop={!isSubmitting ? handleDrop : undefined}
          onDragOver={!isSubmitting ? handleDragOver : undefined}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter") fileInputRef.current?.click(); }}
          aria-label="Upload zone – click or drag a file here"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.ppt,.pptx"
            style={{ display: "none" }}
            aria-hidden="true"
          />

          {isSubmitting ? (
            <div>
              <Loader size={32} style={{ marginBottom: "10px", animation: "spin 1s linear infinite" }} />
              <h3 style={{ margin: "0 0 4px" }}>
                {phase === PHASE.UPLOADING ? "Uploading file…" : "Saving record…"}
              </h3>
              <p style={{ margin: 0 }}>
                {phase === PHASE.UPLOADING
                  ? "Transferring your file to secure storage."
                  : "Creating the pending review entry in the database."}
              </p>
            </div>
          ) : file ? (
            <div>
              <FileText size={32} style={{ marginBottom: "8px" }} />
              <h3 style={{ margin: "0 0 4px", fontSize: "14px" }}>{file.name}</h3>
              <p style={{ margin: "0 0 12px", fontSize: "11px" }}>
                {(file.size / (1024 * 1024)).toFixed(2)} MB ·{" "}
                {file.name.split(".").pop().toUpperCase()}
              </p>
              <button
                type="button"
                className="outline small"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setFileError(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                <X size={12} /> Change File
              </button>
            </div>
          ) : (
            <div>
              <Upload size={28} />
              <h3 style={{ margin: "9px 0 4px" }}>Upload study material</h3>
              <p style={{ margin: "0 0 13px" }}>
                PDF, PPTX, DOCX · Max 25 MB · Drag or click
              </p>
              <button type="button" className="primary small">
                Choose file
              </button>
            </div>
          )}
        </div>

        {/* ── File validation error ─────────────────────────────────────────── */}
        {fileError && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "7px",
              padding: "10px 13px",
              borderRadius: "9px",
              background: "var(--redbg)",
              border: "1px solid #fca5a5",
              color: "var(--red)",
              fontSize: "11px",
              marginTop: "12px",
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: "1px" }} />
            <span>{fileError}</span>
          </div>
        )}

        {/* ── Metadata form grid ────────────────────────────────────────────── */}
        <div className="formgrid" style={{ marginTop: "20px" }}>

          {/* Title — full width */}
          <label style={{ gridColumn: "span 2" }}>
            Material Title *
            <input
              type="text"
              required
              placeholder="e.g. Data Structures Module 1 – Handwritten Notes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              style={{
                display: "block",
                width: "100%",
                padding: "9px",
                border: `1px solid ${!title.trim() && submitError ? "var(--red)" : "var(--line)"}`,
                borderRadius: "8px",
                marginTop: "5px",
                fontSize: "12px",
                background: isSubmitting ? "#f9fafb" : "#fff",
              }}
            />
          </label>

          {/* Description — full width */}
          <label style={{ gridColumn: "span 2" }}>
            Description
            <input
              type="text"
              placeholder="Brief summary, chapters covered, or exam year…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              style={{
                display: "block",
                width: "100%",
                padding: "9px",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                marginTop: "5px",
                fontSize: "12px",
                background: isSubmitting ? "#f9fafb" : "#fff",
              }}
            />
          </label>

          {/* Department */}
          <div>
            <label>
              Department *
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                disabled={isSubmitting}
              >
                {departments.length === 0 && (
                  <option value="">Loading…</option>
                )}
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="textbtn"
              style={{
                display:    "flex",
                alignItems: "center",
                gap:        "4px",
                fontSize:   "10px",
                marginTop:  "5px",
                padding:    "3px 0",
                color:      "var(--brand)",
              }}
              onClick={() => setDeptModalOpen(true)}
              disabled={isSubmitting}
            >
              <PlusCircle size={11} />
              Can't find your department? Request it
            </button>
          </div>

          {/* Semester */}
          <label>
            Semester *
            <select
              value={selectedSem}
              onChange={(e) => setSelectedSem(e.target.value)}
              disabled={isSubmitting || semesters.length === 0}
            >
              {semesters.length === 0 && (
                <option value="">— Select Department first —</option>
              )}
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          {/* Subject — Typeable Input */}
          <label>
            Subject *
            <input
              type="text"
              required
              placeholder="e.g. Machine Learning, DBMS, Mechanics"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSubmitting}
              style={{
                display: "block",
                width: "100%",
                padding: "9px",
                border: `1px solid ${!subject.trim() && submitError ? "var(--red)" : "var(--line)"}`,
                borderRadius: "8px",
                marginTop: "5px",
                fontSize: "12px",
                background: isSubmitting ? "#f9fafb" : "#fff",
              }}
            />
          </label>

          {/* Material type */}
          <label>
            Material Type *
            <select
              value={materialType}
              onChange={(e) => setMaterialType(e.target.value)}
              disabled={isSubmitting}
            >
              {materialTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

        </div>

        {/* ── Submission error ──────────────────────────────────────────────── */}
        {phase === PHASE.ERROR && submitError && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "7px",
              padding: "10px 13px",
              borderRadius: "9px",
              background: "var(--redbg)",
              border: "1px solid #fca5a5",
              color: "var(--red)",
              fontSize: "11px",
              margin: "4px 0 14px",
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: "1px" }} />
            <span>{submitError}</span>
          </div>
        )}

        {/* ── Submit button ─────────────────────────────────────────────────── */}
        <button
          type="submit"
          className="primary"
          disabled={isSubmitting}
          style={{ minWidth: "180px" }}
        >
          {phase === PHASE.UPLOADING && <Loader size={14} style={{ animation: "spin 1s linear infinite" }} />}
          {phase === PHASE.SAVING    && <Loader size={14} style={{ animation: "spin 1s linear infinite" }} />}
          {isSubmitting
            ? phase === PHASE.UPLOADING ? "Uploading file…" : "Saving record…"
            : "Submit for review"}
        </button>

        {/* ── Helper hint ───────────────────────────────────────────────────── */}
        <p className="hint">
          <Clock3 size={14} />
          New uploads stay <strong>Pending Review</strong> until an Academic Maintainer approves them.
        </p>
      </form>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Department Request Modal */}
      {deptModalOpen && (
        <RequestDepartmentModal
          notify={notify}
          onClose={() => setDeptModalOpen(false)}
          onSuccess={() => {
            setDeptModalOpen(false);
            refreshDepartments();
          }}
        />
      )}
    </Card>
  );
}