import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import '../styles/startup.css';

export default function StartupScreen() {
  const { newProject, loadProject } = useProject();
  const { showToast } = useToast();
  const [showNewModal, setShowNewModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (!projectName.trim()) {
      showToast('Please enter a project name.', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await newProject(projectName.trim());
      if (res.canceled) setBusy(false);
    } catch (e) {
      showToast(e.message || 'Failed to create project', 'error');
      setBusy(false);
    }
  }

  async function handleLoad() {
    setBusy(true);
    try {
      const res = await loadProject();
      if (res.canceled) setBusy(false);
    } catch (e) {
      showToast(e.message || 'Failed to load project', 'error');
      setBusy(false);
    }
  }

  return (
    <div className="startup-screen">
      <div className="startup-brand">
        <div className="startup-logo">GV</div>
        <h1>GameVerse</h1>
        <p>Your entire game universe, organized in one place.</p>
      </div>

      <div className="startup-actions">
        <button className="startup-card" onClick={handleLoad} disabled={busy}>
          <div className="startup-card-icon">📂</div>
          <div>
            <h3>Load Project</h3>
            <p>Open an existing GameVerse project.</p>
          </div>
        </button>

        <button className="startup-card" onClick={() => setShowNewModal(true)} disabled={busy}>
          <div className="startup-card-icon">✨</div>
          <div>
            <h3>New Project</h3>
            <p>Create a new game universe.</p>
          </div>
        </button>
      </div>

      {showNewModal && (
        <div className="modal-overlay" onClick={() => !busy && setShowNewModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Project</h3>
            </div>
            <div className="modal-body">
              <div className="field-group">
                <label>Project Name</label>
                <input
                  type="text"
                  placeholder="City vs Country"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                You'll be asked to choose a folder location. GameVerse will create a complete,
                portable project vault there.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowNewModal(false)} disabled={busy}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={busy}>
                {busy ? <span className="spinner" /> : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
