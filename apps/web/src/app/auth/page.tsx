'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Phone, ArrowRight, ShieldCheck, RefreshCw, ChevronDown, X, Check, FileText } from 'lucide-react';
import { authApi } from '../../lib/api';
import { handleApiError } from '../../lib/api/client';
import { useBrand } from '@/hooks/useBrand';

type LegalDoc = 'terms' | 'privacy';

// Legal copy rendered in the acceptance modal. Kept in one place so the Terms
// and Privacy links, the modal, and the footer all stay in sync.
const buildLegalContent = (brandName: string, supportEmail: string | null) => ({
  terms: {
    title: 'Terms & Conditions',
    updated: 'Last updated: July 7, 2026',
    sections: [
      {
        heading: '1. Acceptance of Terms',
        body: `By creating an account or using ${brandName}, you agree to be bound by these Terms & Conditions. If you do not agree, you may not access or use the platform.`,
      },
      {
        heading: '2. Accounts & Eligibility',
        body: 'You must be at least 18 years old and provide accurate contact details. You are responsible for all activity that occurs under your account and for keeping your verification credentials (OTP, device) secure.',
      },
      {
        heading: '3. Membership & Billing',
        body: 'Subscription fees, plan pricing, taxes, and any joining fees are billed according to the plan you select. Outstanding dues must be cleared within the stated grace period to keep your access active.',
      },
      {
        heading: '4. Acceptable Use',
        body: 'You agree not to misuse the platform, attempt unauthorized access, disrupt service, or use it for any unlawful purpose. We may suspend accounts that violate these terms.',
      },
      {
        heading: '5. Cancellation & Refunds',
        body: 'You may cancel at any time. Refunds, where applicable, are processed per the membership agreement and are subject to freeze and cancellation policies in effect at the time.',
      },
      {
        heading: '6. Limitation of Liability',
        body: `${brandName} is provided "as is" without warranties of any kind. We are not liable for indirect or consequential damages arising from your use of the service.`,
      },
      {
        heading: '7. Changes to These Terms',
        body: 'We may update these terms from time to time. Continued use of the platform after changes take effect constitutes acceptance of the revised terms.',
      },
    ],
    contact: supportEmail,
  },
  privacy: {
    title: 'Privacy Policy',
    updated: 'Last updated: July 7, 2026',
    sections: [
      {
        heading: '1. Information We Collect',
        body: 'We collect your name, phone number, and usage data necessary to operate your account, verify your identity, and provide gym-management services.',
      },
      {
        heading: '2. How We Use Your Information',
        body: 'Your data is used to authenticate you, deliver the service, process billing, send verification codes and service notifications, and improve the platform.',
      },
      {
        heading: '3. Data Sharing',
        body: 'We do not sell your personal data. Information may be shared with service providers (e.g. SMS delivery, payment processing) strictly to operate the service.',
      },
      {
        heading: '4. Data Security',
        body: 'We use reasonable technical and organizational measures to protect your data. No method of transmission or storage is completely secure, but we work to safeguard your information.',
      },
      {
        heading: '5. Your Rights',
        body: 'You may request access to, correction of, or deletion of your personal data, subject to legal and contractual retention requirements.',
      },
    ],
    contact: supportEmail,
  },
});

