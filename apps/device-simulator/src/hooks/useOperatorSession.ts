"use client";

import { useCallback, useState } from "react";
import { authApi, gymApi, handleApiError, orgApi } from "@/lib/api";
import { useSessionStore } from "@/store/useSessionStore";

/**
 * The backend authenticates devices using an operator's JWT (there is no
 * device secret-key auth endpoint). This hook drives the OTP sign-in the
 * same way apps/web does, then loads every organization that phone number
 * has access to (one operator can run devices for multiple gym brands),
 * plus the branches for whichever organization is currently selected.
 */
export function useOperatorSession() {
  const session = useSessionStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendOtp = useCallback(async (phoneNumber: string) => {
    setLoading(true);
    setError(null);
    try {
      await authApi.sendOtp(phoneNumber, "login");
    } catch (err) {
      setError(handleApiError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGyms = useCallback(async (organizationId: string) => {
    const gyms = await gymApi.list(organizationId);
    session.setGyms(gyms.map((g: any) => ({ id: g.id, name: g.name })));
  }, [session]);

  const verifyOtp = useCallback(async (phoneNumber: string, otp: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.verifyOtp(phoneNumber, otp, "login");
      const primaryOrgId = result.user?.organizationId;

      // Persist the token first - every subsequent call needs it as a Bearer header.
      session.setSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        userName: result.user?.name || phoneNumber,
        organizations: [],
        organizationId: primaryOrgId || "",
      });

      const organizations = await orgApi.list();
      if (organizations.length === 0) {
        throw new Error("This account has no organization assigned.");
      }

      const organizationId =
        (primaryOrgId && organizations.some((o: any) => o.id === primaryOrgId) ? primaryOrgId : organizations[0].id);

      session.setSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        userName: result.user?.name || phoneNumber,
        organizations: organizations.map((o: any) => ({ id: o.id, name: o.name })),
        organizationId,
      });

      await loadGyms(organizationId);
    } catch (err) {
      setError(handleApiError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session, loadGyms]);

  const switchOrganization = useCallback(async (organizationId: string) => {
    setLoading(true);
    setError(null);
    try {
      session.selectOrganization(organizationId);
      await loadGyms(organizationId);
    } catch (err) {
      setError(handleApiError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session, loadGyms]);

  const signOut = useCallback(() => {
    session.clearSession();
  }, [session]);

  return {
    userName: session.userName,
    organizations: session.organizations,
    organizationId: session.organizationId,
    gyms: session.gyms,
    isAuthenticated: session.isAuthenticated(),
    loading,
    error,
    sendOtp,
    verifyOtp,
    switchOrganization,
    signOut,
  };
}
