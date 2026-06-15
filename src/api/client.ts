import { API_V1 } from "../config/api";
import type { AuthSession } from "./types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(body || `HTTP ${status}`);
    this.name = "ApiError";
  }
}

type TokenProvider = () => string | null;
type RefreshHandler = () => Promise<boolean>;

let getAccessToken: TokenProvider = () => null;
let refreshSession: RefreshHandler = async () => false;

export function configureApiAuth(
  tokenProvider: TokenProvider,
  onRefresh: RefreshHandler,
) {
  getAccessToken = tokenProvider;
  refreshSession = onRefresh;
}

function buildUrl(path: string, query?: Record<string, string | number | undefined>) {
  const clean = path.replace(/^\//, "");
  const url = new URL(`${API_V1}/${clean}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function parseBody(res: Response): Promise<string> {
  const text = await res.text();
  return text;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  query?: Record<string, string | number | undefined>,
): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body && !headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  let res = await fetch(buildUrl(path, query), { ...init, headers });
  if (res.status === 401 && (await refreshSession())) {
    const retryHeaders = new Headers(init.headers);
    const newToken = getAccessToken();
    if (newToken) {
      retryHeaders.set("Authorization", `Bearer ${newToken}`);
    }
    if (init.body && !retryHeaders.has("Content-Type")) {
      const isFormData =
        typeof FormData !== "undefined" && init.body instanceof FormData;
      if (!isFormData) {
        retryHeaders.set("Content-Type", "application/json");
      }
    }
    res = await fetch(buildUrl(path, query), { ...init, headers: retryHeaders });
  }
  return res;
}

export async function apiJson<T>(
  path: string,
  init: RequestInit = {},
  query?: Record<string, string | number | undefined>,
): Promise<T> {
  const res = await apiFetch(path, init, query);
  const text = await parseBody(res);
  if (!res.ok) {
    throw new ApiError(res.status, text);
  }
  if (!text || res.status === 204) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<AuthSession> {
  const res = await fetch(`${API_V1}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new ApiError(res.status, text);
  }
  return JSON.parse(text) as AuthSession;
}

export async function refreshRequest(refreshToken: string): Promise<Pick<AuthSession, "token" | "refreshToken" | "expiresIn">> {
  const res = await fetch(`${API_V1}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new ApiError(res.status, text);
  }
  return JSON.parse(text);
}

export function withQuery(
  path: string,
  params: Record<string, string | number | undefined>,
): { path: string; query: Record<string, string | number | undefined> } {
  return { path, query: params };
}
