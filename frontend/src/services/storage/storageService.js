import { DEMO_MODE, SUPABASE_URL, SUPABASE_ANON_KEY } from "../../lib/constants";
import { getAuthToken } from "../../lib/supabaseClient";

// ==========================================
// Demo IndexedDB for local file persistence
// ==========================================
const DB_NAME = "demo_storage_db";
const STORE_NAME = "files";

const getDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveFileLocally = async (path, file) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(file, path);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const getFileLocally = async (path) => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(path);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
};

// Helper to convert file to Base64 Data URL for instant browser rendering
const fileToDataUrl = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
};

export const storageService = {
  /**
   * Upload a file to Supabase storage or local demo storage
   */
  async upload(file, options = {}) {
    const {
      bucket = "academic_materials",
      folder = "materials",
      fileName = file?.name || `upload_${Date.now()}`,
    } = options;

    if (!file) {
      return { ok: false, error: "No file provided for upload" };
    }

    // Demo Mode fallback: Generate real Base64 Data URL + IndexedDB Blob
    if (DEMO_MODE || !SUPABASE_URL) {
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = folder ? `${folder}/${sanitizedName}` : sanitizedName;
      
      let dataUrl = "";
      try {
        dataUrl = await fileToDataUrl(file);
        await saveFileLocally(storagePath, file);
      } catch (err) {
        console.warn("Failed to persist locally", err);
      }

      // Fallback to object URL if dataUrl conversion fails
      const directUrl = dataUrl || (typeof window !== "undefined" ? window.URL.createObjectURL(file) : "");

      return {
        ok: true,
        data: {
          id: `demo-upload-${Date.now()}`,
          name: fileName,
          fileName,
          path: storagePath,
          fullPath: `${bucket}/${storagePath}`,
          url: directUrl, // Real Base64 / Blob URL that opens immediately
          fileUrl: directUrl,
          fileSize: file.size,
          mimeType: file.type || "application/pdf",
        },
      };
    }

    // Live Supabase Mode
    try {
      const cleanBase = SUPABASE_URL.replace(/\/$/, "");
      const token = getAuthToken() || SUPABASE_ANON_KEY;
      const sanitizedName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const storagePath = folder ? `${folder}/${sanitizedName}` : sanitizedName;

      const uploadUrl = `${cleanBase}/storage/v1/object/${bucket}/${storagePath}`;

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": file.type || "application/octet-stream",
          "x-upsert": "true",
        },
        body: file,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Storage upload failed (status ${response.status})`);
      }

      const publicUrl = `${cleanBase}/storage/v1/object/public/${bucket}/${storagePath}`;

      return {
        ok: true,
        data: {
          path: storagePath,
          fullPath: `${bucket}/${storagePath}`,
          url: publicUrl,
          fileUrl: publicUrl,
          fileName,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
        },
      };
    } catch (err) {
      return {
        ok: false,
        error: err.message || "Failed to upload file to storage",
      };
    }
  },

  /**
   * Retrieve a viewable/downloadable URL for a file
   */
  async getDownloadUrl(storagePath = "demo-file", options = {}) {
    const { bucket = "academic_materials", isPrivate = false, expiresIn = 3600 } = options;

    if (!storagePath) return { ok: false, error: "Invalid path" };

    // If already a Data URL or Web URL, return directly
    if (storagePath.startsWith("data:") || storagePath.startsWith("blob:") || storagePath.startsWith("http")) {
      return {
        ok: true,
        data: {
          url: storagePath,
          fileName: "document",
        },
      };
    }

    if (DEMO_MODE || !SUPABASE_URL) {
      const fileName = storagePath.split("/").pop() || storagePath;
      
      try {
        const localFile = await getFileLocally(storagePath);
        if (localFile && typeof window !== "undefined" && window.URL) {
          return {
            ok: true,
            data: {
              url: window.URL.createObjectURL(localFile),
              fileName,
            },
          };
        }
      } catch (err) {
        console.warn("Could not retrieve local file", err);
      }

      // Sample fallback text document
      const sampleText = `CUSAT ACADEMIC RESOURCE HUB\n\nDocument: ${fileName}\nStatus: Approved Resource\n\nThis is an offline demo preview document.`;
      const blob = new Blob([sampleText], { type: "text/plain" });
      
      return {
        ok: true,
        data: {
          url: typeof window !== "undefined" ? window.URL.createObjectURL(blob) : "",
          fileName: fileName.includes(".") ? fileName : `${fileName}.txt`,
        },
      };
    }

    const cleanBase = SUPABASE_URL.replace(/\/$/, "");
    const fileName = storagePath.split("/").pop() || storagePath;

    if (!isPrivate) {
      return {
        ok: true,
        data: {
          url: `${cleanBase}/storage/v1/object/public/${bucket}/${storagePath}`,
          fileName,
        },
      };
    }

    try {
      const token = getAuthToken() || SUPABASE_ANON_KEY;
      const signUrl = `${cleanBase}/storage/v1/object/sign/${bucket}/${storagePath}`;

      const response = await fetch(signUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn }),
      });

      if (!response.ok) {
        throw new Error("Failed to sign download URL");
      }

      const resData = await response.json();
      const signedPath = resData.signedURL?.startsWith("/") ? resData.signedURL : `/${resData.signedURL}`;

      return {
        ok: true,
        data: {
          url: `${cleanBase}/storage/v1${signedPath}`,
          fileName,
        },
      };
    } catch (err) {
      return {
        ok: false,
        error: err.message || "Failed to generate signed download URL",
      };
    }
  },

  async deleteFile(storagePath) {
    return { ok: true, data: { deleted: true, path: storagePath } };
  },
};