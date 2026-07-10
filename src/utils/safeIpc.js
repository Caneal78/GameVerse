/**
 * Wrap an IPC promise with consistent error handling and optional toast feedback.
 *
 * @param {Promise<*>} promise - IPC call promise
 * @param {Object} [options]
 * @param {function(string, string): void} [options.showToast] - Toast callback from useToast
 * @param {string} [options.successMessage] - Message shown on success
 * @param {string} [options.errorMessage] - Fallback message when error has no message
 * @returns {Promise<*>}
 */
export async function safeIpc(promise, { showToast, successMessage, errorMessage } = {}) {
  try {
    const result = await promise;
    if (successMessage && showToast) {
      showToast(successMessage, "success");
    }
    return result;
  } catch (error) {
    if (showToast) {
      showToast(error?.message || errorMessage || "Operation failed", "error");
    }
    throw error;
  }
}
