const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "taskManagerSession";

// The session token is kept alongside the cookie because browsers can block the
// cookie, for example when the app is opened inside an embedded preview frame.
function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage can be unavailable (e.g. private mode); the cookie still applies.
  }
}

export async function apiRequest(path, options = {}) {
  const token = readToken();
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  if (data?.token) setSessionToken(data.token);
  if (response.status === 401 && !path.startsWith("/auth/")) setSessionToken(null);

  if (!response.ok) {
    const error = new Error(
      data?.error || `Request failed with status ${response.status}.`,
    );
    error.status = response.status;
    throw error;
  }

  return data;
}
