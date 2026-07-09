"use client";

import { useState } from "react";
import { useOperatorSession } from "@/hooks/useOperatorSession";
import { useConfigStore } from "@/store/useConfigStore";

export function OperatorAuthCard() {
  const {
    isAuthenticated,
    userName,
    organizations,
    organizationId,
    gyms,
    loading,
    error,
    sendOtp,
    verifyOtp,
    switchOrganization,
    signOut,
  } = useOperatorSession();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const setConfig = useConfigStore((s) => s.setConfig);

  if (isAuthenticated) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-300">
              Signed in as <span className="font-medium text-neutral-100">{userName}</span>
            </p>
            <p className="text-xs text-neutral-500">{gyms.length} branch(es) available to this organization</p>
          </div>
          <button
            onClick={signOut}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800"
          >
            Sign out
          </button>
        </div>

        {organizations.length > 1 && (
          <label className="mt-3 flex flex-col gap-1 text-xs text-neutral-400">
            Organization
            <select
              value={organizationId || ""}
              disabled={loading}
              onChange={(e) => {
                setConfig({ gymId: "" });
                switchOrganization(e.target.value);
              }}
              className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <h2 className="text-sm font-medium text-neutral-200">Backend Authentication</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Devices authenticate using an operator session, the same as the admin web app.
      </p>

      <div className="mt-3 flex flex-col gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number"
          className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
        />
        {!otpSent ? (
          <button
            disabled={loading || !phone}
            onClick={async () => {
              await sendOtp(phone);
              setOtpSent(true);
            }}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Send OTP
          </button>
        ) : (
          <>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="One-time code"
              className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
            />
            <button
              disabled={loading || !otp}
              onClick={() => verifyOtp(phone, otp)}
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Verify &amp; Sign in
            </button>
          </>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}
