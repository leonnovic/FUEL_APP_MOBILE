import { j as e } from "./trpc-DPYLJugK.js";
import { b as o } from "./vendor-ByIt1aj4.js";
import {
  a1 as D,
  V as O,
  U as z,
  y as M,
  a4 as c,
  x as V,
  s as B,
  au as G,
  ab as _,
  Y as L,
  r as v,
} from "./index-DGiOi-Vv.js";
import { S as T } from "./star-BMg4no7i.js";
const K = [
  {
    id: "r1",
    name: "5% Off Next Fill",
    points: 500,
    description: "Get 5% discount on your next fuel purchase",
    category: "discount",
  },
  {
    id: "r2",
    name: "Free Oil Check",
    points: 300,
    description: "Complimentary engine oil level check",
    category: "service",
  },
  {
    id: "r3",
    name: "Free Car Wash",
    points: 1e3,
    description: "Premium car wash service on us",
    category: "service",
  },
  {
    id: "r4",
    name: "10% Off Total",
    points: 2e3,
    description: "10% discount on entire purchase",
    category: "discount",
  },
  {
    id: "r5",
    name: "Free Engine Oil (1L)",
    points: 5e3,
    description: "1L of engine oil (5W-30)",
    category: "free_item",
  },
  {
    id: "r6",
    name: "Free Tire Pressure Service",
    points: 200,
    description: "Tire pressure check and fill",
    category: "service",
  },
];
function E(n) {
  return n >= 1e4
    ? "Platinum"
    : n >= 5e3
      ? "Gold"
      : n >= 1e3
        ? "Silver"
        : "Bronze";
}
function N(n) {
  switch (n) {
    case "Platinum":
      return "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300";
    case "Gold":
      return "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300";
    case "Silver":
      return "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300";
    default:
      return "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300";
  }
}
function q() {
  const { state: n } = D(),
    f = O(),
    [l, k] = o.useState(() => {
      try {
        return JSON.parse(localStorage.getItem("fuelpro_customers") || "[]");
      } catch {
        return I();
      }
    }),
    [x, w] = o.useState(""),
    [S, m] = o.useState(!1),
    [a, d] = o.useState({
      name: "",
      phone: "",
      email: "",
      vehicleReg: "",
      preferredFuel: "Both",
      notes: "",
    }),
    [s, g] = o.useState(null),
    [u, b] = o.useState(!1),
    y = f.currencySymbol,
    h = t => {
      (k(t), localStorage.setItem("fuelpro_customers", JSON.stringify(t)));
    },
    C = o.useMemo(() => {
      const t = x.toLowerCase();
      return l.filter(
        r =>
          r.name.toLowerCase().includes(t) ||
          r.phone.includes(t) ||
          r.vehicleReg.toLowerCase().includes(t)
      );
    }, [l, x]),
    P = l.reduce((t, r) => t + r.loyaltyPoints, 0),
    R = l.length > 0 ? l.reduce((t, r) => t + r.totalSpent, 0) / l.length : 0,
    F = () => {
      if (!a.name || !a.phone) return;
      const t = {
        ...a,
        id: `cust_${Date.now()}`,
        loyaltyPoints: 0,
        totalSpent: 0,
        visits: 0,
        lastVisit: "-",
        tier: "Bronze",
        joinDate: new Date().toISOString().split("T")[0],
      };
      (h([t, ...l]),
        d({
          name: "",
          phone: "",
          email: "",
          vehicleReg: "",
          preferredFuel: "Both",
          notes: "",
        }),
        m(!1));
    },
    p = (t, r) => {
      h(
        l.map(i => {
          if (i.id === t) {
            const j = i.loyaltyPoints + r;
            return {
              ...i,
              loyaltyPoints: j,
              tier: E(j),
              lastVisit: new Date().toISOString().split("T")[0],
            };
          }
          return i;
        })
      );
    },
    A = (t, r) => {
      h(
        l.map(i =>
          i.id === t
            ? { ...i, loyaltyPoints: Math.max(0, i.loyaltyPoints - r) }
            : i
        )
      );
    };
  return e.jsxs("div", {
    className: "space-y-6",
    children: [
      e.jsxs("div", {
        className:
          "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
        children: [
          e.jsxs("div", {
            className: "flex items-center gap-3",
            children: [
              e.jsx("div", {
                className: "p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl",
                children: e.jsx(z, {
                  size: 24,
                  className: "text-amber-600 dark:text-amber-400",
                }),
              }),
              e.jsxs("div", {
                children: [
                  e.jsx("h2", {
                    className:
                      "text-2xl font-bold text-gray-900 dark:text-white",
                    children: "Customer Loyalty",
                  }),
                  e.jsx("p", {
                    className: "text-sm text-gray-500 dark:text-gray-400",
                    children: "Manage customers, points & rewards",
                  }),
                ],
              }),
            ],
          }),
          e.jsxs("button", {
            onClick: () => m(!0),
            className:
              "px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors",
            children: [e.jsx(M, { size: 16 }), " Add Customer"],
          }),
        ],
      }),
      e.jsxs("div", {
        className: "grid grid-cols-2 sm:grid-cols-4 gap-4",
        children: [
          e.jsxs("div", {
            className:
              "bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700",
            children: [
              e.jsx("p", {
                className: "text-xs text-gray-500",
                children: "Total Members",
              }),
              e.jsx("p", {
                className: "text-2xl font-bold text-gray-900 dark:text-white",
                children: l.length,
              }),
            ],
          }),
          e.jsxs("div", {
            className:
              "bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700",
            children: [
              e.jsx("p", {
                className: "text-xs text-gray-500",
                children: "Points Issued",
              }),
              e.jsx("p", {
                className:
                  "text-2xl font-bold text-amber-600 dark:text-amber-400",
                children: c(P),
              }),
            ],
          }),
          e.jsxs("div", {
            className:
              "bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700",
            children: [
              e.jsx("p", {
                className: "text-xs text-gray-500",
                children: "Avg. Spend",
              }),
              e.jsxs("p", {
                className:
                  "text-2xl font-bold text-green-600 dark:text-green-400",
                children: [y, " ", c(R)],
              }),
            ],
          }),
          e.jsxs("div", {
            className:
              "bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700",
            children: [
              e.jsx("p", {
                className: "text-xs text-gray-500",
                children: "Avg. Visits",
              }),
              e.jsx("p", {
                className:
                  "text-2xl font-bold text-blue-600 dark:text-blue-400",
                children:
                  l.length > 0
                    ? (l.reduce((t, r) => t + r.visits, 0) / l.length).toFixed(
                        1
                      )
                    : "0",
              }),
            ],
          }),
        ],
      }),
      e.jsxs("div", {
        className: "relative",
        children: [
          e.jsx(V, {
            size: 16,
            className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400",
          }),
          e.jsx("input", {
            type: "text",
            placeholder: "Search by name, phone, or vehicle...",
            value: x,
            onChange: t => w(t.target.value),
            className:
              "w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white",
          }),
        ],
      }),
      S &&
        e.jsxs("div", {
          className:
            "bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-lg",
          children: [
            e.jsx("h3", {
              className:
                "text-sm font-semibold text-gray-800 dark:text-white mb-3",
              children: "New Customer",
            }),
            e.jsxs("div", {
              className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
              children: [
                e.jsx("input", {
                  placeholder: "Full Name *",
                  value: a.name,
                  onChange: t => d({ ...a, name: t.target.value }),
                  className:
                    "px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white",
                }),
                e.jsx("input", {
                  placeholder: "Phone *",
                  value: a.phone,
                  onChange: t => d({ ...a, phone: t.target.value }),
                  className:
                    "px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white",
                }),
                e.jsx("input", {
                  placeholder: "Email",
                  value: a.email,
                  onChange: t => d({ ...a, email: t.target.value }),
                  className:
                    "px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white",
                }),
                e.jsx("input", {
                  placeholder: "Vehicle Registration",
                  value: a.vehicleReg,
                  onChange: t => d({ ...a, vehicleReg: t.target.value }),
                  className:
                    "px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white",
                }),
                e.jsxs("select", {
                  value: a.preferredFuel,
                  onChange: t => d({ ...a, preferredFuel: t.target.value }),
                  className:
                    "px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white",
                  children: [
                    e.jsx("option", { value: "PMS", children: "PMS" }),
                    e.jsx("option", { value: "AGO", children: "AGO" }),
                    e.jsx("option", { value: "Both", children: "Both" }),
                  ],
                }),
                e.jsx("input", {
                  placeholder: "Notes",
                  value: a.notes,
                  onChange: t => d({ ...a, notes: t.target.value }),
                  className:
                    "px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white",
                }),
              ],
            }),
            e.jsxs("div", {
              className: "flex gap-2 mt-3",
              children: [
                e.jsx("button", {
                  onClick: F,
                  className:
                    "px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium",
                  children: "Add Customer",
                }),
                e.jsx("button", {
                  onClick: () => m(!1),
                  className:
                    "px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm",
                  children: "Cancel",
                }),
              ],
            }),
          ],
        }),
      s &&
        e.jsxs("div", {
          className: "grid grid-cols-1 lg:grid-cols-2 gap-4",
          children: [
            e.jsxs("div", {
              className:
                "bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 rounded-xl p-5 border border-amber-200 dark:border-amber-800",
              children: [
                e.jsxs("div", {
                  className: "flex items-center justify-between mb-3",
                  children: [
                    e.jsxs("div", {
                      className: "flex items-center gap-3",
                      children: [
                        e.jsx("div", {
                          className:
                            "w-12 h-12 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center",
                          children: e.jsx(B, {
                            size: 24,
                            className: "text-amber-700 dark:text-amber-300",
                          }),
                        }),
                        e.jsxs("div", {
                          children: [
                            e.jsx("h3", {
                              className:
                                "text-lg font-bold text-gray-900 dark:text-white",
                              children: s.name,
                            }),
                            e.jsx("span", {
                              className: `text-xs px-2 py-0.5 rounded-full border ${N(s.tier)}`,
                              children: s.tier,
                            }),
                          ],
                        }),
                      ],
                    }),
                    e.jsx("button", {
                      onClick: () => g(null),
                      className: "text-gray-400 hover:text-gray-600",
                      children: "Close",
                    }),
                  ],
                }),
                e.jsxs("div", {
                  className: "grid grid-cols-2 gap-3 text-sm mb-3",
                  children: [
                    e.jsxs("div", {
                      className:
                        "flex items-center gap-2 text-gray-600 dark:text-gray-400",
                      children: [e.jsx(G, { size: 14 }), s.phone],
                    }),
                    s.email &&
                      e.jsxs("div", {
                        className:
                          "flex items-center gap-2 text-gray-600 dark:text-gray-400",
                        children: [e.jsx(_, { size: 14 }), s.email],
                      }),
                    s.vehicleReg &&
                      e.jsxs("div", {
                        className:
                          "flex items-center gap-2 text-gray-600 dark:text-gray-400",
                        children: [e.jsx(L, { size: 14 }), s.vehicleReg],
                      }),
                    e.jsxs("div", {
                      className:
                        "flex items-center gap-2 text-gray-600 dark:text-gray-400",
                      children: [
                        e.jsx(T, { size: 14, className: "text-amber-500" }),
                        c(s.loyaltyPoints),
                        " pts",
                      ],
                    }),
                  ],
                }),
                e.jsxs("div", {
                  className: "flex gap-2",
                  children: [
                    e.jsx("button", {
                      onClick: () => p(s.id, 100),
                      className:
                        "px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium",
                      children: "+100 pts",
                    }),
                    e.jsx("button", {
                      onClick: () => p(s.id, 500),
                      className:
                        "px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium",
                      children: "+500 pts",
                    }),
                    e.jsx("button", {
                      onClick: () => p(s.id, 1e3),
                      className:
                        "px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium",
                      children: "+1000 pts",
                    }),
                    e.jsxs("button", {
                      onClick: () => b(!u),
                      className:
                        "px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium flex items-center gap-1",
                      children: [e.jsx(v, { size: 12 }), " Redeem"],
                    }),
                  ],
                }),
              ],
            }),
            u &&
              e.jsxs("div", {
                className:
                  "bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700",
                children: [
                  e.jsx("h3", {
                    className:
                      "text-sm font-semibold text-gray-800 dark:text-white mb-3",
                    children: "Available Rewards",
                  }),
                  e.jsx("div", {
                    className: "space-y-2 max-h-64 overflow-y-auto",
                    children: K.map(t => {
                      const r = s.loyaltyPoints >= t.points;
                      return e.jsxs(
                        "div",
                        {
                          className: `flex items-center justify-between p-3 rounded-lg border ${r ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10" : "border-gray-200 dark:border-gray-700 opacity-50"}`,
                          children: [
                            e.jsxs("div", {
                              children: [
                                e.jsx("p", {
                                  className:
                                    "text-sm font-medium dark:text-white",
                                  children: t.name,
                                }),
                                e.jsx("p", {
                                  className: "text-[11px] text-gray-500",
                                  children: t.description,
                                }),
                              ],
                            }),
                            e.jsxs("div", {
                              className: "text-right",
                              children: [
                                e.jsxs("p", {
                                  className:
                                    "text-xs font-semibold text-amber-600",
                                  children: [t.points, " pts"],
                                }),
                                r &&
                                  e.jsx("button", {
                                    onClick: () => A(s.id, t.points),
                                    className:
                                      "text-[10px] px-2 py-1 bg-green-600 text-white rounded mt-1",
                                    children: "Redeem",
                                  }),
                              ],
                            }),
                          ],
                        },
                        t.id
                      );
                    }),
                  }),
                ],
              }),
          ],
        }),
      e.jsx("div", {
        className:
          "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden",
        children: e.jsx("div", {
          className: "overflow-x-auto",
          children: e.jsxs("table", {
            className: "w-full text-sm",
            children: [
              e.jsx("thead", {
                children: e.jsxs("tr", {
                  className:
                    "bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700",
                  children: [
                    e.jsx("th", {
                      className: "text-left px-4 py-3",
                      children: "Customer",
                    }),
                    e.jsx("th", {
                      className: "text-left px-4 py-3",
                      children: "Contact",
                    }),
                    e.jsx("th", {
                      className: "text-right px-4 py-3",
                      children: "Points",
                    }),
                    e.jsx("th", {
                      className: "text-right px-4 py-3",
                      children: "Spent",
                    }),
                    e.jsx("th", {
                      className: "text-center px-4 py-3",
                      children: "Tier",
                    }),
                    e.jsx("th", {
                      className: "text-right px-4 py-3",
                      children: "Visits",
                    }),
                    e.jsx("th", {
                      className: "text-center px-4 py-3",
                      children: "Actions",
                    }),
                  ],
                }),
              }),
              e.jsx("tbody", {
                children: C.map(t =>
                  e.jsxs(
                    "tr",
                    {
                      onClick: () => g(t),
                      className:
                        "border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors",
                      children: [
                        e.jsxs("td", {
                          className: "px-4 py-3",
                          children: [
                            e.jsx("p", {
                              className: "font-medium dark:text-white",
                              children: t.name,
                            }),
                            e.jsxs("p", {
                              className: "text-[11px] text-gray-500",
                              children: [t.vehicleReg, " ", t.preferredFuel],
                            }),
                          ],
                        }),
                        e.jsx("td", {
                          className:
                            "px-4 py-3 text-gray-600 dark:text-gray-400",
                          children: t.phone,
                        }),
                        e.jsx("td", {
                          className:
                            "px-4 py-3 text-right font-semibold text-amber-600 dark:text-amber-400",
                          children: c(t.loyaltyPoints),
                        }),
                        e.jsxs("td", {
                          className: "px-4 py-3 text-right dark:text-white",
                          children: [y, c(t.totalSpent)],
                        }),
                        e.jsx("td", {
                          className: "px-4 py-3 text-center",
                          children: e.jsx("span", {
                            className: `text-[10px] px-2 py-0.5 rounded-full border ${N(t.tier)}`,
                            children: t.tier,
                          }),
                        }),
                        e.jsx("td", {
                          className: "px-4 py-3 text-right dark:text-white",
                          children: t.visits,
                        }),
                        e.jsx("td", {
                          className: "px-4 py-3 text-center",
                          children: e.jsx("button", {
                            onClick: r => {
                              (r.stopPropagation(), g(t), b(!0));
                            },
                            className:
                              "p-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 rounded-lg text-amber-600",
                            children: e.jsx(v, { size: 14 }),
                          }),
                        }),
                      ],
                    },
                    t.id
                  )
                ),
              }),
            ],
          }),
        }),
      }),
    ],
  });
}
function I() {
  return [
    {
      id: "cust_1",
      name: "John Kamau",
      phone: "+254712345678",
      email: "john@email.com",
      vehicleReg: "KCA 123A",
      loyaltyPoints: 3200,
      totalSpent: 45e3,
      visits: 23,
      lastVisit: "2026-05-10",
      preferredFuel: "PMS",
      tier: "Gold",
      notes: "Regular customer",
      joinDate: "2025-01-15",
    },
    {
      id: "cust_2",
      name: "Mary Ochieng",
      phone: "+254723456789",
      email: "mary@email.com",
      vehicleReg: "KDJ 456B",
      loyaltyPoints: 850,
      totalSpent: 12e3,
      visits: 8,
      lastVisit: "2026-05-09",
      preferredFuel: "AGO",
      tier: "Silver",
      notes: "",
      joinDate: "2025-06-20",
    },
    {
      id: "cust_3",
      name: "Peter Njoroge",
      phone: "+254734567890",
      email: "",
      vehicleReg: "KBM 789C",
      loyaltyPoints: 150,
      totalSpent: 3500,
      visits: 3,
      lastVisit: "2026-05-08",
      preferredFuel: "Both",
      tier: "Bronze",
      notes: "New customer",
      joinDate: "2026-04-01",
    },
    {
      id: "cust_4",
      name: "Grace Wanjiku",
      phone: "+254745678901",
      email: "grace@email.com",
      vehicleReg: "KCK 012D",
      loyaltyPoints: 12500,
      totalSpent: 18e4,
      visits: 67,
      lastVisit: "2026-05-11",
      preferredFuel: "PMS",
      tier: "Platinum",
      notes: "VIP - fleet manager",
      joinDate: "2024-03-10",
    },
    {
      id: "cust_5",
      name: "David Otieno",
      phone: "+254756789012",
      email: "",
      vehicleReg: "KDA 345E",
      loyaltyPoints: 600,
      totalSpent: 8500,
      visits: 5,
      lastVisit: "2026-05-07",
      preferredFuel: "AGO",
      tier: "Silver",
      notes: "",
      joinDate: "2026-02-15",
    },
  ];
}
export { q as default };
