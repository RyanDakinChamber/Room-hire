const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api";

const handleResponse = async (response) => {
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(data?.error || "Request failed");
    error.details = data?.details;
    throw error;
  }

  return data;
};

export const apiClient = {
  async get(path, params) {
    const url = new URL(`${apiBaseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value);
        }
      });
    }
    const response = await fetch(url.toString(), { cache: "no-store" });
    return handleResponse(response);
  },
  async post(path, body) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  },
  async put(path, body) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  },
  async delete(path) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: "DELETE"
    });
    return handleResponse(response);
  }
};
