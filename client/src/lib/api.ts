const API_PASSWORD_KEY = "knhs_api_password";

export function getApiPassword(): string {
  return localStorage.getItem(API_PASSWORD_KEY) || "";
}

export function setApiPassword(password: string): void {
  localStorage.setItem(API_PASSWORD_KEY, password);
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const password = getApiPassword();
  
  const headers = new Headers(options.headers);
  if (password) {
    headers.set("x-api-password", password);
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}
