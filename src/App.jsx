/**
 * GameVerse Main Application Component
 * 
 * Root component that sets up routing, context providers,
 * and renders the appropriate page based on project state.
 * 
 * @component App
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProjectProvider, useProject } from './context/ProjectContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import StartupScreen from './pages/StartupScreen.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ItemDetail from './pages/ItemDetail.jsx';
import WorldBible from './pages/WorldBible.jsx';
import CollectionsPage from './pages/CollectionsPage.jsx';
import CollectionDetail from './pages/CollectionDetail.jsx';
import SearchResults from './pages/SearchResults.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

/**
 * Gate component to show startup screen when no project is loaded
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render when project is loaded
 * @returns {React.ReactNode} Startup screen or children
 */
function Gate({ children }) {
  const { project, loading } = useProject();
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }
  if (!project) return <StartupScreen />;
  return children;
}

/**
 * Main App component
 * 
 * @returns {React.ReactNode} Rendered application
 */
export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ProjectProvider>
          <Gate>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/item/:id" element={<ItemDetail />} />
              <Route path="/worldbible" element={<WorldBible />} />
              <Route path="/collections" element={<CollectionsPage />} />
              <Route path="/collections/:id" element={<CollectionDetail />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Gate>
        </ProjectProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
