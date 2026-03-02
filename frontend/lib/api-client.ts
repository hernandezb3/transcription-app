import { settings } from "@/lib/settings";

export class ApiClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

export class FastApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl = settings.api?.baseUrl) {
    if (!baseUrl) {
      throw new ApiClientError("settings.api.baseUrl is not configured", 500);
    }

    this.baseUrl = baseUrl;
  }

  async request<T>(path: string, init?: RequestInit): Promise<T> {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${normalizedPath}`, {
        cache: "no-store",
        ...init,
      });
    } catch {
      throw new ApiClientError("Could not reach FastAPI service", 502);
    }

    if (!response.ok) {
      throw new ApiClientError(
        `FastAPI request failed with status ${response.status}`,
        response.status
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiClientError("FastAPI returned invalid JSON", 502);
    }
  }

  async get<T>(path: string, init?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...init, method: "GET" });
  }

  async post<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...init,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async put<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...init,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async patch<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...init,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async delete<T>(path: string, init?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...init, method: "DELETE" });
  }
}

export const fastApiClient = new FastApiClient();
