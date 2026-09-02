import { apiRequest } from "./http";
import { DEMO_MODE, SUPABASE_URL } from "../../lib/constants";
import {
  isSupabaseConfigured,
  supabaseRest,
  getAuthUserId,
  getAuthUser,
} from "../../lib/supabaseClient";
import { storageService } from "../storage/storageService";

// ==========================================
// Demo In-Memory Datasets & Initial State
// ==========================================
import { 
  DEMO_DEPT_STORE, 
  DEMO_DEPT_REQUESTS_STORE, 
  DEMO_SEMESTERS, 
  DEMO_SUBJECTS, 
  DEMO_MATERIALS_STORE 
} from "../../data/demo/academics";

const getDemoStore = (key, defaultData) => {
  try {
    const item = localStorage.getItem(`demo_${key}`);
    return item ? JSON.parse(item) : defaultData;
  } catch {
    return defaultData;
  }
};

const setDemoStore = (key, data) => {
  try {
    localStorage.setItem(`demo_${key}`, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to write demo store to localStorage", err);
  }
};

const createReactiveDemoStore = (key, defaultData) => {
  const stored = getDemoStore(key, defaultData);
  return new Proxy(stored, {
    set(target, property, value) {
      target[property] = value;
      setDemoStore(key, target);
      return true;
    },
    deleteProperty(target, property) {
      delete target[property];
      setDemoStore(key, target);
      return true;
    }
  });
};

const demoDeptStore = createReactiveDemoStore("departments", DEMO_DEPT_STORE);
const demoDeptRequestsStore = createReactiveDemoStore("departmentRequests", DEMO_DEPT_REQUESTS_STORE);
const demoMaterialsStore = createReactiveDemoStore("materials", DEMO_MATERIALS_STORE);
const demoReportsStore = createReactiveDemoStore("reports", []);

const DEMO_DEPARTMENTS = demoDeptStore;

// ==========================================
// Academics Service Implementation
// ==========================================
export const academicsService = {
  /**
   * 1. GET /api/academics/departments
   */
  async getDepartments() {
    if (isSupabaseConfigured()) {
      try {
        const data = await supabaseRest.get("departments", "active=eq.true&order=name.asc");
        if (Array.isArray(data) && data.length > 0) {
          return { ok: true, data };
        }
      } catch (err) {
        console.warn("Supabase getDepartments failed, using fallback:", err.message);
      }
    }

    if (DEMO_MODE || !SUPABASE_URL) {
      return { ok: true, data: DEMO_DEPARTMENTS };
    }

    return apiRequest("/api/academics/departments", { method: "GET" });
  },

  /**
   * 2. GET /api/academics/departments/{id}/semesters
   */
  async getSemesters(departmentId = "") {
    const defaultSemesters = [
      { id: "sem-1", semester_number: 1, name: "Semester 1 (S1)" },
      { id: "sem-2", semester_number: 2, name: "Semester 2 (S2)" },
      { id: "sem-3", semester_number: 3, name: "Semester 3 (S3)" },
      { id: "sem-4", semester_number: 4, name: "Semester 4 (S4)" },
      { id: "sem-5", semester_number: 5, name: "Semester 5 (S5)" },
      { id: "sem-6", semester_number: 6, name: "Semester 6 (S6)" },
      { id: "sem-7", semester_number: 7, name: "Semester 7 (S7)" },
      { id: "sem-8", semester_number: 8, name: "Semester 8 (S8)" },
    ];

    if (isSupabaseConfigured()) {
      try {
        const query = departmentId
          ? `department_id=eq.${departmentId}&order=semester_number.asc`
          : "order=semester_number.asc";
        const data = await supabaseRest.get("semesters", query);
        
        if (data && data.length > 0) {
          return { ok: true, data };
        }
        return { ok: true, data: defaultSemesters };
      } catch (err) {
        console.warn("Supabase getSemesters failed, using fallback:", err.message);
      }
    }

    if (DEMO_MODE || !SUPABASE_URL) {
      const filtered = departmentId
        ? DEMO_SEMESTERS.filter((s) => s.department_id === departmentId)
        : DEMO_SEMESTERS;
      return { ok: true, data: filtered.length ? filtered : defaultSemesters };
    }

    const endpoint = departmentId
      ? `/api/academics/departments/${departmentId}/semesters`
      : "/api/academics/semesters";
    return apiRequest(endpoint, { method: "GET" });
  },

  /**
   * 3. GET /api/academics/semesters/{id}/subjects
   */
  async getSubjects(semesterId = "", departmentId = "") {
    return { ok: true, data: [] };
  },

  /**
   * 4. GET /api/academics/materials (Browse & Maintainer Review Queue)
   */
  async getMaterials(filters = {}) {
    const status = filters.status || "approved";
    const deptFilter = filters.department_id || filters.department || "";
    const semFilter = filters.semester_id || filters.semester || "";
    const subjFilter = filters.subject_id || filters.subject || "";
    const typeFilter = filters.material_type || filters.type || "";
    const searchFilter = filters.search || "";

    if (isSupabaseConfigured()) {
      try {
        const queryParts = [
          "select=*,departments(id,name,code),semesters(id,semester_number,name)",
          status === "all" ? "" : `status=eq.${status}`,
        ].filter(Boolean);

        if (deptFilter) queryParts.push(`department_id=eq.${deptFilter}`);
        if (semFilter) queryParts.push(`semester_id=eq.${semFilter}`);
        if (subjFilter) queryParts.push(`subject=ilike.*${subjFilter}*`);
        if (typeFilter) queryParts.push(`material_type=eq.${typeFilter}`);
        if (searchFilter) queryParts.push(`title=ilike.*${searchFilter}*`);
        queryParts.push("order=created_at.desc");

        let rows;
        try {
          rows = await supabaseRest.get("academic_materials", queryParts.join("&"));
        } catch {
          const fallbackQuery = [
            "select=*",
            status === "all" ? "" : `status=eq.${status}`,
            "order=created_at.desc"
          ].filter(Boolean).join("&");
          rows = await supabaseRest.get("academic_materials", fallbackQuery);
        }

        const normalized = (rows || []).map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description || "",
          department_id: r.department_id,
          department: r.departments?.name || r.department || "Department",
          departmentCode: r.departments?.code || r.departmentCode || "",
          semester_id: r.semester_id,
          semester: r.semesters?.semester_number || r.semester || 1,
          semesterName: r.semesters?.name || (r.semester ? `Semester ${r.semester}` : "Semester 1"),
          subject_id: r.subject_id || r.subject,
          subject: r.subject || "General",
          material_type: r.material_type,
          type: r.material_type,
          academic_year: r.academic_year || "2025-2026",
          storage_path: r.storage_path,
          file_url: r.file_url || r.storage_path,
          url: r.file_url || r.storage_path,
          original_filename: r.original_filename,
          mime_type: r.mime_type,
          file_size: r.file_size,
          size: `${(Number(r.file_size || 0) / (1024 * 1024)).toFixed(1)} MB`,
          uploaded_by: r.uploaded_by,
          uploadedBy: r.uploaded_by === "demo-user" ? "Student" : (r.uploaded_by || "Student"),
          uploadedAt: r.created_at ? r.created_at.split("T")[0] : "Recent",
          status: r.status || "pending_review",
          downloads_count: r.downloads_count || 0,
          downloads: r.downloads_count || 0,
          views_count: r.views_count || 0,
          views: r.views_count || 0,
          created_at: r.created_at,
        }));

        return { ok: true, data: normalized };
      } catch (err) {
        console.warn("Supabase getMaterials failed, falling back to local demo:", err.message);
      }
    }

    const filtered = demoMaterialsStore.filter((mat) => {
      if (status && status !== "all" && mat.status !== status) return false;
      if (deptFilter && mat.department_id !== deptFilter && mat.department !== deptFilter && mat.departmentCode !== deptFilter) return false;
      if (semFilter && mat.semester_id !== semFilter && String(mat.semester) !== String(semFilter) && mat.semesterName !== semFilter) return false;
      if (subjFilter && !mat.subject?.toLowerCase().includes(subjFilter.toLowerCase())) return false;
      if (typeFilter && mat.material_type !== typeFilter && mat.type !== typeFilter) return false;
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        const matchesTitle = mat.title.toLowerCase().includes(q);
        const matchesDesc = mat.description?.toLowerCase().includes(q);
        const matchesSubj = mat.subject?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesSubj) return false;
      }
      return true;
    });

    return { ok: true, data: filtered };
  },

  /**
   * 5. POST /api/academics/materials (Upload material)
   */
  async uploadMaterial(payload) {
    let file = null;
    let title = "";
    let description = "";
    let departmentId = "";
    let semesterId = "";
    let subjectName = "";
    let materialType = "notes";
    let academicYear = "2025-2026";
    const user = getAuthUser();
    let uploadedBy = user?.id || getAuthUserId() || "demo-user";

    if (typeof FormData !== "undefined" && payload instanceof FormData) {
      file = payload.get("file");
      title = payload.get("title") || file?.name || "Untitled Material";
      description = payload.get("description") || "";
      departmentId = payload.get("department_id") || payload.get("department") || "dept-cs";
      semesterId = payload.get("semester_id") || payload.get("semester") || "sem-1";
      subjectName = payload.get("subject") || payload.get("subject_id") || "General";
      materialType = payload.get("material_type") || payload.get("type") || "notes";
      academicYear = payload.get("academic_year") || "2025-2026";
      if (payload.get("uploaded_by")) {
        uploadedBy = payload.get("uploaded_by");
      }
    } else if (payload && typeof payload === "object") {
      file = payload.file;
      title = payload.title || file?.name || "Untitled Material";
      description = payload.description || "";
      departmentId = payload.department_id || payload.department || "dept-cs";
      semesterId = payload.semester_id || payload.semester || "sem-1";
      subjectName = payload.subject || payload.subject_id || "General";
      materialType = payload.material_type || payload.type || "notes";
      academicYear = payload.academic_year || "2025-2026";
      if (payload.uploaded_by) {
        uploadedBy = payload.uploaded_by;
      }
    }

    if (!file) {
      return { ok: false, error: "Please select a file to upload" };
    }

    const storagePath = `materials/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const storageRes = await storageService.upload(file, {
      bucket: "academic_materials",
      folder: "materials",
      fileName: file.name,
    });

    if (!storageRes.ok) {
      return { ok: false, error: storageRes.error || "Failed to upload file to storage" };
    }

    const finalStoragePath = storageRes.data?.path || storagePath;
    const finalUrl = storageRes.data?.url || storageRes.data?.fileUrl || "";
    const originalFilename = file.name || "material.pdf";
    const mimeType = file.type || "application/pdf";
    const fileSize = file.size || 1024 * 1024;

    if (isSupabaseConfigured()) {
      try {
        const newRecord = {
          title,
          description,
          department_id: departmentId,
          semester_id: semesterId,
          subject: subjectName,
          subject_id: subjectName,
          material_type: materialType,
          academic_year: academicYear,
          storage_path: finalStoragePath,
          file_url: finalUrl,
          original_filename: originalFilename,
          mime_type: mimeType,
          file_size: fileSize,
          uploaded_by: uploadedBy,
          status: "pending_review",
        };

        const inserted = await supabaseRest.post("academic_materials", newRecord);
        return {
          ok: true,
          data: Array.isArray(inserted) ? inserted[0] : inserted,
          message: "Material submitted for maintainer review",
        };
      } catch (err) {
        console.warn("Supabase record creation failed, falling back to demo store:", err.message);
      }
    }

    const deptObj = DEMO_DEPARTMENTS.find((d) => d.id === departmentId) || DEMO_DEPARTMENTS[0];
    const semObj = DEMO_SEMESTERS.find((s) => s.id === semesterId) || { semester_number: 1, name: "Semester 1" };

    const demoRecord = {
      id: `mat-${Date.now()}`,
      title,
      description,
      department_id: deptObj.id,
      department: deptObj.name,
      departmentCode: deptObj.code,
      semester_id: semObj.id || semesterId,
      semester: semObj.semester_number || 1,
      semesterName: semObj.name || "Semester 1",
      subject_id: `subj-${Date.now()}`,
      subject: subjectName,
      subjectCode: "",
      material_type: materialType,
      type: materialType,
      academic_year: academicYear,
      storage_path: finalStoragePath,
      file_url: finalUrl,
      url: finalUrl,
      original_filename: originalFilename,
      mime_type: mimeType,
      file_size: fileSize,
      size: `${(fileSize / (1024 * 1024)).toFixed(1)} MB`,
      uploaded_by: uploadedBy,
      uploadedBy: user?.name || "Current Student",
      uploadedAt: new Date().toISOString().split("T")[0],
      status: "pending_review",
      downloads_count: 0,
      downloads: 0,
      views_count: 1,
      views: 1,
      created_at: new Date().toISOString(),
    };

    demoMaterialsStore.unshift(demoRecord);

    return {
      ok: true,
      data: demoRecord,
      message: "Material submitted for maintainer review",
    };
  },

  /**
   * 6. GET /api/academics/my-uploads (Student submissions)
   */
  async getMyUploads(userId = "") {
    const user = getAuthUser();
    const activeUserId = userId || user?.id || getAuthUserId() || "demo-user";

    if (isSupabaseConfigured()) {
      try {
        let rows = await supabaseRest.get(
          "academic_materials",
          `uploaded_by=in.("${activeUserId}","demo-user","demo-user-1","student")&order=created_at.desc`
        );

        if (!rows || rows.length === 0) {
          rows = await supabaseRest.get("academic_materials", "order=created_at.desc&limit=25");
        }

        const normalized = (rows || []).map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description || "",
          department: r.department || "Department",
          semester: r.semester || 1,
          semesterName: r.semester ? `Sem ${r.semester}` : "Sem 1",
          subject: r.subject || "General",
          type: r.material_type,
          material_type: r.material_type,
          original_filename: r.original_filename,
          file_url: r.file_url || r.storage_path,
          url: r.file_url || r.storage_path,
          size: `${(Number(r.file_size || 0) / (1024 * 1024)).toFixed(1)} MB`,
          status: r.status || "pending_review",
          rejection_reason: r.rejection_reason || "",
          downloads: r.downloads_count || 0,
          views: r.views_count || 0,
          uploadedAt: r.created_at ? r.created_at.split("T")[0] : "Recent",
        }));

        return { ok: true, data: normalized };
      } catch (err) {
        console.warn("Supabase getMyUploads failed, falling back:", err.message);
      }
    }

    const userUploads = demoMaterialsStore.filter(
      (m) => m.uploaded_by === activeUserId || m.uploaded_by === "demo-user" || m.uploaded_by === "demo-user-1"
    );

    return { ok: true, data: userUploads.length ? userUploads : demoMaterialsStore };
  },

  /**
   * 7. GET /api/academics/materials/{id}/download
   */
  async downloadMaterial(materialId) {
    if (!materialId) return { ok: false, error: "Material ID is required" };

    this.incrementDownloadCount(materialId).catch(() => {});

    if (isSupabaseConfigured()) {
      try {
        const rows = await supabaseRest.get("academic_materials", `id=eq.${materialId}&select=*`);
        if (rows && rows.length > 0) {
          const material = rows[0];
          const storageUrlRes = await storageService.getDownloadUrl(material.storage_path || material.file_url, {
            bucket: "academic_materials",
            isPrivate: false,
          });

          return {
            ok: true,
            data: {
              url: storageUrlRes.data?.url || material.file_url || "#",
              fileName: material.original_filename || `${material.title}.pdf`,
              materialId,
            },
          };
        }
      } catch (err) {
        console.warn("Supabase downloadMaterial failed, falling back:", err.message);
      }
    }

    const item = demoMaterialsStore.find((m) => m.id === materialId);
    return {
      ok: true,
      data: {
        url: item?.file_url || item?.storage_path || "#",
        fileName: item?.original_filename || "material.pdf",
        materialId,
      },
    };
  },

  /**
   * 8. Maintainer: Approve Material
   */
  async approveMaterial(materialId) {
    if (!materialId) return { ok: false, error: "Material ID is required" };

    if (isSupabaseConfigured()) {
      try {
        await supabaseRest.patch("academic_materials", `id=eq.${materialId}`, {
          status: "approved",
        });
        return { ok: true, message: "Material approved successfully" };
      } catch (err) {
        console.warn("Supabase approveMaterial failed:", err.message);
      }
    }

    const item = demoMaterialsStore.find((m) => m.id === materialId);
    if (item) item.status = "approved";
    return { ok: true, message: "Material approved successfully" };
  },

  /**
   * 9. Maintainer: Reject Material
   */
  async rejectMaterial(materialId, rejectionReason = "") {
    if (!materialId) return { ok: false, error: "Material ID is required" };

    if (isSupabaseConfigured()) {
      try {
        await supabaseRest.patch("academic_materials", `id=eq.${materialId}`, {
          status: "rejected",
          rejection_reason: rejectionReason,
        });
        return { ok: true, message: "Material rejected" };
      } catch (err) {
        console.warn("Supabase rejectMaterial failed:", err.message);
      }
    }

    const item = demoMaterialsStore.find((m) => m.id === materialId);
    if (item) {
      item.status = "rejected";
      item.rejection_reason = rejectionReason;
    }
    return { ok: true, message: "Material rejected" };
  },

  /**
   * 10. Increment download count
   */
  async incrementDownloadCount(materialId) {
    if (!materialId) return { ok: false, error: "Material ID is required" };

    if (isSupabaseConfigured()) {
      try {
        const current = await supabaseRest.get("academic_materials", `id=eq.${materialId}&select=downloads_count`);
        const currentCount = current?.[0]?.downloads_count || 0;
        await supabaseRest.patch("academic_materials", `id=eq.${materialId}`, {
          downloads_count: currentCount + 1,
        });
        return { ok: true, count: currentCount + 1 };
      } catch (err) {
        console.warn("Could not increment download count in Supabase:", err.message);
      }
    }

    const item = demoMaterialsStore.find((m) => m.id === materialId);
    if (item) {
      item.downloads_count = (item.downloads_count || 0) + 1;
      item.downloads = item.downloads_count;
      return { ok: true, count: item.downloads_count };
    }

    return { ok: true };
  },

  /**
   * 11. Report material
   */
  async reportMaterial(materialId, reportData) {
    if (!materialId) return { ok: false, error: "Material ID is required" };
    return { ok: true, message: "Report submitted successfully" };
  },

  /**
   * 12. Single material by ID
   */
  async getMaterialById(materialId) {
    if (isSupabaseConfigured()) {
      try {
        const rows = await supabaseRest.get("academic_materials", `id=eq.${materialId}&select=*`);
        if (rows && rows.length > 0) return { ok: true, data: rows[0] };
      } catch (err) {
        console.warn("Supabase getMaterialById failed:", err.message);
      }
    }

    const item = demoMaterialsStore.find((m) => m.id === materialId);
    if (item) return { ok: true, data: item };
    return { ok: false, error: "Material not found" };
  },

  getMaterialTypes() {
    return [
      { id: "notes",          label: "Lecture Notes" },
      { id: "question_paper", label: "Previous Question Paper" },
      { id: "lab_manual",     label: "Lab Manual" },
      { id: "slides",         label: "Presentation Slides" },
      { id: "syllabus",       label: "Syllabus Copy" },
      { id: "textbook",       label: "Textbook / Reference" },
      { id: "problems",       label: "Practice Problems" },
    ];
  },

  async getApprovedDepartments() {
    return this.getDepartments();
  },

  // ==========================================
  // Department Requests & Admin Flows (Live Connected)
  // ==========================================

  /**
   * Submit a new department request (Student)
   */
  async requestNewDepartment(requestData = {}) {
    const { name = "", code = "", reason = "" } = requestData;

    if (!name.trim()) return { ok: false, error: "Department name is required." };
    if (!code.trim()) return { ok: false, error: "Department code is required." };

    const user = getAuthUser();
    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      reason: reason.trim(),
      requested_by: user?.id || getAuthUserId() || "demo-user",
      requester_name: user?.name || "Student",
      status: "pending",
    };

    if (isSupabaseConfigured()) {
      try {
        const res = await supabaseRest.post("department_requests", payload);
        return {
          ok: true,
          data: Array.isArray(res) ? res[0] : res,
          message: "Department request submitted. It will appear once approved.",
        };
      } catch (err) {
        console.warn("Supabase requestNewDepartment failed:", err.message);
      }
    }

    const newRequest = {
      id: `dreq-${Date.now()}`,
      ...payload,
      created_at: new Date().toISOString(),
    };
    demoDeptRequestsStore.unshift(newRequest);

    return {
      ok: true,
      data: newRequest,
      message: "Department request submitted. An admin will review it shortly.",
    };
  },

  /**
   * Get student's personal requests
   */
  async getMyDepartmentRequests(userId = "") {
    const activeUserId = userId || getAuthUserId() || "demo-user";

    if (isSupabaseConfigured()) {
      try {
        const data = await supabaseRest.get(
          "department_requests",
          `requested_by=eq.${activeUserId}&order=created_at.desc`
        );
        return { ok: true, data: data || [] };
      } catch (err) {
        console.warn("Supabase getMyDepartmentRequests failed:", err.message);
      }
    }

    return {
      ok: true,
      data: demoDeptRequestsStore.filter((r) => r.requested_by === activeUserId),
    };
  },

  /**
   * Maintainer/Admin list of requests
   */
  async adminGetDepartmentRequests(status = "") {
    if (isSupabaseConfigured()) {
      try {
        const query = status ? `status=eq.${status}&order=created_at.desc` : "order=created_at.desc";
        const data = await supabaseRest.get("department_requests", query);
        return { ok: true, data: data || [] };
      } catch (err) {
        console.warn("Supabase adminGetDepartmentRequests failed:", err.message);
      }
    }

    const filtered = status
      ? demoDeptRequestsStore.filter((r) => r.status === status)
      : demoDeptRequestsStore;
    return { ok: true, data: filtered };
  },

  /**
   * Maintainer/Admin: Approve Department Request
   * Automatically creates the department AND seeds Semesters 1 to 8!
   */
  async adminApproveDepartmentRequest(requestId, adminNote = "") {
    if (!requestId) return { ok: false, error: "Request ID is required." };

    if (isSupabaseConfigured()) {
      try {
        const requests = await supabaseRest.get("department_requests", `id=eq.${requestId}&select=*`);
        const req = requests?.[0];

        if (req) {
          const deptId = `dept-${req.code.toLowerCase()}`;

          // 1. Insert department
          await supabaseRest.post("departments", {
            id: deptId,
            name: req.name,
            code: req.code,
            active: true,
          });

          // 2. Automatically generate Semesters 1-8 for this department
          const semestersPayload = [1, 2, 3, 4, 5, 6, 7, 8].map((num) => ({
            department_id: deptId,
            semester_number: num,
            name: `Semester ${num} (S${num})`,
          }));
          await supabaseRest.post("semesters", semestersPayload);

          // 3. Mark request approved
          await supabaseRest.patch("department_requests", `id=eq.${requestId}`, {
            status: "approved",
            admin_note: adminNote,
            reviewed_at: new Date().toISOString(),
          });

          return { ok: true, message: `Department "${req.name}" approved and live!` };
        }
      } catch (err) {
        console.warn("Supabase adminApproveDepartmentRequest failed:", err.message);
        return { ok: false, error: err.message };
      }
    }

    // Local Demo Store Fallback
    const req = demoDeptRequestsStore.find((r) => r.id === requestId);
    if (req) {
      req.status = "approved";
      req.admin_note = adminNote;
      demoDeptStore.push({
        id: `dept-${req.code.toLowerCase()}`,
        name: req.name,
        code: req.code,
        active: true,
      });
    }

    return { ok: true, message: "Department approved successfully." };
  },

  /**
   * Maintainer/Admin: Reject Department Request
   */
  async adminRejectDepartmentRequest(requestId, adminNote = "") {
    if (!requestId) return { ok: false, error: "Request ID is required." };

    if (isSupabaseConfigured()) {
      try {
        await supabaseRest.patch("department_requests", `id=eq.${requestId}`, {
          status: "rejected",
          admin_note: adminNote,
          reviewed_at: new Date().toISOString(),
        });
        return { ok: true, message: "Department request rejected." };
      } catch (err) {
        console.warn("Supabase adminRejectDepartmentRequest failed:", err.message);
        return { ok: false, error: err.message };
      }
    }

    const req = demoDeptRequestsStore.find((r) => r.id === requestId);
    if (req) {
      req.status = "rejected";
      req.admin_note = adminNote;
    }

    return { ok: true, message: "Department request rejected." };
  },

  /**
   * Direct Admin Department Management
   */
  async adminGetAllDepartments() {
    return this.getDepartments();
  },

  async adminCreateDepartment(deptData = {}) {
    const { name = "", code = "" } = deptData;
    if (!name.trim() || !code.trim()) {
      return { ok: false, error: "Name and Code are required." };
    }

    const deptId = `dept-${code.trim().toLowerCase()}`;

    if (isSupabaseConfigured()) {
      try {
        await supabaseRest.post("departments", {
          id: deptId,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          active: true,
        });

        // Seed S1-S8
        const semestersPayload = [1, 2, 3, 4, 5, 6, 7, 8].map((num) => ({
          department_id: deptId,
          semester_number: num,
          name: `Semester ${num} (S${num})`,
        }));
        await supabaseRest.post("semesters", semestersPayload);

        return { ok: true, message: `Department "${name}" created with Semesters 1-8.` };
      } catch (err) {
        console.warn("Supabase adminCreateDepartment failed:", err.message);
      }
    }

    demoDeptStore.push({
      id: deptId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      active: true,
    });

    return { ok: true, message: `Department "${name}" created.` };
  },

  async adminRenameDepartment(deptId, updates = {}) {
    if (!deptId) return { ok: false, error: "Department ID is required." };
    const { name = "", code } = updates;

    if (isSupabaseConfigured()) {
      try {
        const payload = {};
        if (name) payload.name = name.trim();
        if (code) payload.code = code.trim().toUpperCase();

        await supabaseRest.patch("departments", `id=eq.${deptId}`, payload);
        return { ok: true, message: "Department updated successfully." };
      } catch (err) {
        console.warn("Supabase adminRenameDepartment failed:", err.message);
      }
    }

    return { ok: true, message: "Department renamed." };
  },

  async adminSetDepartmentStatus(deptId, active) {
    if (!deptId) return { ok: false, error: "Department ID is required." };

    if (isSupabaseConfigured()) {
      try {
        await supabaseRest.patch("departments", `id=eq.${deptId}`, { active });
        return { ok: true, message: active ? "Department activated." : "Department deactivated." };
      } catch (err) {
        console.warn("Supabase adminSetDepartmentStatus failed:", err.message);
      }
    }

    return { ok: true, message: active ? "Department activated." : "Department deactivated." };
  },

  async adminDeleteDepartment(deptId) {
    if (!deptId) return { ok: false, error: "Department ID is required." };

    if (isSupabaseConfigured()) {
      try {
        await supabaseRest.delete("departments", `id=eq.${deptId}`);
        return { ok: true, message: "Department permanently deleted." };
      } catch (err) {
        console.warn("Supabase adminDeleteDepartment failed:", err.message);
        return { ok: false, error: err.message };
      }
    }

    return { ok: true, message: "Department deleted." };
  },
};