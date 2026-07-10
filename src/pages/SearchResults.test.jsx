import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { HashRouter } from "react-router-dom";
import SearchResults from "./SearchResults.jsx";
import { ToastProvider } from "../context/ToastContext.jsx";
import { ProjectProvider } from "../context/ProjectContext.jsx";

function renderSearchResults(initialEntry = "/search?q=hero") {
  window.location.hash = initialEntry;
  return render(
    <HashRouter>
      <ToastProvider>
        <ProjectProvider>
          <SearchResults />
        </ProjectProvider>
      </ToastProvider>
    </HashRouter>,
  );
}

describe("SearchResults", () => {
  beforeEach(() => {
    window.gameverse = {
      project: {
        current: vi.fn().mockResolvedValue({
          projectName: "Test Project",
          projectPath: "/tmp/test-project",
        }),
        close: vi.fn().mockResolvedValue(undefined),
        reveal: vi.fn().mockResolvedValue(undefined),
      },
      backup: {
        create: vi.fn().mockResolvedValue({ size: 1024 }),
      },
      search: {
        query: vi.fn(),
      },
    };
  });

  it("renders search results from IPC", async () => {
    window.gameverse.search.query.mockResolvedValue([
      {
        item_id: "item-1",
        name: "Hero Sword",
        category: "Weapon",
        status: "WIP",
      },
    ]);

    renderSearchResults();

    await waitFor(() => {
      expect(screen.getByText(/Hero Sword/)).toBeTruthy();
    });
    expect(window.gameverse.search.query).toHaveBeenCalledWith("hero");
  });

  it("shows empty state when no matches are found", async () => {
    window.gameverse.search.query.mockResolvedValue([]);

    renderSearchResults("/search?q=missing");

    await waitFor(() => {
      expect(screen.getByText(/No matches found/)).toBeTruthy();
    });
  });
});
