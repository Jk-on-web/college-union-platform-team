import { apiRequest } from "./http";
import { DEMO_MODE } from "../../lib/constants";

const DEMO_GRIEVANCES = [
  {
    id: "grv-001",
    title: "Classroom AC not working",
    description: "The AC in classroom A-102 has been broken for 3 days",
    category: "infrastructure",
    status: "in-progress",
    priority: "high",
    createdAt: "2026-08-27",
    updatedAt: "2026-08-28",
    response: "Maintenance team has been notified. Expected resolution by EOD.",
  },
  {
    id: "grv-002",
    title: "Canteen food quality issue",
    description: "Quality of food served in the canteen has deteriorated",
    category: "canteen",
    status: "resolved",
    priority: "medium",
    createdAt: "2026-08-20",
    updatedAt: "2026-08-26",
    response: "New vendor has been contracted. Quality improvements expected from next week.",
  },
  {
    id: "grv-003",
    title: "Library book shortage",
    description: "Reference books for the current semester are insufficient",
    category: "library",
    status: "pending",
    priority: "medium",
    createdAt: "2026-08-29",
    updatedAt: "2026-08-29",
  },
];

export const grievancesService = {
  async submitGrievance(grievanceData) {
    if (DEMO_MODE) {
      return {
        ok: true,
        data: {
          id: `grv-${Date.now()}`,
          ...grievanceData,
          status: "pending",
          createdAt: new Date().toISOString().split("T")[0],
          updatedAt: new Date().toISOString().split("T")[0],
        },
      };
    }
    return apiRequest("/api/grievances", {
      method: "POST",
      body: JSON.stringify(grievanceData),
    });
  },

  async getMyGrievances() {
    if (DEMO_MODE) {
      return { ok: true, data: DEMO_GRIEVANCES };
    }
    return apiRequest("/api/grievances/mine", { method: "GET" });
  },

  async getGrievanceDetails(grievanceId) {
    if (DEMO_MODE) {
      const grievance = DEMO_GRIEVANCES.find((g) => g.id === grievanceId);
      return grievance
        ? {
          ok: true,
          data: {
            ...grievance,
            comments: [
              {
                id: "cmt-001",
                author: "Administrator",
                text: "Your grievance has been received and assigned to the relevant department.",
                timestamp: "2026-08-27 10:30 AM",
              },
            ],
            attachments: [],
          },
        }
        : { ok: false, status: 404, data: { error: "Grievance not found" } };
    }
    return apiRequest(`/api/grievances/${grievanceId}`, { method: "GET" });
  },

  async updateGrievanceStatus(grievanceId, status) {
    if (DEMO_MODE) {
      return {
        ok: true,
        data: {
          id: grievanceId,
          status,
          updatedAt: new Date().toISOString().split("T")[0],
        },
      };
    }
    return apiRequest(`/api/grievances/${grievanceId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async addComment(grievanceId, comment) {
    if (DEMO_MODE) {
      return {
        ok: true,
        data: {
          id: `cmt-${Date.now()}`,
          grievanceId,
          text: comment,
          timestamp: new Date().toISOString(),
        },
      };
    }
    return apiRequest(`/api/grievances/${grievanceId}/comment`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    });
  },

  getCategories() {
    return [
      { id: "infrastructure", label: "Infrastructure" },
      { id: "canteen", label: "Canteen" },
      { id: "library", label: "Library" },
      { id: "academics", label: "Academics" },
      { id: "other", label: "Other" },
    ];
  },

  getStatuses() {
    return [
      { id: "pending", label: "Pending", color: "yellow" },
      { id: "in-progress", label: "In Progress", color: "blue" },
      { id: "resolved", label: "Resolved", color: "green" },
      { id: "closed", label: "Closed", color: "gray" },
    ];
  },
};
