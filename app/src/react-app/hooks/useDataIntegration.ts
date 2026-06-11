import { useCallback, useEffect } from "react";

// ============================================================
// useDataIntegration - Cross-tab data synchronization
// Links all components so data flows seamlessly across tabs
// ============================================================

interface SaleEvent {
  fuelType: "PMS" | "AGO";
  quantity: number; // liters
  amount: number;
  customerName?: string;
  customerPhone?: string;
  timestamp: string;
}

interface DeliveryEvent {
  fuelType: "PMS" | "AGO";
  quantity: number; // liters
  supplier: string;
  timestamp: string;
}

interface TankUpdateEvent {
  pmsTankClosing: number;
  agoTankClosing: number;
  timestamp: string;
}

export function useDataIntegration(stationId: string) {
  const STORAGE_PREFIX = `fuelpro_${stationId}`;

  // Record a fuel sale - triggers inventory update, customer loyalty, tank levels
  const recordSale = useCallback(
    (sale: SaleEvent) => {
      // 1. Update tank levels
      const currentTanks = JSON.parse(
        localStorage.getItem(`${STORAGE_PREFIX}_tanks`) || '{"pms":0,"ago":0}'
      );
      if (sale.fuelType === "PMS")
        currentTanks.pms = Math.max(0, currentTanks.pms - sale.quantity);
      else currentTanks.ago = Math.max(0, currentTanks.ago - sale.quantity);
      localStorage.setItem(
        `${STORAGE_PREFIX}_tanks`,
        JSON.stringify(currentTanks)
      );

      // 2. Award loyalty points if customer identified
      if (sale.customerName && sale.customerPhone) {
        const points = Math.floor(sale.amount / 100); // 1 point per Ksh 100 spent
        awardLoyaltyPoints(sale.customerPhone, points, sale.amount);
      }

      // 3. Update daily sales summary
      const today = new Date().toISOString().split("T")[0];
      const dailyKey = `${STORAGE_PREFIX}_daily_${today}`;
      const daily = JSON.parse(
        localStorage.getItem(dailyKey) ||
          '{"pmsQty":0,"agoQty":0,"pmsRevenue":0,"agoRevenue":0,"transactions":0}'
      );
      if (sale.fuelType === "PMS") {
        daily.pmsQty += sale.quantity;
        daily.pmsRevenue += sale.amount;
      } else {
        daily.agoQty += sale.quantity;
        daily.agoRevenue += sale.amount;
      }
      daily.transactions++;
      localStorage.setItem(dailyKey, JSON.stringify(daily));

      // 4. Log to audit trail
      logAudit(
        "sale",
        `Sold ${sale.quantity}L of ${sale.fuelType} for Ksh ${sale.amount}`,
        sale
      );

      // 5. Dispatch event for real-time updates
      window.dispatchEvent(new CustomEvent("fuelpro-sale", { detail: sale }));
    },
    [STORAGE_PREFIX]
  );

  // Record fuel delivery - updates tank levels
  const recordDelivery = useCallback(
    (delivery: DeliveryEvent) => {
      const currentTanks = JSON.parse(
        localStorage.getItem(`${STORAGE_PREFIX}_tanks`) || '{"pms":0,"ago":0}'
      );
      if (delivery.fuelType === "PMS") currentTanks.pms += delivery.quantity;
      else currentTanks.ago += delivery.quantity;
      localStorage.setItem(
        `${STORAGE_PREFIX}_tanks`,
        JSON.stringify(currentTanks)
      );

      logAudit(
        "inventory",
        `Received ${delivery.quantity}L of ${delivery.fuelType} from ${delivery.supplier}`,
        delivery
      );
      window.dispatchEvent(
        new CustomEvent("fuelpro-delivery", { detail: delivery })
      );
    },
    [STORAGE_PREFIX]
  );

  // Award loyalty points
  const awardLoyaltyPoints = useCallback(
    (phone: string, points: number, amount: number) => {
      try {
        const customers = JSON.parse(
          localStorage.getItem("fuelpro_customers") || "[]"
        );
        const idx = customers.findIndex((c: any) => c.phone === phone);
        if (idx >= 0) {
          customers[idx].loyaltyPoints =
            (customers[idx].loyaltyPoints || 0) + points;
          customers[idx].totalSpent = (customers[idx].totalSpent || 0) + amount;
          customers[idx].visits = (customers[idx].visits || 0) + 1;
          customers[idx].lastVisit = new Date().toISOString().split("T")[0];
          // Update tier
          const totalPts = customers[idx].loyaltyPoints;
          customers[idx].tier =
            totalPts >= 10000
              ? "Platinum"
              : totalPts >= 5000
                ? "Gold"
                : totalPts >= 1000
                  ? "Silver"
                  : "Bronze";
          localStorage.setItem("fuelpro_customers", JSON.stringify(customers));
          window.dispatchEvent(
            new CustomEvent("fuelpro-loyalty-update", {
              detail: { phone, points },
            })
          );
        }
      } catch {
        /* ignore */
      }
    },
    []
  );

  // Update tank levels from dip measurement
  const updateTankLevels = useCallback(
    (update: TankUpdateEvent) => {
      localStorage.setItem(
        `${STORAGE_PREFIX}_tanks`,
        JSON.stringify({
          pms: update.pmsTankClosing,
          ago: update.agoTankClosing,
          timestamp: update.timestamp,
        })
      );
      logAudit(
        "inventory",
        `Tank levels updated: PMS=${update.pmsTankClosing}L, AGO=${update.agoTankClosing}L`,
        update
      );
      window.dispatchEvent(
        new CustomEvent("fuelpro-tank-update", { detail: update })
      );
    },
    [STORAGE_PREFIX]
  );

  // Record credit sale
  const recordCreditSale = useCallback(
    (accountId: string, amount: number, description: string) => {
      try {
        const accounts = JSON.parse(
          localStorage.getItem("fuelpro_credit_accounts") || "[]"
        );
        const idx = accounts.findIndex((a: any) => a.id === accountId);
        if (idx >= 0) {
          accounts[idx].balanceUsed = (accounts[idx].balanceUsed || 0) + amount;
          accounts[idx].totalPurchases =
            (accounts[idx].totalPurchases || 0) + amount;
          localStorage.setItem(
            "fuelpro_credit_accounts",
            JSON.stringify(accounts)
          );

          // Also record transaction
          const txs = JSON.parse(
            localStorage.getItem("fuelpro_credit_tx") || "[]"
          );
          txs.unshift({
            id: `ctx_${Date.now()}`,
            accountId,
            type: "purchase",
            amount,
            description,
            date: new Date().toISOString(),
            recordedBy: "System",
          });
          localStorage.setItem(
            "fuelpro_credit_tx",
            JSON.stringify(txs.slice(0, 200))
          );

          logAudit(
            "payment",
            `Credit sale: Ksh ${amount} to ${accounts[idx].customerName}`,
            { accountId, amount }
          );
          window.dispatchEvent(
            new CustomEvent("fuelpro-credit-update", {
              detail: { accountId, amount },
            })
          );
        }
      } catch {
        /* ignore */
      }
    },
    []
  );

  // Record shift activity
  const recordShiftActivity = useCallback(
    (
      employeeId: string,
      action: "checkin" | "checkout",
      pumpAssignment?: string
    ) => {
      try {
        const shifts = JSON.parse(
          localStorage.getItem("fuelpro_shifts") || "[]"
        );
        const today = new Date().toISOString().split("T")[0];

        if (action === "checkin") {
          const employees = JSON.parse(
            localStorage.getItem("fuelpro_employees") || "[]"
          );
          const emp = employees.find((e: any) => e.id === employeeId);
          shifts.unshift({
            id: `shift_${Date.now()}`,
            employeeName: emp?.name || "Unknown",
            role: emp?.role || "Staff",
            date: today,
            startTime: new Date().toTimeString().slice(0, 5),
            endTime: "",
            shiftType: "morning",
            pumpAssigned: pumpAssignment || "Any",
            status: "active",
            notes: "",
            checkIn: new Date().toISOString(),
            employeeId,
          } as any);
        } else {
          const activeShift = shifts.find(
            (s: any) => s.employeeId === employeeId && s.status === "active"
          );
          if (activeShift) {
            activeShift.status = "completed";
            activeShift.checkOut = new Date().toISOString();
          }
        }
        localStorage.setItem("fuelpro_shifts", JSON.stringify(shifts));
        window.dispatchEvent(
          new CustomEvent("fuelpro-shift-update", {
            detail: { employeeId, action },
          })
        );
      } catch {
        /* ignore */
      }
    },
    []
  );

  // Record inventory adjustment
  const recordInventoryAdjustment = useCallback(
    (itemId: string, quantity: number, type: "in" | "out", reason: string) => {
      try {
        const items = JSON.parse(
          localStorage.getItem("fuelpro_inventory") || "[]"
        );
        const idx = items.findIndex((i: any) => i.id === itemId);
        if (idx >= 0) {
          if (type === "in") items[idx].quantity += quantity;
          else
            items[idx].quantity = Math.max(0, items[idx].quantity - quantity);
          items[idx].lastRestocked = new Date().toISOString().split("T")[0];
          localStorage.setItem("fuelpro_inventory", JSON.stringify(items));

          // Log movement
          const movements = JSON.parse(
            localStorage.getItem("fuelpro_inventory_movements") || "[]"
          );
          movements.unshift({
            id: `mov_${Date.now()}`,
            itemId,
            type,
            quantity,
            reason,
            timestamp: new Date().toISOString(),
            user: "Current User",
          });
          localStorage.setItem(
            "fuelpro_inventory_movements",
            JSON.stringify(movements.slice(0, 200))
          );

          logAudit(
            "inventory",
            `${type === "in" ? "Stock in" : "Stock out"}: ${quantity} x ${items[idx].name} (${reason})`,
            { itemId, quantity, type }
          );
          window.dispatchEvent(
            new CustomEvent("fuelpro-inventory-update", {
              detail: { itemId, quantity, type },
            })
          );
        }
      } catch {
        /* ignore */
      }
    },
    []
  );

  // Get daily summary
  const getDailySummary = useCallback(
    (date?: string) => {
      const d = date || new Date().toISOString().split("T")[0];
      const daily = JSON.parse(
        localStorage.getItem(`${STORAGE_PREFIX}_daily_${d}`) || "null"
      );
      if (!daily)
        return {
          pmsQty: 0,
          agoQty: 0,
          pmsRevenue: 0,
          agoRevenue: 0,
          transactions: 0,
        };
      return daily;
    },
    [STORAGE_PREFIX]
  );

  // Get current tank levels
  const getTankLevels = useCallback(() => {
    return JSON.parse(
      localStorage.getItem(`${STORAGE_PREFIX}_tanks`) || '{"pms":0,"ago":0}'
    );
  }, [STORAGE_PREFIX]);

  return {
    recordSale,
    recordDelivery,
    recordCreditSale,
    recordShiftActivity,
    recordInventoryAdjustment,
    updateTankLevels,
    getDailySummary,
    getTankLevels,
  };
}

// Helper: log to audit trail
function logAudit(category: string, details: string, data?: any) {
  try {
    const entry = {
      stationId: "default",
      action: category,
      category,
      details,
      user: "System",
      ...(data && { newValue: data }),
    };
    window.dispatchEvent(
      new CustomEvent("fuelpro-audit-log", { detail: entry })
    );
  } catch {
    /* ignore */
  }
}
