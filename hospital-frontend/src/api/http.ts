const API_BASE_URL = "http://localhost:5272/api";

function getHeaders(extraHeaders?: HeadersInit): HeadersInit {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: getHeaders(options?.headers),
  });

  const data = await response.json();
  return data as T;
}
