import { apiRequest } from "./http";
import { DEMO_MODE } from "../../lib/constants";
import { isSupabaseConfigured, supabaseRest } from "../../lib/supabaseClient";

const DEMO_PENDING_MATERIALS = [
  {
    id: "pnd-001",
    title: "Advanced Algorithm Design",
    description: "Comprehensive guide to algorithm design patterns",
    subject: "Algorithms",
    semester: 4,
    uploadedBy: "Student User",
    uploadedAt: "2026-08-28",
    type: "notes",
    size: "4.2 MB",
    status: "pending",
    reportCount: 0,
    review: null,
  },
  {
    id: "pnd-002",
    title: "Cloud Computing Basics",
    description: "Introduction to cloud platforms and services",
    subject: "Cloud Computing",
    semester: 6,
    uploadedBy: "Another Student",
    uploadedAt: "2026-08-27",
    type: "slides",
    size: "3.8 MB",
    status: "pending",
    reportCount: 0,
    review: null,
  },
];

const DEMO_REPORTS = [
  {
    id: "rpt-001",
    materialId: "mat-001",
    reportedBy: "Anonymous",
    reason: "Copyright violation",
    timestamp: "2026-08-25",
    status: "pending",
    material: {
      title: "Data Structures Fundamentals",
      uploadedBy: "Aswin P.",
    },
  },
];

