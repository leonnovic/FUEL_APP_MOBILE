import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  Lock,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  X,
  CheckCircle2,
  Zap,
  Fuel,
} from "lucide-react";
import { useNavigate } from "react-router";
import Paywall from "./Paywall";
import {
  getSubscription,
  checkAccess,
} from "@/react-app/lib/subscriptionStore";

interface TrialGateProps {
  children: React.ReactNode;
}

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 9.99,
    period: "month",
    features: [
      "1 Station",
      "Basic Analytics",
      "Email Support",
      "5 Team Members",
    ],
    color: "blue",
  },
  {
    id: "pro",
    name: "Professional",
    price: 29.99,
    period: "month",
    features: [
      "5 Stations",
      "Advanced Analytics",
      "Priority Support",
      "Unlimited Team",
      "API Access",
      "Custom Reports",
    ],
    color: "amber",
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 99.99,
    period: "month",
    features: [
      "Unlimited Stations",
      "Full Analytics Suite",
      "24/7 Dedicated Support",
      "Unlimited Everything",
      "White-label Option",
      "SLA Guarantee",
    ],
    color: "purple",
  },
];

function getTrialState(): {
  startedAt: number;
  isExpired: boolean;
  minutesLeft: number;
} {
  try {
    const raw = localStorage.getItem("fuelpro_trial");
    if (!raw) {
      // First visit - start trial
      const now = Date.now();
      localStorage.setItem(
        "fuelpro_trial",
        JSON.stringify({ startedAt: now, status: "active" })
      );
      return { startedAt: now, isExpired: false, minutesLeft: 60 };
    }
    const data = JSON.parse(raw);
    const startedAt = data.startedAt || Date.now();
    const elapsed = (Date.now() - startedAt) / 1000 / 60; // minutes
    const minutesLeft = Math.max(0, 60 - elapsed);
    if (data.status === "paid")
      return { startedAt, isExpired: false, minutesLeft: Infinity };
    return { startedAt, isExpired: minutesLeft <= 0, minutesLeft };
  } catch {
    return { startedAt: Date.now(), isExpired: false, minutesLeft: 60 };
  }
}

export function markTrialPaid() {
  try {
    const raw = localStorage.getItem("fuelpro_trial");
    const data = raw ? JSON.parse(raw) : {};
    data.status = "paid";
    localStorage.setItem("fuelpro_trial", JSON.stringify(data));
  } catch {
    /* */
  }
}

export function useTrial() {
  const [trialState, setTrialState] = useState(getTrialState);
  const [tick, setTick] = useState(0);

  // Live countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTrialState(getTrialState());
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format remaining time
  const totalSeconds = Math.max(0, trialState.minutesLeft * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  const timeDisplay =
    hours > 0 ? `${hours}h ${mins}m ${secs}s` : `${mins}m ${secs}s`;

  const isPaid = trialState.minutesLeft === Infinity;
  const isInTrial = !trialState.isExpired && !isPaid;
  const isExpired = trialState.isExpired && !isPaid;

  return {
    ...trialState,
    isPaid,
    isInTrial,
    isExpired,
    timeDisplay,
    totalSeconds,
    minutesUsed: Math.round(60 - trialState.minutesLeft),
  };
}

export default function TrialGate({ children }: TrialGateProps) {
  const {
    isExpired,
    isPaid,
    isInTrial,
    minutesLeft,
    totalSeconds,
    timeDisplay,
  } = useTrial();
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  // Check subscription + trial expiry
  useEffect(() => {
    const sub = getSubscription();
    if (sub.status === "active") {
      setShowPaywall(false);
      return;
    }
    if (isExpired) setShowPaywall(true);
  }, [isExpired]);

  const handleSubscribe = useCallback(async (planId: string) => {
    setProcessing(true);
    await new Promise(r => setTimeout(r, 2000));
    markTrialPaid();
    setProcessing(false);
    setShowPaywall(false);
    // Show success toast
    const toast = document.createElement("div");
    toast.className =
      "fixed top-4 right-4 z-[9999] bg-green-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-slideIn";
    toast.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>Subscription activated! Welcome to FuelPro Pro.</span>';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }, []);

  // Trial banner shown during active trial
  if (isInTrial && !showPaywall) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-[998] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Clock
              size={13}
              className={totalSeconds < 300 ? "animate-pulse" : ""}
            />
            <span
              className={`font-semibold font-mono ${totalSeconds < 300 ? "text-red-100" : ""}`}
            >
              Trial: {timeDisplay} left
            </span>
            <span className="hidden sm:inline opacity-80">
              |{" "}
              {totalSeconds < 60
                ? "EXPIRING NOW!"
                : totalSeconds < 300
                  ? "Less than 5 min!"
                  : "Full access"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Progress bar */}
            <div className="hidden sm:block w-24 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${(totalSeconds / 3600) * 100}%` }}
              />
            </div>
            <button
              onClick={() => setShowPaywall(true)}
              className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-[10px] font-bold transition-all"
            >
              <Zap size={10} /> Upgrade Now
            </button>
          </div>
        </div>
        <div className="pt-7">{children}</div>
      </>
    );
  }

  // Paywall overlay - use Paywall component
  if (showPaywall || isExpired) {
    return (
      <Paywall
        onClose={() => {
          const sub = getSubscription();
          if (sub.status === "active" || sub.status === "trial") {
            setShowPaywall(false);
            window.location.reload();
          } else {
            setShowPaywall(false);
          }
        }}
      />
    );
  }

  // Paid user - render children normally
  return <>{children}</>;
}
