import type { ApiResponse } from "@/types";

export async function fetchApi<TData>(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  const response = await fetch(input, init);
  const body = (await response.json()) as ApiResponse<TData>;

  if (!response.ok || !body.success) {
    throw new Error(body.message || "Request failed.");
  }

  return body.data as TData;
}
