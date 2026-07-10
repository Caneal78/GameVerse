/**
 * Project Context
 *
 * Manages the currently loaded project state and provides
 * functions for creating, loading, and closing projects.
 *
 * @context ProjectContext
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

/**
 * Project context object
 * @type {React.Context<Object|null>}
 */
const ProjectContext = createContext(null);

/**
 * Project context provider component
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactNode} Provider with project state
 */
export function ProjectProvider({ children }) {
  const [project, setProject] = useState(null); // { projectPath, projectName }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const gameverse = window.gameverse;
    if (!gameverse || !gameverse.project || !gameverse.project.current) {
      console.warn(
        "GameVerse IPC API not found. Make sure the app is running inside Electron.",
      );
      setLoading(false);
      return;
    }

    gameverse.project
      .current()
      .then((p) => {
        setProject(p);
      })
      .catch((error) => {
        console.warn("Failed to load current project:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const newProject = useCallback(async (name) => {
    const res = await window.gameverse.project.new(name);
    if (!res.canceled) {
      setProject({
        projectPath: res.projectPath,
        projectName: res.projectName,
      });
    }
    return res;
  }, []);

  const loadProject = useCallback(async () => {
    const res = await window.gameverse.project.load();
    if (!res.canceled) {
      setProject({
        projectPath: res.projectPath,
        projectName: res.projectName,
      });
    }
    return res;
  }, []);

  const closeProject = useCallback(async () => {
    await window.gameverse.project.close();
    setProject(null);
  }, []);

  return (
    <ProjectContext.Provider
      value={{ project, loading, newProject, loadProject, closeProject }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

/**
 * Hook to access project context
 *
 * @returns {Object} Project context value
 * @throws {Error} If used outside ProjectProvider
 */
export function useProject() {
  return useContext(ProjectContext);
}
