import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import { useToast } from "../context/ToastContext.jsx";
import InfoTab from "../components/tabs/InfoTab.jsx";
import NotebookTab from "../components/tabs/NotebookTab.jsx";
import FilesTab from "../components/tabs/FilesTab.jsx";
import LinksTab from "../components/tabs/LinksTab.jsx";
import { toGvfileUrl } from "../utils/gvfileUrl.js";
import { safeIpc } from "../utils/safeIpc.js";
import "../styles/itemDetail.css";

const TABS = [
  { key: "info", label: "Info" },
  { key: "notebook", label: "Notebook" },
  { key: "images", label: "Images" },
  { key: "audio", label: "Audio" },
  { key: "models", label: "3D Models" },
  { key: "animations", label: "Animations" },
  { key: "scripts", label: "Scripts" },
  { key: "links", label: "Connections" },
];

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [item, setItem] = useState(null);
  const [tab, setTab] = useState("info");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [launchingBlender, setLaunchingBlender] = useState(false);
  const [thumbSrc, setThumbSrc] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.gameverse.items.get(id);
      if (!data) {
        showToast("Item not found", "error");
        navigate("/");
        return;
      }
      setItem(data);
      if (data.thumbnail && data.thumbnail.stored_path) {
        const p = await window.gameverse.files.resolvePath(
          data.thumbnail.stored_path,
        );
        setThumbSrc(toGvfileUrl(p));
      } else {
        setThumbSrc(null);
      }
    } catch (e) {
      showToast(e.message || "Failed to load item", "error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!confirm(`Delete "${item.name}" permanently? This cannot be undone.`))
      return;
    try {
      await safeIpc(window.gameverse.items.delete(item.id), {
        showToast,
        successMessage: `"${item.name}" deleted.`,
        errorMessage: "Failed to delete item",
      });
      navigate("/");
    } catch {
      // Toast already shown by safeIpc
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await window.gameverse.exportItem.run(item.id);
      showToast(`Exported ${res.fileCount} file(s) to Exports/`, "success");
    } catch (e) {
      showToast(e.message || "Export failed", "error");
    } finally {
      setExporting(false);
    }
  }

  async function handleOpenInBlender() {
    setLaunchingBlender(true);
    try {
      const res = await window.gameverse.blender.openItem(item.id);
      showToast(`Launched Blender with ${res.modelFile}`, "success");
    } catch (e) {
      showToast(e.message || "Failed to open in Blender", "error");
    } finally {
      setLaunchingBlender(false);
    }
  }

  async function handleSetThumbnail() {
    const res = await window.gameverse.files.setThumbnail(item.id);
    if (!res.canceled) {
      showToast("Thumbnail updated.", "success");
      load();
    }
  }

  if (loading || !item) {
    return (
      <Layout>
        <div className="empty-state">
          <span className="spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="item-detail-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div className="item-detail-heading">
          <div
            className="item-detail-thumb"
            onClick={handleSetThumbnail}
            title="Click to change thumbnail"
          >
            {thumbSrc ? (
              <img src={thumbSrc} alt={item.name} />
            ) : (
              <span>{item.name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h1>{item.name}</h1>
            <div className="item-detail-meta">
              <span className="pill pill-accent">{item.category}</span>
              <span className={`pill status-${item.status}`}>
                {item.status}
              </span>
              {item.tags.map((t) => (
                <span className="pill" key={t.id}>
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="item-detail-actions">
          <button
            className="btn btn-ghost"
            onClick={handleExport}
            disabled={exporting || launchingBlender}
          >
            {exporting ? <span className="spinner" /> : "⬇ Export"}
          </button>
          <button
            className="btn btn-ghost"
            onClick={handleOpenInBlender}
            disabled={launchingBlender || exporting}
          >
            {launchingBlender ? (
              <span className="spinner" />
            ) : (
              "🧩 Open in Blender"
            )}
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            🗑 Delete
          </button>
        </div>
      </div>

      <div className="item-detail-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`item-detail-tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key !== "info" && t.key !== "notebook" && t.key !== "links" && (
              <span className="tab-count">
                {item.files.filter(
                  (f) => f.section.toLowerCase() === t.key && f.is_current,
                ).length || ""}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="item-detail-body">
        {tab === "info" && <InfoTab item={item} onChange={load} />}
        {tab === "notebook" && <NotebookTab item={item} onChange={load} />}
        {tab === "images" && (
          <FilesTab item={item} section="Images" onChange={load} />
        )}
        {tab === "audio" && (
          <FilesTab item={item} section="Audio" onChange={load} />
        )}
        {tab === "models" && (
          <FilesTab item={item} section="Models" onChange={load} />
        )}
        {tab === "animations" && (
          <FilesTab item={item} section="Animations" onChange={load} />
        )}
        {tab === "scripts" && (
          <FilesTab item={item} section="Scripts" onChange={load} />
        )}
        {tab === "links" && <LinksTab item={item} onChange={load} />}
      </div>
    </Layout>
  );
}
