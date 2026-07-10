import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function SettingsPage() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [fields, setFields] = useState([]);
  const [backups, setBackups] = useState([]);
  const [blenderPath, setBlenderPath] = useState("");

  async function load() {
    const list = await window.gameverse.templates.list();
    setTemplates(list);
    if (list.length > 0 && !selected) selectTemplate(list[0]);
    const b = await window.gameverse.backup.list();
    setBackups(b);
    const settings = await window.gameverse.settings.get();
    setBlenderPath(settings?.blenderPath || "");
  }

  useEffect(() => {
    load();
  }, []);

  function selectTemplate(tpl) {
    setSelected(tpl);
    setFields(tpl.fields.map((f) => ({ ...f })));
  }

  function updateField(idx, key, value) {
    setFields((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, [key]: value } : f)),
    );
  }

  function addField() {
    setFields((prev) => [
      ...prev,
      { key: `field_${prev.length + 1}`, label: "New Field", type: "text" },
    ]);
  }

  function removeField(idx) {
    setFields((prev) => prev.filter((_, i) => i !== idx));
  }

  async function saveTemplate() {
    await window.gameverse.templates.upsert(selected.category, fields);
    showToast(`Template for ${selected.category} saved.`, "success");
    load();
  }

  async function handleBackupNow() {
    try {
      const res = await window.gameverse.backup.create();
      showToast(
        `Backup created (${(res.size / 1024 / 1024).toFixed(2)} MB)`,
        "success",
      );
      load();
    } catch (e) {
      showToast(e.message || "Backup failed", "error");
    }
  }

  async function handleSelectBlenderPath() {
    const res = await window.gameverse.settings.selectBlenderPath();
    if (!res.canceled) {
      setBlenderPath(res.blenderPath);
      showToast("Blender path saved.", "success");
    }
  }

  return (
    <Layout>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Templates & Settings</h1>
          <div className="dashboard-subtitle">
            Customize item template fields per category, and manage backups.
          </div>
        </div>
      </div>

      <div className="dashboard-body">
        <div className="section-title">Item Templates</div>
        <div style={{ display: "flex", gap: 24, marginBottom: 40 }}>
          <div style={{ width: 200 }}>
            {templates.map((t) => (
              <div
                key={t.category}
                className={`wb-page-item ${selected?.category === t.category ? "active" : ""}`}
                onClick={() => selectTemplate(t)}
                style={{ cursor: "pointer" }}
              >
                {t.category}
              </div>
            ))}
          </div>

          <div style={{ flex: 1 }} className="card">
            {selected && (
              <div style={{ padding: 20 }}>
                <h3 style={{ marginTop: 0 }}>{selected.category} Fields</h3>
                {fields.map((f, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 8,
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="text"
                      value={f.label}
                      onChange={(e) =>
                        updateField(idx, "label", e.target.value)
                      }
                      placeholder="Field label"
                      style={{ flex: 1 }}
                    />
                    <input
                      type="text"
                      value={f.key}
                      onChange={(e) => updateField(idx, "key", e.target.value)}
                      placeholder="field_key"
                      style={{ width: 140 }}
                    />
                    <select
                      value={f.type}
                      onChange={(e) => updateField(idx, "type", e.target.value)}
                      style={{ width: 110 }}
                    >
                      <option value="text">Text</option>
                      <option value="textarea">Textarea</option>
                    </select>
                    <button
                      className="icon-btn"
                      onClick={() => removeField(idx)}
                    >
                      🗑
                    </button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="btn btn-sm" onClick={addField}>
                    + Add Field
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={saveTemplate}
                  >
                    Save Template
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="section-title">Blender</div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              value={blenderPath}
              readOnly
              placeholder="Blender executable path"
              style={{ flex: 1 }}
            />
            <button className="btn btn-sm" onClick={handleSelectBlenderPath}>
              Set Blender Path
            </button>
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Blender must be installed and available on PATH, or set here
            manually.
          </div>
        </div>

        <div className="section-title">Backups</div>
        <button
          className="btn btn-primary"
          style={{ marginBottom: 14 }}
          onClick={handleBackupNow}
        >
          💾 Create Backup Now
        </button>
        {backups.length === 0 ? (
          <div className="empty-state">No backups yet.</div>
        ) : (
          backups.map((b) => (
            <div className="list-row" key={b.id}>
              <div>{b.file_path}</div>
              <div style={{ color: "var(--text-muted)" }}>
                {(b.size_bytes / 1024 / 1024).toFixed(2)} MB ·{" "}
                {new Date(b.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}
