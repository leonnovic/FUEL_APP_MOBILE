import { useState, type ReactNode } from 'react';
import { AlertTriangle, XCircle, CheckCircle2, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getEnv(key: string): string {
  try {
    return (import.meta as unknown as { env?: Record<string, string> }).env?.[key] ?? '';
  } catch {
    return '';
  }
}

const isProd = getEnv('VITE_APP_ENV') === 'production' ||
  (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1') && !window.location.hostname.includes('replit'));

// ─── Issue definitions ───────────────────────────────────────────────────────

interface EnvIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  variable: string;
  title: string;
  description: string;
  fix: string;
  impact: string;
}

function detectIssues(): EnvIssue[] {
  const issues: EnvIssue[] = [];

  // 1. Backend URL — falls back to window.location.origin, but on Vercel static the
  //    backend is a separate server so /api/* calls will 404.
  const backendUrl = getEnv('REACT_APP_BACKEND_URL') || getEnv('VITE_BACKEND_URL');
  if (!backendUrl) {
    issues.push({
      id: 'backend-url',
      severity: isProd ? 'critical' : 'warning',
      variable: 'REACT_APP_BACKEND_URL',
      title: 'Backend API URL not set',
      description: `API calls fall back to ${typeof window !== 'undefined' ? window.location.origin : 'window.location.origin'}. On a static host (Vercel, Render, Cloudflare Pages) your backend is a separate server, so auth, payments, and sync will 404.`,
      fix: 'Add REACT_APP_BACKEND_URL=https://your-backend.example.com to your deployment environment variables.',
      impact: 'Login, M-PESA payments, Stripe checkout, and cloud sync',
    });
  }

  // 2. Google OAuth client ID — has a hardcoded fallback but it's a demo ID
  //    that may not be authorized for the deployed origin.
  const googleId = getEnv('VITE_GOOGLE_CLIENT_ID');
  if (!googleId) {
    issues.push({
      id: 'google-client-id',
      severity: 'warning',
      variable: 'VITE_GOOGLE_CLIENT_ID',
      title: 'Google OAuth client ID not set',
      description: 'Google Sign-In is using a built-in fallback client ID that is only authorized for localhost. Sign-in attempts from your deployed domain will be blocked by Google with an "origin not allowed" error.',
      fix: 'Create an OAuth 2.0 Web Client ID at console.cloud.google.com and add VITE_GOOGLE_CLIENT_ID=<your-id>.apps.googleusercontent.com to your environment.',
      impact: 'Google Sign-In button',
    });
  }

  // 3. Firebase using dummy demo credentials
  //    Detect by checking if cloudSync lib would use the placeholder key.
  //    We check for the known placeholder string baked into cloudSync.ts.
  const firebaseSignal = 'AIzaSyDummyForDemo';
  if (typeof window !== 'undefined') {
    // We can't import cloudSync here, so we rely on a flag set by the module
    // if it detects dummy credentials — fall through gracefully if not present.
    const flag = (window as unknown as Record<string, unknown>).__FUELPRO_FIREBASE_DUMMY__;
    if (flag === true) {
      issues.push({
        id: 'firebase-dummy',
        severity: 'info',
        variable: 'FIREBASE_CONFIG (in cloudSync.ts)',
        title: 'Firebase using demo credentials',
        description: 'The cloudSync module is configured with placeholder Firebase credentials. Real-time cloud sync across devices is disabled; data is stored in localStorage only.',
        fix: `Replace the FIREBASE_CONFIG object in src/react-app/lib/cloudSync.ts with your real Firebase project credentials (apiKey, databaseURL, projectId, appId). Use the Firebase Console → Project Settings → Your apps.`,
        impact: 'Real-time multi-device cloud sync',
      });
      void firebaseSignal; // suppress unused-var lint
    }
  }

  return issues;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const SEVERITY_STYLES = {
  critical: {
    bg: 'bg-red-900/30 border-red-500/40',
    badge: 'bg-red-500/20 text-red-300 border border-red-500/30',
    icon: <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />,
    label: 'Critical',
  },
  warning: {
    bg: 'bg-amber-900/20 border-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    icon: <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />,
    label: 'Warning',
  },
  info: {
    bg: 'bg-blue-900/20 border-blue-500/30',
    badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    icon: <AlertTriangle size={16} className="text-blue-400 shrink-0 mt-0.5" />,
    label: 'Info',
  },
};

function IssueCard({ issue }: { issue: EnvIssue }) {
  const [expanded, setExpanded] = useState(issue.severity === 'critical');
  const [copied, setCopied] = useState(false);
  const s = SEVERITY_STYLES[issue.severity];

  const copyFix = () => {
    navigator.clipboard.writeText(issue.fix).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className={`rounded-xl border p-4 ${s.bg}`}>
      <button
        className="w-full flex items-start gap-3 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        {s.icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold text-sm">{issue.title}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.badge}`}>
              {s.label}
            </span>
          </div>
          <code className="text-xs text-gray-400 font-mono mt-0.5 block truncate">
            {issue.variable}
          </code>
        </div>
        <span className="text-gray-500 ml-2 shrink-0">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 pl-7 space-y-3">
          <p className="text-gray-300 text-xs leading-relaxed">{issue.description}</p>

          <div className="text-xs">
            <span className="text-gray-500 uppercase tracking-wide font-semibold text-[10px]">
              Affected feature
            </span>
            <p className="text-gray-300 mt-0.5">{issue.impact}</p>
          </div>

          <div className="text-xs">
            <span className="text-gray-500 uppercase tracking-wide font-semibold text-[10px]">
              How to fix
            </span>
            <div className="mt-1 bg-black/40 rounded-lg p-3 flex items-start gap-2">
              <p className="text-gray-200 leading-relaxed flex-1">{issue.fix}</p>
              <button
                onClick={copyFix}
                className="text-gray-400 hover:text-white transition-colors shrink-0"
                title="Copy fix instructions"
              >
                {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface EnvGuardProps {
  children: ReactNode;
}

export default function EnvGuard({ children }: EnvGuardProps) {
  const [dismissed, setDismissed] = useState(false);
  const issues = detectIssues();

  if (issues.length === 0 || dismissed) {
    return <>{children}</>;
  }

  const hasCritical = issues.some(i => i.severity === 'critical');

  // In production with only warnings/info, show a dismissable slim banner
  // instead of blocking the full screen.
  if (!hasCritical) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-900/90 backdrop-blur-sm border-b border-amber-500/40 px-4 py-2 flex items-center gap-3 text-xs">
          <AlertTriangle size={14} className="text-amber-400 shrink-0" />
          <span className="text-amber-200 flex-1">
            <strong>{issues.length} configuration {issues.length === 1 ? 'issue' : 'issues'}</strong> detected —{' '}
            {issues.map(i => i.title).join(', ')}.{' '}
            <button
              onClick={() => setDismissed(false)}
              className="underline hover:text-white transition-colors"
            >
              View details
            </button>
          </span>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-300 hover:text-white transition-colors font-bold shrink-0"
          >
            ✕
          </button>
        </div>
        <div className="pt-8">{children}</div>
      </>
    );
  }

  // Critical issues — show full-screen blocker (with "continue anyway" escape hatch)
  return (
    <>
      <div className="fixed inset-0 z-[9999] bg-[#0a0a10] flex items-start justify-center overflow-y-auto p-4 py-8">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <XCircle size={32} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white font-serif">Misconfigured Environment</h1>
            <p className="text-gray-400 mt-2 text-sm leading-relaxed">
              FuelPro detected {issues.length} configuration {issues.length === 1 ? 'issue' : 'issues'} that will
              prevent core features from working. Fix these before going live.
            </p>
          </div>

          {/* Issue cards */}
          <div className="space-y-3 mb-6">
            {issues.map(issue => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>

          {/* Env example link */}
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={14} className="text-green-400" />
              <span className="text-white text-xs font-semibold">Reference: .env.example</span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">
              Your repo includes a <code className="text-amber-300 font-mono">.env.example</code> file with all
              supported variables. Copy it to <code className="text-amber-300 font-mono">.env</code> for local
              development, or set the variables in your Vercel / Render / Cloudflare dashboard for production.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <a
              href="https://github.com/leonnovic/FUEL_APP_MOBILE/blob/main/frontend/.env.example"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 px-4 rounded-xl text-sm text-center transition-colors"
            >
              Open .env.example on GitHub
            </a>
            <button
              onClick={() => setDismissed(true)}
              className="w-full bg-white/5 hover:bg-white/10 text-gray-300 font-medium py-3 px-4 rounded-xl text-sm transition-colors border border-white/10"
            >
              Continue anyway (features may not work)
            </button>
          </div>
        </div>
      </div>
      {/* Render children underneath so React tree is initialised */}
      <div className="invisible" aria-hidden="true">{children}</div>
    </>
  );
}
