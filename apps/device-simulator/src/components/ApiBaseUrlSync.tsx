"use client";

import { useEffect } from "react";
import { apiClient } from "@/lib/api/client";
import { useConfigStore } from "@/store/useConfigStore";

/** Applies the operator-configured "Server URL" field to the shared axios client. */
export function ApiBaseUrlSync() {
  const serverUrl = useConfigStore((s) => s.config.serverUrl);

  useEffect(() => {
    if (serverUrl) {
      apiClient.defaults.baseURL = serverUrl;
    }
  }, [serverUrl]);

  return null;
}