function LegalModal({
  doc,
  brandName,
  supportEmail,
  onClose,
  onAgree,
}: {
  doc: LegalDoc;
  brandName: string;
  supportEmail: string | null;
  onClose: () => void;
  onAgree?: () => void;
}) {
  const content = buildLegalContent(brandName, supportEmail)[doc];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white border border-neutral-200 rounded-3xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
              <FileText size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">{content.title}</h2>
              <p className="text-[10px] text-neutral-400 mt-0.5">{content.updated}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5 space-y-5">
          {content.sections.map((s) => (
            <div key={s.heading} className="space-y-1">
              <h3 className="text-xs font-bold text-neutral-800">{s.heading}</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">{s.body}</p>
            </div>
          ))}
          {content.contact && (
            <p className="text-xs text-neutral-500 leading-relaxed pt-2 border-t border-neutral-100">
              Questions? Contact us at{' '}
              <a href={`mailto:${content.contact}`} className="text-primary font-semibold hover:underline">{content.contact}</a>.
            </p>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-neutral-100">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
          {onAgree && (
            <button
              onClick={onAgree}
              className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-xs font-bold text-white rounded-xl transition-colors cursor-pointer flex items-center gap-2"
            >
              <Check size={14} />
              <span>I Agree</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'signup' | 'login') || 'signup';

  const [step, setStep] = useState<'signup' | 'otp'>('signup');
  const [countryCode, setCountryCode] = useState('+91');
  const [localPhone, setLocalPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(59);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showLegal, setShowLegal] = useState<LegalDoc | null>(null);
  const { logoUrl, brand } = useBrand()

  const fullPhoneNumber = `${countryCode}${localPhone}`;

  // Check if already authenticated on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        router.push('/organizations');
      } else {
        setCheckingAuth(false);
      }
    }
  }, [router]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (step === 'otp' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, countdown]);

  if (checkingAuth) {
    return (
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-[24px] p-8 shadow-[var(--shadow-card)] relative z-10 flex flex-col items-center justify-center py-20">
        <RefreshCw className="animate-spin text-primary" size={32} />
        <p className="text-xs text-neutral-500 mt-4 font-semibold">Checking authentication...</p>
      </div>
    );
  }

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localPhone || (mode === 'signup' && !fullName)) return;
    if (mode === 'signup' && !agreedToTerms) {
      setErrorMsg('Please accept the Terms & Conditions and Privacy Policy to continue.');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      await authApi.sendOtp(fullPhoneNumber, mode);

      // If signup, save name temporarily to store after verification
      if (mode === 'signup') {
        localStorage.setItem('temp_fullName', fullName);
      }

      setStep('otp');
      setCountdown(59);
    } catch (err: any) {
      setErrorMsg(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const tempName = localStorage.getItem('temp_fullName') || undefined;
      const data = await authApi.verifyOtp(fullPhoneNumber, otpCode, tempName, mode);

      // Store JWT token, refresh token, and user info
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      router.push('/organizations');
    } catch (err: any) {
      setErrorMsg(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setOtp(['', '', '', '', '', '']);
    setLoading(true);
    setErrorMsg('');
    try {
      await authApi.sendOtp(fullPhoneNumber, mode);
      setCountdown(59);
    } catch (err: any) {
      setErrorMsg(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-neutral-200 rounded-[24px] p-8 shadow-[var(--shadow-card)] relative z-10">

      {/* Logo & Heading */}
      <div className="flex flex-col items-center gap-2 text-center mb-8">
        {logoUrl ? (
          <img src={logoUrl} alt={brand.platformName} className='h-10 w-auto mb-2' />
        ) : (
          <span className="text-xl font-black tracking-tight text-primary mb-2">{brand.platformName}</span>
        )}
        <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
          {step === 'otp'
            ? 'Verify your number'
            : mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="text-xs text-neutral-500 max-w-[280px] leading-relaxed">
          {step === 'otp'
            ? 'Enter the 6-digit code we just sent you.'
            : mode === 'login'
              ? `Sign in to manage your gym on ${brand.platformName}.`
              : `Get started with ${brand.platformName} in under a minute.`}
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-danger-light border border-red-100 text-danger text-xs text-center font-semibold">
          {errorMsg}
        </div>
      )}

      {step === 'signup' ? (
        <form onSubmit={handleSignupSubmit} className="space-y-5">

          {mode === 'signup' && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Full Name</label>
              <input
                required
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-white border border-neutral-200 focus:border-primary focus:ring-4 focus:ring-primary-light rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
                placeholder="Marcus Vance"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Phone Number</label>
            <div className="flex gap-2">
              {/* Country Code Select Dropdown */}
              <div className="relative flex items-center bg-white border border-neutral-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary-light rounded-xl px-3 transition-all">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-transparent text-xs text-neutral-800 font-bold outline-none cursor-pointer pr-4 appearance-none relative z-10 py-3.5"
                >
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+61">🇦🇺 +61</option>
                  <option value="+971">🇦🇪 +971</option>
                  <option value="+65">🇸🇬 +65</option>
                  <option value="+49">🇩🇪 +49</option>
                  <option value="+33">🇫🇷 +33</option>
                  <option value="+81">🇯🇵 +81</option>
                  <option value="+55">🇧🇷 +55</option>
                  <option value="+52">🇲🇽 +52</option>
                </select>
                <div className="absolute right-2.5 text-neutral-400 pointer-events-none">
                  <ChevronDown size={12} />
                </div>
              </div>

              {/* Phone number digits input */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Phone size={14} />
                </div>
                <input
                  required
                  type="tel"
                  value={localPhone}
                  onChange={(e) => setLocalPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-white border border-neutral-200 focus:border-primary focus:ring-4 focus:ring-primary-light rounded-xl pl-10 pr-4 py-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
                  placeholder="7902992446"
                />
              </div>
            </div>
          </div>

          {/* Terms acceptance (required for new accounts) */}
          {mode === 'signup' && (
            <label className="flex items-start gap-2.5 cursor-pointer select-none group">
              <button
                type="button"
                role="checkbox"
                aria-checked={agreedToTerms}
                onClick={() => setAgreedToTerms(v => !v)}
                className={`mt-0.5 w-4 h-4 shrink-0 rounded-[5px] border flex items-center justify-center transition-all ${
                  agreedToTerms
                    ? 'bg-primary border-primary'
                    : 'bg-white border-neutral-300 group-hover:border-primary'
                }`}
              >
                {agreedToTerms && <Check size={11} className="text-white" strokeWidth={3} />}
              </button>
              <span className="text-[11px] text-neutral-500 leading-relaxed">
                I agree to the{' '}
                <button type="button" onClick={() => setShowLegal('terms')} className="text-primary font-semibold hover:underline">Terms &amp; Conditions</button>
                {' '}and{' '}
                <button type="button" onClick={() => setShowLegal('privacy')} className="text-primary font-semibold hover:underline">Privacy Policy</button>.
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'signup' && !agreedToTerms)}
            className="w-full py-4 bg-primary hover:bg-primary-hover text-xs font-bold text-white rounded-xl shadow-sm hover:shadow-[0_12px_40px_rgba(37,99,235,0.18)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="animate-spin" size={14} />
            ) : (
              <>
                <span>Send Verification Code</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>

          {/* Toggle link */}
          <div className="text-center text-xs mt-4">
            {mode === 'signup' ? (
              <p className="text-neutral-500">
                Already have an account?{' '}
                <a href="/auth?mode=login" className="text-primary hover:underline font-bold">Sign In</a>
              </p>
            ) : (
              <p className="text-neutral-500">
                New to GymFlow?{' '}
                <a href="/auth?mode=signup" className="text-primary hover:underline font-bold">Create Trial Account</a>
              </p>
            )}
          </div>
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit} className="space-y-6">
          <div className="text-center">
            <p className="text-xs text-neutral-500">
              We sent a 6-digit verification code to
            </p>
            <p className="text-xs font-bold text-neutral-800 mt-1">{fullPhoneNumber}</p>
          </div>

          {/* OTP Grid Inputs */}
          <div className="flex justify-between gap-2">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-${idx}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(e.target.value, idx)}
                onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                className="w-12 h-12 bg-white border border-neutral-200 focus:border-primary focus:ring-4 focus:ring-primary-light rounded-xl text-center text-sm font-black text-neutral-900 outline-none transition-all"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || otp.join('').length < 6}
            className="w-full py-4 bg-primary hover:bg-primary-hover text-xs font-bold text-white rounded-xl shadow-sm hover:shadow-[0_12px_40px_rgba(37,99,235,0.18)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="animate-spin" size={14} />
            ) : (
              <>
                <ShieldCheck size={14} />
                <span>Verify Code & Continue</span>
              </>
            )}
          </button>

          {/* Resend Logic */}
          <div className="text-center text-xs">
            <span className="text-neutral-500">Didn't receive code? </span>
            {countdown > 0 ? (
              <span className="text-neutral-500 font-medium">Resend in {countdown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                className="text-primary hover:text-primary-hover font-bold transition-colors cursor-pointer"
              >
                Resend Code
              </button>
            )}
          </div>
        </form>
      )}

      {/* Footer Policy links */}
      <p className="text-[10px] text-neutral-400 text-center mt-8 leading-relaxed">
        By continuing, you agree to our{' '}
        <button type="button" onClick={() => setShowLegal('terms')} className="text-neutral-500 hover:text-primary font-semibold cursor-pointer">Terms of Service</button>
        {' '}and{' '}
        <button type="button" onClick={() => setShowLegal('privacy')} className="text-neutral-500 hover:text-primary font-semibold cursor-pointer">Privacy Policy</button>.
      </p>

      {/* Legal document modal */}
      {showLegal && (
        <LegalModal
          doc={showLegal}
          brandName={brand.platformName}
          supportEmail={brand.supportEmail}
          onClose={() => setShowLegal(null)}
          onAgree={mode === 'signup' ? () => { setAgreedToTerms(true); setShowLegal(null); } : undefined}
        />
      )}

    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-background text-neutral-900 selection:bg-primary-light selection:text-primary font-sans flex items-center justify-center relative overflow-hidden px-6 py-10">

      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 -left-24 w-[380px] h-[380px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 w-[420px] h-[420px] rounded-full bg-primary/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
          }}
        />
      </div>

      <Suspense fallback={
        <div className="w-full max-w-md bg-white border border-neutral-200 rounded-[24px] p-8 shadow-[var(--shadow-card)] relative z-10 flex flex-col items-center justify-center py-20">
          <RefreshCw className="animate-spin text-primary" size={32} />
        </div>
      }>
        <AuthForm />
      </Suspense>

    </div>
  );
}
