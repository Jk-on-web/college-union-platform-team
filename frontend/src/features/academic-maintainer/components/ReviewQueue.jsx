import React, { useState, useEffect } from "react";
import { FileText, ShieldCheck, CheckCircle2, Flag, Clock3, AlertCircle, Lock } from "lucide-react";
import { Card } from "../../../components/common/PagePrimitives";
import { maintainerService } from "../../../services/api/maintainerService";
import { permissionService } from "../../../services/auth/permissionService";
import { storageService } from "../../../services/storage/storageService";

export default function ReviewQueue({ notify, user }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPendingMaterials();
  }, []);

  const loadPendingMaterials = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await maintainerService.getPendingMaterials();
      if (response.ok) {
        setPending(response.data);
      } else {
        setError("Failed to load pending materials");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (materialId) => {
    const canApprove = permissionService.canPerformAction("APPROVE_MATERIAL", user);
    
    if (!canApprove.allowed) {
      notify("Only maintainers and admins can approve materials");
      return;
    }

    try {
      const response = await maintainerService.approveMaterial(materialId);
      if (response.ok) {
        notify("Material approved ✓");
        setPending(pending.filter((m) => m.id !== materialId));
      } else {
        notify(response.error || "Error approving material");
      }
    } catch (err) {
      notify(err.message || "Error approving material");
    }
  };

  const handleReject = async (materialId) => {
    const canReject = permissionService.canPerformAction("REJECT_MATERIAL", user);
    
    if (!canReject.allowed) {
      notify("Only maintainers and admins can reject materials");
      return;
    }

    const reason = window.prompt("Enter rejection reason (optional):");
    if (reason === null) return; // User cancelled

    try {
      const response = await maintainerService.rejectMaterial(materialId, reason);
      if (response.ok) {
        notify("Material rejected ✗");
        setPending(pending.filter((m) => m.id !== materialId));
      } else {
        notify(response.error || "Error rejecting material");
      }
    } catch (err) {
      notify(err.message || "Error rejecting material");
    }
  };

  const handlePreview = async (material) => {
    notify(`Loading preview for: ${material.title}`);
    try {
      if (!material.storagePath) {
        // Fallback for demo mode items that don't have storagePath in map
        notify("Preview not available for this item.");
        return;
      }
      const res = await storageService.getDownloadUrl(material.storagePath);
      if (res.ok && res.data?.url && res.data.url !== "#") {
        window.open(res.data.url, "_blank");
      } else {
        notify("Failed to get preview link");
      }
    } catch (err) {
      notify("Preview error");
    }
  };

  const canReview = permissionService.hasPermission("REVIEW_MATERIAL", user?.role);

  if (!canReview) {
    return (
      <Card style={{ textAlign: "center", padding: "40px" }}>
        <Lock size={40} style={{ marginBottom: "10px", opacity: 0.5 }} />
        <p>You don't have permission to review materials</p>
        <small>Only maintainers and admins can access this feature</small>
      </Card>
    );
  }

  return (
    <div className="review-layout">
      <Card>
        <div className="card-head">
          <div>
            <h3>Pending academic uploads</h3>
            <p>Only your assigned scope is shown.</p>
          </div>
          <span className="pill">{pending.length} pending</span>
        </div>

        {loading && <p style={{ textAlign: "center", padding: "20px" }}>Loading pending materials...</p>}

        {error && (
          <div style={{ textAlign: "center", padding: "20px", color: "var(--red)" }}>
            <AlertCircle size={20} style={{ marginBottom: "10px" }} />
            <p>{error}</p>
          </div>
        )}

        {!loading && pending.length === 0 && (
          <p style={{ textAlign: "center", padding: "20px", color: "var(--gray)" }}>
            All pending materials reviewed
          </p>
        )}

        {!loading &&
          pending.map((m) => (
            <div className="review-row" key={m.id}>
              <div className="file-icon sm">
                <FileText size={18} />
              </div>
              <div className="row-main">
                <b>{m.title}</b>
                <span>
                  {m.subject} · Sem {m.semester} · {m.uploadedBy} · {m.uploadedAt}
                </span>
              </div>
              <button className="iconbtn" onClick={() => handlePreview(m)}>
                <FileText size={17} />
              </button>
              <button
                className="approve"
                onClick={() => handleApprove(m.id)}
              >
                Approve
              </button>
              <button
                className="reject"
                onClick={() => handleReject(m.id)}
              >
                Reject
              </button>
            </div>
          ))}
      </Card>

      <Card>
        <h3>Maintainer rules</h3>
        <ul className="rule-list">
          <li>
            <CheckCircle2 /> You can only moderate assigned departments/semesters.
          </li>
          <li>
            <ShieldCheck /> Your own uploads cannot be approved by you.
          </li>
          <li>
            <Flag /> Reports create a separate review case.
          </li>
          <li>
            <Clock3 /> Every action is recorded in moderation history.
          </li>
        </ul>
      </Card>
    </div>
  );
}