export const maintainerService = {
  /**
   * 1. GET Pending Materials for Maintainer Review
   */
  async getPendingMaterials() {
    if (isSupabaseConfigured()) {
      try {
        // Query academic_materials directly without broken joins
        const rows = await supabaseRest.get(
          "academic_materials",
          "status=eq.pending_review&order=created_at.desc"
        );

        const mapped = (rows || []).map((r) => ({
          id: r.id,
          title: r.title || "Untitled Document",
          description: r.description || "",
          subject: r.subject || "General",
          semester: r.semester || 1,
          uploadedBy: r.uploaded_by === "demo-user" ? "Student User" : (r.uploaded_by || "Student User"),
          uploadedAt: r.created_at ? new Date(r.created_at).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          type: r.material_type || "notes",
          size: r.file_size ? `${(Number(r.file_size) / (1024 * 1024)).toFixed(1)} MB` : "1.0 MB",
          storagePath: r.storage_path,
          originalFilename: r.original_filename || "document.pdf",
          status: "pending",
          reportCount: 0,
          review: null,
        }));

        return { ok: true, data: mapped };
      } catch (err) {
        console.warn("Failed to get pending materials from Supabase, using fallback:", err);
        return { ok: true, data: [] }; // Always return an array inside data so pending.map never crashes
      }
    }

    // Local Demo Mode Fallback
    try {
      const stored = localStorage.getItem("demo_materials");
      if (stored) {
        const materials = JSON.parse(stored);
        const pending = materials
          .filter((m) => m.status === "pending" || m.status === "pending_review")
          .map((m) => ({
            id: m.id,
            title: m.title,
            description: m.description,
            subject: m.subject || m.subjectCode || "General",
            semester: m.semester || 1,
            uploadedBy: m.uploadedBy || m.uploaded_by || "Student User",
            uploadedAt: m.uploadedAt || m.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
            type: m.type || m.material_type || "notes",
            size: m.size || "1.0 MB",
            storagePath: m.storage_path,
            originalFilename: m.original_filename || "document.pdf",
            status: "pending",
            reportCount: 0,
            review: null,
          }));
        return { ok: true, data: pending };
      }
    } catch (e) {
      console.warn("Failed to read demo materials from localStorage");
    }

    return { ok: true, data: DEMO_PENDING_MATERIALS };
  },

  /**
   * 2. Approve Material (Direct Supabase REST patch)
   */
  async approveMaterial(materialId, feedback = "") {
    if (isSupabaseConfigured()) {
      try {
        await supabaseRest.patch("academic_materials", `id=eq.${materialId}`, {
          status: "approved",
        });
        return {
          ok: true,
          data: {
            id: materialId,
            status: "approved",
            approvedAt: new Date().toISOString().split("T")[0],
            feedback,
          },
        };
      } catch (err) {
        console.warn("Supabase approve failed:", err);
      }
    }

    // Fallback: Local Storage
    try {
      const stored = localStorage.getItem("demo_materials");
      if (stored) {
        const materials = JSON.parse(stored);
        const idx = materials.findIndex((m) => m.id === materialId);
        if (idx !== -1) {
          materials[idx].status = "approved";
          materials[idx].approvedAt = new Date().toISOString().split("T")[0];
          localStorage.setItem("demo_materials", JSON.stringify(materials));
        }
      }
    } catch (e) {}

    return {
      ok: true,
      data: {
        id: materialId,
        status: "approved",
        approvedAt: new Date().toISOString().split("T")[0],
        feedback,
      },
    };
  },

  /**
   * 3. Reject Material (Direct Supabase REST patch)
   */
  async rejectMaterial(materialId, reason = "") {
    if (isSupabaseConfigured()) {
      try {
        await supabaseRest.patch("academic_materials", `id=eq.${materialId}`, {
          status: "rejected",
          rejection_reason: reason,
        });
        return {
          ok: true,
          data: {
            id: materialId,
            status: "rejected",
            rejectedAt: new Date().toISOString().split("T")[0],
            reason,
          },
        };
      } catch (err) {
        console.warn("Supabase reject failed:", err);
      }
    }

    // Fallback: Local Storage
    try {
      const stored = localStorage.getItem("demo_materials");
      if (stored) {
        const materials = JSON.parse(stored);
        const idx = materials.findIndex((m) => m.id === materialId);
        if (idx !== -1) {
          materials[idx].status = "rejected";
          materials[idx].rejection_reason = reason;
          materials[idx].rejectedAt = new Date().toISOString().split("T")[0];
          localStorage.setItem("demo_materials", JSON.stringify(materials));
        }
      }
    } catch (e) {}

    return {
      ok: true,
      data: {
        id: materialId,
        status: "rejected",
        rejectedAt: new Date().toISOString().split("T")[0],
        reason,
      },
    };
  },

  /**
   * 4. Unpublish Material
   */
  async unpublishMaterial(materialId, reason = "") {
    if (isSupabaseConfigured()) {
      try {
        await supabaseRest.patch("academic_materials", `id=eq.${materialId}`, {
          status: "unpublished",
          rejection_reason: reason,
        });
        return {
          ok: true,
          data: {
            id: materialId,
            status: "unpublished",
            unpublishedAt: new Date().toISOString().split("T")[0],
            reason,
          },
        };
      } catch (err) {
        console.warn("Supabase unpublish failed:", err);
      }
    }

    return {
      ok: true,
      data: {
        id: materialId,
        status: "unpublished",
        unpublishedAt: new Date().toISOString().split("T")[0],
        reason,
      },
    };
  },

  /**
   * 5. Reports & Moderation Stats
   */
  async getPendingReports() {
    return { ok: true, data: DEMO_REPORTS };
  },

  async resolveReport(reportId, action, notes = "") {
    return {
      ok: true,
      data: {
        id: reportId,
        resolved: true,
        action,
        resolvedAt: new Date().toISOString().split("T")[0],
        notes,
      },
    };
  },

  async getModerationStats() {
    if (isSupabaseConfigured()) {
      try {
        const pendingRows = await supabaseRest.get("academic_materials", "status=eq.pending_review&select=id");
        return {
          ok: true,
          data: {
            totalPending: Array.isArray(pendingRows) ? pendingRows.length : 0,
            totalReports: DEMO_REPORTS.length,
            approvedToday: 1,
            rejectedToday: 0,
            averageReviewTime: "10 mins",
          },
        };
      } catch {}
    }

    return {
      ok: true,
      data: {
        totalPending: DEMO_PENDING_MATERIALS.length,
        totalReports: DEMO_REPORTS.length,
        approvedToday: 5,
        rejectedToday: 1,
        averageReviewTime: "2 hours",
      },
    };
  },

  getReportReasons() {
    return [
      { id: "copyright", label: "Copyright Violation" },
      { id: "inappropriate", label: "Inappropriate Content" },
      { id: "incorrect", label: "Incorrect Information" },
      { id: "spam", label: "Spam/Duplicate" },
      { id: "plagiarism", label: "Plagiarism" },
      { id: "other", label: "Other" },
    ];
  },

  getRejectionReasons() {
    return [
      { id: "quality", label: "Poor Quality" },
      { id: "incomplete", label: "Incomplete" },
      { id: "off-topic", label: "Off Topic" },
      { id: "copyright", label: "Copyright Issues" },
      { id: "format", label: "Invalid Format" },
      { id: "other", label: "Other" },
    ];
  },
};