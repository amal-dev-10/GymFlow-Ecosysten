'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Phone, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { authApi, handleApiError } from '../../lib/api';

export default function PlatformLoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [countryCode, setCountryCode] = useState('+91');
  const [localPhone, setLocalPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  const fullPhoneNumber = `${countryCode}${localPhone}`;

  useEffect(() => {
    const token = localStorage.getItem('platform_token');
    if (token) {
      router.push('/');
    } else {
      setCheckingAuth(false);
    }
  }, [router]);

  useEffect(() => {
    if (step === 'otp' && countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, countdown]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center">
        <RefreshCw className="animate-spin text-indigo-500" size={28} />
      </div>
    );
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localPhone) return;
    setLoading(true);
    setErrorMsg('');
    try {
      await authApi.sendOtp(fullPhoneNumber);
      setStep('otp');
      setCountdown(59);
    } catch (err) {
      setErrorMsg(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) {
      document.getElementById(`platform-otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`platform-otp-${index - 1}`)?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await authApi.verifyOtp(fullPhoneNumber, code);
      localStorage.setItem('platform_token', data.accessToken);
      localStorage.setItem('platform_refreshToken', data.refreshToken);
      localStorage.setItem('platform_user', JSON.stringify(data.user));
      router.push('/');
    } catch (err) {
      setErrorMsg(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setOtp(['', '', '', '', '', '']);
    setLoading(true);
    try {
      await authApi.sendOtp(fullPhoneNumber);
      setCountdown(59);
    } catch (err) {
      setErrorMsg(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[500px] pointer-events-none">
        <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-indigo-600/10 to-violet-600/15 blur-[140px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm">
            GF
          </div>
          <div className="text-left">
            <span className="block text-sm font-black text-white leading-tight">GymFlow</span>
            <span className="block text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Platform Admin</span>
          </div>
        </div>

        <div className="bg-[#0b101d] border border-slate-800/80 rounded-3xl p-8 shadow-2xl">
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="text-center mb-2">
                <Sparkles className="mx-auto text-indigo-400 mb-3" size={22} />
                <h1 className="text-base font-extrabold text-white">Sign in to Platform Admin</h1>
                <p className="text-[11px] text-slate-500 mt-1.5">Internal access for GymFlow staff only.</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Phone Number</label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 text-xs text-slate-300 outline-none focus:border-indigo-500"
                  >
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                  </select>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input
                      required
                      type="tel"
                      value={localPhone}
                      onChange={(e) => setLocalPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-3 text-xs text-slate-100 placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {errorMsg && <p className="text-[11px] text-rose-400 font-semibold text-center">{errorMsg}</p>}

              <button
                type="submit"
                disabled={loading || !localPhone}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-xs font-bold text-white rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              >
                {loading ? <RefreshCw className="animate-spin" size={14} /> : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center mb-2">
                <ShieldCheck className="mx-auto text-indigo-400 mb-3" size={22} />
                <h1 className="text-base font-extrabold text-white">Enter Verification Code</h1>
                <p className="text-[11px] text-slate-500 mt-1.5">Sent to {fullPhoneNumber}</p>
              </div>

              <div className="flex justify-center gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`platform-otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, i)}
                    onKeyDown={(e) => handleOtpKeyDown(e, i)}
                    className="w-10 h-12 text-center bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm font-bold text-white outline-none transition-colors"
                  />
                ))}
              </div>

              {errorMsg && <p className="text-[11px] text-rose-400 font-semibold text-center">{errorMsg}</p>}

              <button
                type="submit"
                disabled={loading || otp.join('').length < 6}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-xs font-bold text-white rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              >
                {loading ? <RefreshCw className="animate-spin" size={14} /> : <span>Verify & Sign In</span>}
              </button>

              <div className="flex items-center justify-between text-[11px]">
                <button type="button" onClick={() => setStep('phone')} className="text-slate-500 hover:text-slate-300">
                  Change number
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0}
                  className="text-indigo-400 hover:text-indigo-300 disabled:text-slate-600 font-semibold"
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
