import { SUPABASE_URL, SUPABASE_ANON_KEY, DEMO_MODE } from "./constants";

export const isSupabaseConfigured = () => {
  return !DEMO_MODE && Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
};

export const getAuthUser = () => {
  try {
    const saved = localStorage.getItem("unionhub-user");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // fallback
  }
  return null;
};

export const getAuthToken = () => {
  const user = getAuthUser();
  return user?.token || SUPABASE_ANON_KEY;
};

export const getAuthUserId = () => {
  const user = getAuthUser();
  return user?.id || null;
};

export const getSupabaseHeaders = (customHeaders = {}) => {
  const token = getAuthToken();
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
    ...customHeaders,
  };
};

export const supabaseRest = {
  async get(table, queryString = "") {
    const cleanBase = (SUPABASE_URL || "").replace(/\/$/, "");
    const url = `${cleanBase}/rest/v1/${table}${queryString ? `?${queryString}` : ""}`;
    const res = await fetch(url, {
      method: "GET",
      headers: getSupabaseHeaders(),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Failed to fetch from ${table} (status ${res.status})`);
    }
    return res.json();
  },

  async post(table, payload) {
    const cleanBase = (SUPABASE_URL || "").replace(/\/$/, "");
    const url = `${cleanBase}/rest/v1/${table}`;
    const res = await fetch(url, {
      method: "POST",
      headers: getSupabaseHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Failed to insert into ${table} (status ${res.status})`);
    }
    return res.json();
  },

  async patch(table, queryString, payload) {
    const cleanBase = (SUPABASE_URL || "").replace(/\/$/, "");
    const url = `${cleanBase}/rest/v1/${table}${queryString ? `?${queryString}` : ""}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: getSupabaseHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Failed to update ${table} (status ${res.status})`);
    }
    return res.json();
  },

  async delete(table, queryString) {
    const cleanBase = (SUPABASE_URL || "").replace(/\/$/, "");
    const url = `${cleanBase}/rest/v1/${table}${queryString ? `?${queryString}` : ""}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: getSupabaseHeaders(),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Failed to delete from ${table} (status ${res.status})`);
    }
    return res.json();
  },

  async rpc(functionName, params = {}) {
    const cleanBase = (SUPABASE_URL || "").replace(/\/$/, "");
    const url = `${cleanBase}/rest/v1/rpc/${functionName}`;
    const res = await fetch(url, {
      method: "POST",
      headers: getSupabaseHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `RPC call ${functionName} failed (status ${res.status})`);
    }
    return res.json();
  },

  async invoke(functionName, payload = {}) {
    const cleanBase = (SUPABASE_URL || "").replace(/\/$/, "");
    const url = `${cleanBase}/functions/v1/${functionName}`;
    const res = await fetch(url, {
      method: "POST",
      headers: getSupabaseHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Function ${functionName} failed (status ${res.status})`);
    }
    return res.json();
  },
};
