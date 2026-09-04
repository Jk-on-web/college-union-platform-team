import React, { useState } from "react";
import { X, Calendar, Clock, MapPin, Tag, Users, Sparkles, AlertCircle } from "lucide-react";
import { eventsService } from "../../../services/api/eventsService";

export default function NewEventModal({ onClose, onCreated, notify }) {
  const [form, setForm] = useState({
    title: "",
    category: "symposium",
    date: "",
    time: "10:00 AM",
    venue: "",
    description: "",
    speakers: "",
    agenda: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const categories = eventsService.getCategories().filter((c) => c.id !== "all");

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Event title is required");
      return;
    }
    if (!form.date) {
      setError("Please select a date for the event");
      return;
    }
    if (!form.venue.trim()) {
      setError("Event venue is required");
      return;
    }
    if (!form.description.trim()) {
      setError("Event description is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await eventsService.createEvent(form);
      if (response.ok) {
        onCreated(response.data);
        notify(`Event "${form.title}" published successfully! ✓`);
        onClose();
      } else {
        setError(response.data?.error || "Failed to create event. Please try again.");
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred while creating the event.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(11, 16, 32, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card"
        style={{
          width: "min(620px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative",
          cursor: "default",
          background: "#fff",
          borderRadius: "16px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            borderBottom: "1px solid var(--line)",
            paddingBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "var(--soft)",
                color: "var(--brand)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Sparkles size={19} />
            </div>
            <div>
              <b style={{ fontSize: "16px", display: "block" }}>Create New Campus Event</b>
              <small style={{ color: "var(--muted)" }}>Admins can publish events visible to all students</small>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              padding: "6px",
              cursor: "pointer",
              borderRadius: "8px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              borderRadius: "9px",
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#b42318",
              fontSize: "12px",
              fontWeight: 600,
              marginBottom: "16px",
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#475467" }}>Event Title *</span>
            <input
              type="text"
              placeholder="e.g. Annual Robowars & AI Summit 2026"
              value={form.title}
              onChange={handleChange("title")}
              style={{
                height: "42px",
                padding: "0 12px",
                border: "1px solid var(--line)",
                borderRadius: "9px",
                fontSize: "13px",
                outline: "none",
                background: "#fbfcff",
              }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#475467" }}>Category *</span>
              <select
                value={form.category}
                onChange={handleChange("category")}
                style={{
                  height: "42px",
                  padding: "0 10px",
                  border: "1px solid var(--line)",
                  borderRadius: "9px",
                  fontSize: "12px",
                  background: "#fff",
                  color: "var(--ink)",
                }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#475467" }}>Venue / Location *</span>
              <input
                type="text"
                placeholder="e.g. Auditorium B or Main Ground"
                value={form.venue}
                onChange={handleChange("venue")}
                style={{
                  height: "42px",
                  padding: "0 12px",
                  border: "1px solid var(--line)",
                  borderRadius: "9px",
                  fontSize: "13px",
                  outline: "none",
                  background: "#fbfcff",
                }}
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#475467" }}>Date *</span>
              <input
                type="date"
                value={form.date}
                onChange={handleChange("date")}
                style={{
                  height: "42px",
                  padding: "0 12px",
                  border: "1px solid var(--line)",
                  borderRadius: "9px",
                  fontSize: "13px",
                  outline: "none",
                  background: "#fbfcff",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#475467" }}>Time *</span>
              <input
                type="text"
                placeholder="e.g. 10:00 AM - 4:00 PM"
                value={form.time}
                onChange={handleChange("time")}
                style={{
                  height: "42px",
                  padding: "0 12px",
                  border: "1px solid var(--line)",
                  borderRadius: "9px",
                  fontSize: "13px",
                  outline: "none",
                  background: "#fbfcff",
                }}
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#475467" }}>Description *</span>
            <textarea
              rows={3}
              placeholder="Detailed description of what the event covers..."
              value={form.description}
              onChange={handleChange("description")}
              style={{
                padding: "10px 12px",
                border: "1px solid var(--line)",
                borderRadius: "9px",
                fontSize: "13px",
                outline: "none",
                background: "#fbfcff",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#475467" }}>
              Speakers / Guests (Comma-separated)
            </span>
            <input
              type="text"
              placeholder="e.g. Prof. Arvind Kumar, Dr. Sarah Thomas"
              value={form.speakers}
              onChange={handleChange("speakers")}
              style={{
                height: "42px",
                padding: "0 12px",
                border: "1px solid var(--line)",
                borderRadius: "9px",
                fontSize: "13px",
                outline: "none",
                background: "#fbfcff",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#475467" }}>
              Schedule / Agenda (One per line)
            </span>
            <textarea
              rows={3}
              placeholder="10:00 AM — Registration & Keynote&#10;11:30 AM — Technical Workshop&#10;02:00 PM — Valedictory Session"
              value={form.agenda}
              onChange={handleChange("agenda")}
              style={{
                padding: "10px 12px",
                border: "1px solid var(--line)",
                borderRadius: "9px",
                fontSize: "13px",
                outline: "none",
                background: "#fbfcff",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </label>

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              className="outline"
              onClick={onClose}
              style={{ flex: 1, height: "42px" }}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary"
              style={{ flex: 1, height: "42px" }}
              disabled={submitting}
            >
              {submitting ? "Publishing event..." : "Publish Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
