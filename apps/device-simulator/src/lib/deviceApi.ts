import { useConfigStore } from "../store/useConfigStore";
import { useLogsStore } from "../store/useLogsStore";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

async function deviceRequest<T>(endpoint: string, method: HttpMethod = "GET", body?: any): Promise<T> {
  const { config } = useConfigStore.getState();
  const addLog = useLogsStore.getState().addLog;
  const baseUrl = config.webhookUrl;

  const url = `${baseUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-device-key": config.deviceKey,
  };

  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    let responseData: any;
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }

    addLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: "REQUEST",
      endpoint: url,
      method,
      payload: body,
      status: response.status,
      response: responseData,
      duration,
    });

    if (!response.ok) {
      throw new Error(responseData?.message || `HTTP ${response.status}`);
    }

    return responseData as T;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    addLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: "ERROR",
      endpoint: url,
      method,
      payload: body,
      status: 0,
      response: { error: error.message },
      duration,
    });
    throw error;
  }
}

export const deviceApi = {
  testConnection: () => deviceRequest("test", "POST"),
  heartbeat: (payload: { version?: string; ipAddress?: string }) => deviceRequest("heartbeat", "POST", payload),
  events: (payload: any) => deviceRequest("events", "POST", payload),
  syncMembers: (payload: any) => deviceRequest("sync-members", "POST", payload),
};
