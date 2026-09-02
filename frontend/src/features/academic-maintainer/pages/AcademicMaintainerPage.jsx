import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { PageHead, Card } from "../../../components/common/PagePrimitives";
import ReviewQueue from "../components/ReviewQueue";
import DepartmentManager from "../components/DepartmentManager";
import { permissionService } from "../../../services/auth/permissionService";
import { Lock } from "lucide-react";

export default function AcademicMaintainerPage() {
  const { notify, user } = useOutletContext();
  const [tab, setTab] = useState("review");

  const canAccess = permissionService.hasPermission("REVIEW_MATERIAL", user?.role);
  const isAdmin   = user?.role === "admin";

  if (!canAccess) {
    return (
      <>
        <PageHead
          eyebrow="ACADEMIC MODERATION"
          title="Maintainer Console"
          desc="Review, approve, reject and unpublish academic materials."
        />
        <Card style={{ textAlign: "center", padding: "60px 20px" }}>
          <Lock size={50} style={{ marginBottom: "15px", opacity: 0.5 }} />
          <h3 style={{ marginBottom: "5px" }}>Access Denied</h3>
          <p style={{ color: "var(--gray)" }}>
            Only academic maintainers and admins can access this console.
          </p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHead
        eyebrow="ACADEMIC MODERATION"
        title="Maintainer Console"
        desc="Review, approve, reject and manage academic content and departments."
      />

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div className="academic-nav">
        <button
          className={tab === "review" ? "active" : ""}
          onClick={() => setTab("review")}
        >
          Review Queue
        </button>

        {/* Departments tab is available to all maintainers to view requests,
            but full CRUD is only shown to admins */}
        <button
          className={tab === "departments" ? "active" : ""}
          onClick={() => setTab("departments")}
        >
          Departments
          {isAdmin && (
            <span style={{
              marginLeft: "5px",
              fontSize: "8px",
              background: "var(--soft)",
              color: "var(--brand)",
              borderRadius: "20px",
              padding: "2px 6px",
              fontWeight: 800,
            }}>
              ADMIN
            </span>
          )}
        </button>
      </div>

      {/* ── Review Queue ──────────────────────────────────────────────────────── */}
      {tab === "review" && (
        <ReviewQueue notify={notify} user={user} />
      )}

      {/* ── Department Management ─────────────────────────────────────────────── */}
      {tab === "departments" && (
        isAdmin ? (
          <DepartmentManager notify={notify} />
        ) : (
          /* Maintainers can see the section exists but can't CRUD */
          <Card style={{ textAlign: "center", padding: "48px 24px" }}>
            <Lock size={38} style={{ marginBottom: "12px", opacity: 0.4 }} />
            <h3 style={{ margin: "0 0 6px", fontSize: "14px" }}>Admin Only</h3>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "12px" }}>
              Department creation, renaming, and deletion require admin privileges.
              Contact a platform admin to make changes.
            </p>
          </Card>
        )
      )}
    </>
  );
}
