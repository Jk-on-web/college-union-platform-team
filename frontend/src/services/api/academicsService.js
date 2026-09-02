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

// Helper for reactive localStorage demo states
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
        return { ok: true, data };
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
        // Fallback if department has no specific semester rows
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
    if (isSupabaseConfigured()) {
      try {
        const params = [];
        if (semesterId) params.push(`semester_id=eq.${semesterId}`);
        if (departmentId) params.push(`department_id=eq.${departmentId}`);
        params.push("order=name.asc");

        const data = await supabaseRest.get("subjects", params.join("&"));
        return { ok: true, data };
      } catch (err) {
        console.warn("Supabase getSubjects failed, using fallback:", err.message);
      }
    }

    if (DEMO_MODE || !SUPABASE_URL) {
      let filtered = DEMO_SUBJECTS;
      if (semesterId) {
        filtered = filtered.filter((s) => s.semester_id === semesterId);
      }
      if (departmentId) {
        filtered = filtered.filter((s) => s.department_id === departmentId);
      }
      return { ok: true, data: filtered };
    }

    const endpoint = semesterId
      ? `/api/academics/semesters/${semesterId}/subjects`
      : "/api/academics/subjects";
    return apiRequest(endpoint, { method: "GET" });
  },

  /**
   * 4. GET /api/academics/materials
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
          "select=*,departments(id,name,code),semesters(id,semester_number,name),subjects(id,name,code),profiles:uploaded_by(id,full_name,student_id)",
          `status=eq.${status}`,
        ];

        if (deptFilter) queryParts.push(`department_id=eq.${deptFilter}`);
        if (semFilter) queryParts.push(`semester_id=eq.${semFilter}`);
        if (subjFilter) queryParts.push(`subject_id=eq.${subjFilter}`);
        if (typeFilter) queryParts.push(`material_type=eq.${typeFilter}`);
        if (searchFilter) queryParts.push(`title=ilike.*${searchFilter}*`);
        queryParts.push("order=created_at.desc");

        const rows = await supabaseRest.get("academic_materials", queryParts.join("&"));

        const normalized = rows.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description || "",
          department_id: r.department_id,
          department: r.departments?.name || "Department",
          departmentCode: r.departments?.code || "",
          semester_id: r.semester_id,
          semester: r.semesters?.semester_number || 1,
          semesterName: r.semesters?.name || `Semester ${r.semesters?.semester_number || ""}`,
          subject_id: r.subject_id,
          subject: r.subjects?.name || "Subject",
          subjectCode: r.subjects?.code || "",
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
          uploadedBy: r.profiles?.full_name || "Student",
          uploadedAt: r.created_at ? r.created_at.split("T")[0] : "Recent",
          status: r.status,
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

    if (DEMO_MODE || !SUPABASE_URL) {
      const filtered = demoMaterialsStore.filter((mat) => {
        if (status && mat.status !== status) return false;
        if (deptFilter && mat.department_id !== deptFilter && mat.department !== deptFilter && mat.departmentCode !== deptFilter) return false;
        if (semFilter && mat.semester_id !== semFilter && String(mat.semester) !== String(semFilter) && mat.semesterName !== semFilter) return false;
        if (subjFilter && mat.subject_id !== subjFilter && mat.subject !== subjFilter && mat.subjectCode !== subjFilter) return false;
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
    }

    const params = new URLSearchParams();
    if (deptFilter) params.set("department_id", deptFilter);
    if (semFilter) params.set("semester_id", semFilter);
    if (subjFilter) params.set("subject_id", subjFilter);
    if (typeFilter) params.set("material_type", typeFilter);
    if (searchFilter) params.set("search", searchFilter);
    if (status) params.set("status", status);

    return apiRequest(`/api/academics/materials?${params.toString()}`, { method: "GET" });
  },

  /**
   * 5. POST /api/academics/materials
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
    let uploadedBy = getAuthUserId() || "demo-user";

    if (typeof FormData !== "undefined" && payload instanceof FormData) {
      file = payload.get("file");
      title = payload.get("title") || file?.name || "Untitled Material";
      description = payload.get("description") || "";
      departmentId = payload.get("department_id") || payload.get("department") || "dept-001";
      semesterId = payload.get("semester_id") || payload.get("semester") || "sem-5";
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
      departmentId = payload.department_id || payload.department || "dept-001";
      semesterId = payload.semester_id || payload.semester || "sem-5";
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

    // Step 1: Upload file via storageService
    const storageRes = await storageService.upload(file, {
      bucket: "academic_materials",
      folder: "materials",
      fileName: file.name,
    });

    if (!storageRes.ok) {
      return { ok: false, error: storageRes.error || "Failed to upload file to storage" };
    }

    const storagePath = storageRes.data.path;
    const fileUrl = storageRes.data.url || storageRes.data.fileUrl || "";
    const originalFilename = file.name || "material.pdf";
    const mimeType = file.type || "application/pdf";
    const fileSize = file.size || 1024 * 1024;

    // Step 2: Insert record into database with status 'pending_review'
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
          storage_path: storagePath,
          file_url: fileUrl,
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

    // Demo Mode Store fallback: Use the user's typed subject name directly
    const user = getAuthUser();
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
      subject: subjectName, // Takes the custom typed subject string
      subjectCode: "",
      material_type: materialType,
      type: materialType,
      academic_year: academicYear,
      storage_path: storagePath,
      file_url: fileUrl,
      url: fileUrl,
      original_filename: originalFilename,
      mime_type: mimeType,
      file_size: fileSize,
      size: `${(fileSize / (1024 * 1024)).toFixed(1)} MB`,
      uploaded_by: user?.id || uploadedBy,
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
   * 6. Increment download count
   */
  async incrementDownloadCount(materialId) {
    if (!materialId) return { ok: false, error: "Material ID is required" };

    if (isSupabaseConfigured()) {
      try {
        try {
          await supabaseRest.rpc("increment_material_downloads", { material_id: materialId });
          return { ok: true };
        } catch {
          const current = await supabaseRest.get("academic_materials", `id=eq.${materialId}&select=downloads_count`);
          const currentCount = current?.[0]?.downloads_count || 0;
          await supabaseRest.patch("academic_materials", `id=eq.${materialId}`, {
            downloads_count: currentCount + 1,
          });
          return { ok: true, count: currentCount + 1 };
        }
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
   * 7. GET /api/academics/materials/{id}/download
   * Returns a real downloadable Base64/Blob URL
   */
  async downloadMaterial(materialId) {
    if (!materialId) {
      return { ok: false, error: "Material ID is required" };
    }

    // Increment download counter asynchronously
    this.incrementDownloadCount(materialId).catch(() => {});

    // 1. Check local demo store first
    const item = demoMaterialsStore.find((m) => m.id === materialId);

    if (isSupabaseConfigured() && (!item || !item.file_url)) {
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

    // 2. Local Demo fallback: return actual uploaded file URL
    if (item) {
      let fileUrl = item.file_url || item.url;
      
      if (!fileUrl && item.storage_path) {
        const localRes = await storageService.getDownloadUrl(item.storage_path);
        fileUrl = localRes.data?.url;
      }

      // If it is a mock item with no file attached, create a dynamic readable PDF-like text document
      if (!fileUrl || fileUrl.startsWith("http://example.com") || fileUrl.includes("placehold.co")) {
        const sampleText = `CUSAT ACADEMIC RESOURCE\n\nTitle: ${item.title}\nSubject: ${item.subject || "Academic Resource"}\nDepartment: ${item.department || "CUSAT"}\nSemester: ${item.semester || "General"}\n\nDocument Content:\nThis study material was verified and made available for CUSAT students.`;
        const blob = new Blob([sampleText], { type: "text/plain;charset=utf-8" });
        fileUrl = typeof window !== "undefined" ? window.URL.createObjectURL(blob) : "";
      }

      return {
        ok: true,
        data: {
          url: fileUrl,
          fileName: item.original_filename || `${item.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`,
          materialId,
        },
      };
    }

    return { ok: false, error: "Material not found" };
  },

  /**
   * 8. GET /api/academics/my-uploads
   */
  async getMyUploads(userId = "") {
    const activeUserId = userId || getAuthUserId() || "demo-user-1";

    if (isSupabaseConfigured()) {
      try {
        const query = [
          "select=*,departments(id,name,code),semesters(id,semester_number,name),subjects(id,name,code)",
          `uploaded_by=eq.${activeUserId}`,
          "order=created_at.desc",
        ].join("&");

        const rows = await supabaseRest.get("academic_materials", query);
        const normalized = rows.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description || "",
          department: r.departments?.name || "Department",
          semester: r.semesters?.semester_number || 1,
          subject: r.subjects?.name || "Subject",
          type: r.material_type,
          material_type: r.material_type,
          original_filename: r.original_filename,
          file_url: r.file_url || r.storage_path,
          url: r.file_url || r.storage_path,
          size: `${(Number(r.file_size || 0) / (1024 * 1024)).toFixed(1)} MB`,
          status: r.status,
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
      (m) => m.uploaded_by === activeUserId || m.uploadedBy === "Current Student" || m.uploaded_by === "demo-user"
    );

    return { ok: true, data: userUploads };
  },

  /**
   * 9. POST /api/academics/materials/{id}/report
   */
  async reportMaterial(materialId, reportData) {
    if (!materialId) {
      return { ok: false, error: "Material ID is required to report" };
    }

    const reason = typeof reportData === "string" ? reportData : reportData?.reason || "Other";
    const description = typeof reportData === "object" ? reportData.description || "" : "";
    const reportedBy = getAuthUserId() || "demo-user";

    if (isSupabaseConfigured()) {
      try {
        const reportRecord = {
          material_id: materialId,
          reported_by: reportedBy,
          reason,
          description,
          status: "open",
        };

        const result = await supabaseRest.post("academic_reports", reportRecord);
        return {
          ok: true,
          data: Array.isArray(result) ? result[0] : result,
          message: "Report submitted successfully",
        };
      } catch (err) {
        console.warn("Supabase reportMaterial failed, using fallback:", err.message);
      }
    }

    const demoReport = {
      id: `rpt-${Date.now()}`,
      material_id: materialId,
      reported_by: reportedBy,
      reason,
      description,
      status: "open",
      created_at: new Date().toISOString(),
    };

    demoReportsStore.push(demoReport);

    return {
      ok: true,
      data: demoReport,
      message: "Report submitted successfully",
    };
  },

  /**
   * 10. GET single material by ID
   */
  async getMaterialById(materialId) {
    if (isSupabaseConfigured()) {
      try {
        const rows = await supabaseRest.get(
          "academic_materials",
          `id=eq.${materialId}&select=*,departments(id,name,code),semesters(id,semester_number,name),subjects(id,name,code),profiles:uploaded_by(id,full_name)`
        );
        if (rows && rows.length > 0) {
          return { ok: true, data: rows[0] };
        }
      } catch (err) {
        console.warn("Supabase getMaterialById failed:", err.message);
      }
    }

    const item = demoMaterialsStore.find((m) => m.id === materialId);
    if (item) {
      return { ok: true, data: item };
    }

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
    if (isSupabaseConfigured()) {
      try {
        const data = await supabaseRest.get(
          "departments",
          "active=eq.true&order=name.asc"
        );
        return { ok: true, data };
      } catch (err) {
        console.warn("Supabase getApprovedDepartments failed:", err.message);
      }
    }

    return {
      ok: true,
      data: demoDeptStore.filter((d) => d.active),
    };
  },

  async requestNewDepartment(requestData = {}) {
    const { name = "", code = "", reason = "" } = requestData;

    if (!name.trim()) return { ok: false, error: "Department name is required." };
    if (!code.trim()) return { ok: false, error: "Department code is required." };

    const requestedBy = getAuthUserId() || "demo-user";
    const user        = getAuthUser();

    if (isSupabaseConfigured()) {
      try {
        const record = {
          name:         name.trim(),
          code:         code.trim().toUpperCase(),
          requested_by: requestedBy,
          reason:       reason.trim(),
          status:       "pending",
          admin_note:   "",
        };
        const result = await supabaseRest.post("department_requests", record);
        return {
          ok:      true,
          data:    Array.isArray(result) ? result[0] : result,
          message: "Department request submitted. An admin will review it shortly.",
        };
      } catch (err) {
        console.warn("Supabase requestNewDepartment failed:", err.message);
      }
    }

    const newRequest = {
      id:             `dreq-${Date.now()}`,
      name:           name.trim(),
      code:           code.trim().toUpperCase(),
      requested_by:   requestedBy,
      requester_name: user?.name || "Student",
      reason:         reason.trim(),
      status:         "pending",
      admin_note:     "",
      created_at:     new Date().toISOString(),
    };
    demoDeptRequestsStore.unshift(newRequest);
    return {
      ok:      true,
      data:    newRequest,
      message: "Department request submitted. An admin will review it shortly.",
    };
  },

  async getMyDepartmentRequests(userId = "") {
    const activeUserId = userId || getAuthUserId() || "demo-user-1";

    if (isSupabaseConfigured()) {
      try {
        const data = await supabaseRest.get(
          "department_requests",
          `requested_by=eq.${activeUserId}&order=created_at.desc`
        );
        return { ok: true, data };
      } catch (err) {
        console.warn("Supabase getMyDepartmentRequests failed:", err.message);
      }
    }

    return {
      ok:   true,
      data: demoDeptRequestsStore.filter((r) => r.requested_by === activeUserId),
    };
  },

  async adminGetAllDepartments() {
    if (isSupabaseConfigured()) {
      try {
        const data = await supabaseRest.get("departments", "order=name.asc");
        return { ok: true, data };
      } catch (err) {
        console.warn("Supabase adminGetAllDepartments failed:", err.message);
      }
    }

    return { ok: true, data: [...demoDeptStore] };
  },

  async adminCreateDepartment(deptData = {}) {
    const { name = "", code = "" } = deptData;

    if (!name.trim()) return { ok: false, error: "Department name is required." };
    if (!code.trim()) return { ok: false, error: "Department code is required." };

    const duplicate = demoDeptStore.find(
      (d) => d.code.toUpperCase() === code.trim().toUpperCase()
    );
    if (duplicate) {
      return { ok: false, error: `A department with code "${code.toUpperCase()}" already exists.` };
    }

    if (isSupabaseConfigured()) {
      try {
        const record = {
          name:   name.trim(),
          code:   code.trim().toUpperCase(),
          active: true,
        };
        const result = await supabaseRest.post("departments", record);
        const created = Array.isArray(result) ? result[0] : result;
        demoDeptStore.push({ ...created, active: true });
        return { ok: true, data: created, message: `Department "${name}" created.` };
      } catch (err) {
        console.warn("Supabase adminCreateDepartment failed:", err.message);
        return { ok: false, error: err.message };
      }
    }

    const newDept = {
      id:         `dept-${Date.now()}`,
      name:       name.trim(),
      code:       code.trim().toUpperCase(),
      active:     true,
      created_at: new Date().toISOString(),
    };
    demoDeptStore.push(newDept);
    return { ok: true, data: newDept, message: `Department "${name}" created.` };
  },

  async adminRenameDepartment(deptId, updates = {}) {
    if (!deptId) return { ok: false, error: "Department ID is required." };
    const { name = "", code } = updates;
    if (!name.trim()) return { ok: false, error: "A new name is required." };

    if (isSupabaseConfigured()) {
      try {
        const payload = { name: name.trim() };
        if (code) payload.code = code.trim().toUpperCase();

        const result = await supabaseRest.patch(
          "departments",
          `id=eq.${deptId}`,
          payload
        );
        const updated = Array.isArray(result) ? result[0] : result;

        const idx = demoDeptStore.findIndex((d) => d.id === deptId);
        if (idx !== -1) Object.assign(demoDeptStore[idx], payload);

        return { ok: true, data: updated, message: "Department renamed successfully." };
      } catch (err) {
        console.warn("Supabase adminRenameDepartment failed:", err.message);
        return { ok: false, error: err.message };
      }
    }

    const idx = demoDeptStore.findIndex((d) => d.id === deptId);
    if (idx === -1) return { ok: false, error: "Department not found." };

    demoDeptStore[idx] = {
      ...demoDeptStore[idx],
      name: name.trim(),
      ...(code ? { code: code.trim().toUpperCase() } : {}),
    };
    return { ok: true, data: demoDeptStore[idx], message: "Department renamed successfully." };
  },

  async adminSetDepartmentStatus(deptId, active) {
    if (!deptId) return { ok: false, error: "Department ID is required." };
    if (typeof active !== "boolean") {
      return { ok: false, error: "active must be a boolean value." };
    }

    if (isSupabaseConfigured()) {
      try {
        const result = await supabaseRest.patch(
          "departments",
          `id=eq.${deptId}`,
          { active }
        );
        const updated = Array.isArray(result) ? result[0] : result;

        const idx = demoDeptStore.findIndex((d) => d.id === deptId);
        if (idx !== -1) demoDeptStore[idx].active = active;

        return {
          ok:      true,
          data:    updated,
          message: active ? "Department activated." : "Department deactivated.",
        };
      } catch (err) {
        console.warn("Supabase adminSetDepartmentStatus failed:", err.message);
        return { ok: false, error: err.message };
      }
    }

    const idx = demoDeptStore.findIndex((d) => d.id === deptId);
    if (idx === -1) return { ok: false, error: "Department not found." };

    demoDeptStore[idx].active = active;
    return {
      ok:      true,
      data:    demoDeptStore[idx],
      message: active ? "Department activated." : "Department deactivated.",
    };
  },

  async adminDeleteDepartment(deptId) {
    if (!deptId) return { ok: false, error: "Department ID is required." };

    if (isSupabaseConfigured()) {
      try {
        await supabaseRest.delete("departments", `id=eq.${deptId}`);

        const idx = demoDeptStore.findIndex((d) => d.id === deptId);
        if (idx !== -1) demoDeptStore.splice(idx, 1);

        return { ok: true, message: "Department permanently deleted." };
      } catch (err) {
        console.warn("Supabase adminDeleteDepartment failed:", err.message);
        const msg = err.message.includes("violates foreign key")
          ? "Cannot delete: materials or semesters are still linked to this department."
          : err.message;
        return { ok: false, error: msg };
      }
    }

    const idx = demoDeptStore.findIndex((d) => d.id === deptId);
    if (idx === -1) {
      return { ok: false, error: "Department not found." };
    }
    demoDeptStore.splice(idx, 1);
    return { ok: true, message: "Department permanently deleted." };
  },

  async adminGetDepartmentRequests(status = "") {
    if (isSupabaseConfigured()) {
      try {
        const query = [
          "select=*,profiles:requested_by(id,full_name,student_id)",
          status ? `status=eq.${status}` : "",
          "order=created_at.desc",
        ]
          .filter(Boolean)
          .join("&");

        const data = await supabaseRest.get("department_requests", query);
        return { ok: true, data };
      } catch (err) {
        console.warn("Supabase adminGetDepartmentRequests failed:", err.message);
      }
    }

    const filtered = status
      ? demoDeptRequestsStore.filter((r) => r.status === status)
      : demoDeptRequestsStore;
    return { ok: true, data: filtered };
  },

  async adminApproveDepartmentRequest(requestId, adminNote = "") {
    if (!requestId) return { ok: false, error: "Request ID is required." };

    const request = demoDeptRequestsStore.find((r) => r.id === requestId);
    if (!request) return { ok: false, error: "Request not found." };

    if (isSupabaseConfigured()) {
      try {
        await supabaseRest.post("departments", {
          name:   request.name,
          code:   request.code,
          active: true,
        });

        await supabaseRest.patch(
          "department_requests",
          `id=eq.${requestId}`,
          {
            status:      "approved",
            admin_note:  adminNote,
            reviewed_at: new Date().toISOString(),
          }
        );

        return { ok: true, message: `Department "${request.name}" approved and created.` };
      } catch (err) {
        console.warn("Supabase adminApproveDepartmentRequest failed:", err.message);
        return { ok: false, error: err.message };
      }
    }

    const newDept = {
      id:         `dept-${Date.now()}`,
      name:       request.name,
      code:       request.code,
      active:     true,
      created_at: new Date().toISOString(),
    };
    demoDeptStore.push(newDept);

    const idx = demoDeptRequestsStore.findIndex((r) => r.id === requestId);
    if (idx !== -1) {
      demoDeptRequestsStore[idx] = {
        ...demoDeptRequestsStore[idx],
        status:      "approved",
        admin_note:  adminNote,
        reviewed_at: new Date().toISOString(),
      };
    }

    return {
      ok:      true,
      data:    { department: newDept, request: demoDeptRequestsStore[idx] },
      message: `Department "${request.name}" approved and created.`,
    };
  },

  async adminRejectDepartmentRequest(requestId, adminNote = "") {
    if (!requestId) return { ok: false, error: "Request ID is required." };

    if (isSupabaseConfigured()) {
      try {
        const result = await supabaseRest.patch(
          "department_requests",
          `id=eq.${requestId}`,
          {
            status:      "rejected",
            admin_note:  adminNote,
            reviewed_at: new Date().toISOString(),
          }
        );
        return { ok: true, data: Array.isArray(result) ? result[0] : result, message: "Request rejected." };
      } catch (err) {
        console.warn("Supabase adminRejectDepartmentRequest failed:", err.message);
        return { ok: false, error: err.message };
      }
    }

    const idx = demoDeptRequestsStore.findIndex((r) => r.id === requestId);
    if (idx === -1) return { ok: false, error: "Request not found." };

    demoDeptRequestsStore[idx] = {
      ...demoDeptRequestsStore[idx],
      status:      "rejected",
      admin_note:  adminNote,
      reviewed_at: new Date().toISOString(),
    };
    return { ok: true, data: demoDeptRequestsStore[idx], message: "Request rejected." };
  },
};