import { describe, expect, it, vi } from "vitest";
import { safeIpc } from "./safeIpc.js";

describe("safeIpc", () => {
  it("returns the resolved value on success", async () => {
    const result = await safeIpc(Promise.resolve({ ok: true }));
    expect(result).toEqual({ ok: true });
  });

  it("shows a success toast when configured", async () => {
    const showToast = vi.fn();
    await safeIpc(Promise.resolve("done"), {
      showToast,
      successMessage: "Saved",
    });
    expect(showToast).toHaveBeenCalledWith("Saved", "success");
  });

  it("shows an error toast and rethrows on failure", async () => {
    const showToast = vi.fn();
    await expect(
      safeIpc(Promise.reject(new Error("IPC failed")), {
        showToast,
        errorMessage: "Operation failed",
      }),
    ).rejects.toThrow("IPC failed");
    expect(showToast).toHaveBeenCalledWith("IPC failed", "error");
  });
});
