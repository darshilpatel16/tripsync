const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

type ApiErrorDetails = Array<{
  path: string;
  message: string;
}>;

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    details?: ApiErrorDetails;
  };
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetails;

  constructor(
    status: number,
    code: string,
    message: string,
    details: ApiErrorDetails = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as ApiErrorResponse | T;

  if (!response.ok) {
    const errorPayload = payload as ApiErrorResponse;

    throw new ApiError(
      response.status,
      errorPayload.error?.code ?? "REQUEST_FAILED",
      errorPayload.error?.message ?? "The request could not be completed",
      errorPayload.error?.details ?? [],
    );
  }

  return payload as T;
}
