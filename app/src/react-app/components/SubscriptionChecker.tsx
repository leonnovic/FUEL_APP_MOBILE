import { useState, useEffect, type ReactNode } from "react";
import { useAuth } from "@/react-app/context/AuthContext";
import { checkSubscription, startTrial } from "@/react-app/lib/subscription";
import PaywallScreen from "./PaywallScreen";

interface SubscriptionCheckerProps {
  children: ReactNode;
}

export default function SubscriptionChecker({
  children,
}: SubscriptionCheckerProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    // Migrate old versioned trial keys to current key
    try {
      const oldV3 = localStorage.getItem("fuelpro_trial_v3");
      const current = localStorage.getItem("fuelpro_trial");
      if (oldV3 && !current) {
        localStorage.setItem("fuelpro_trial", oldV3);
      }
    } catch {
      /* */
    }

    // Auto-start trial for first-time users
    if (user && !localStorage.getItem("fuelpro_trial")) {
      const email = user.email || "anonymous@fuelpro.app";
      startTrial(user.id || email, email);
    }

    const timer = setTimeout(() => {
      const result = checkSubscription();
      setHasAccess(result.access);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0c0e] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white">
            Loading FuelPro...
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Checking subscription status
          </p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return <PaywallScreen onSubscriptionActive={() => setHasAccess(true)} />;
  }

  return <>{children}</>;
}
