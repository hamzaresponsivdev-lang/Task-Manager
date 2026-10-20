const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "Cannot reach the Task Manager API. Start the backend and check the frontend API proxy settings.",
        { cause: error },
      );
    }
    throw error;
  }

  const contentType = response.headers.get("content-type") || "";
  let data = null;
  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      throw new Error("The server returned an invalid JSON response.");
    }
  }

  if (!response.ok) {
    const error = new Error(
      data?.error || `Request failed with status ${response.status}.`,
    );
    error.status = response.status;
    throw error;
  }

  return data;
}
