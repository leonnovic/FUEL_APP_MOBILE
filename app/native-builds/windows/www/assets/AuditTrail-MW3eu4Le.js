import { j as e } from "./trpc-DPYLJugK.js";
import { b as f } from "./vendor-ByIt1aj4.js";
import {
  c as _,
  ay as M,
  x as U,
  v as J,
  w as $,
  R as W,
  b as F,
  S as K,
  ax as V,
  q as G,
  D as Y,
} from "./index-DWx9_kCh.js";
/**
 * @license lucide-react v0.510.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const H = [
    ["path", { d: "m21 16-4 4-4-4", key: "f6ql7i" }],
    ["path", { d: "M17 20V4", key: "1ejh1v" }],
    ["path", { d: "m3 8 4-4 4 4", key: "11wl7u" }],
    ["path", { d: "M7 4v16", key: "1glfcx" }],
  ],
  Q = _("arrow-up-down", H),
  X = "FuelProDB",
  Z = 1,
  m = "stationData",
  j = "syncMeta",
  p = "backups",
  S = "auditLog";
let N = null;
function y() {
  return new Promise((t, a) => {
    if (N) {
      t(N);
      return;
    }
    const r = indexedDB.open(X, Z);
    ((r.onerror = () => a(r.error)),
      (r.onsuccess = () => {
        ((N = r.result), t(N));
      }),
      (r.onupgradeneeded = s => {
        const n = s.target.result;
        if (
          (n.objectStoreNames.contains(m) ||
            n.createObjectStore(m, { keyPath: "key" }),
          n.objectStoreNames.contains(j) ||
            n.createObjectStore(j, { keyPath: "key" }),
          n.objectStoreNames.contains(p) ||
            n
              .createObjectStore(p, { keyPath: "id", autoIncrement: !0 })
              .createIndex("timestamp", "timestamp", { unique: !1 }),
          !n.objectStoreNames.contains(S))
        ) {
          const c = n.createObjectStore(S, {
            keyPath: "id",
            autoIncrement: !0,
          });
          (c.createIndex("timestamp", "timestamp", { unique: !1 }),
            c.createIndex("stationId", "stationId", { unique: !1 }),
            c.createIndex("action", "action", { unique: !1 }));
        }
      }));
  });
}
async function I(t, a) {
  const r = await y();
  return new Promise((s, n) => {
    const l = r
      .transaction([m], "readwrite")
      .objectStore(m)
      .put({ key: t, value: a, updatedAt: Date.now() });
    ((l.onsuccess = () => s()), (l.onerror = () => n(l.error)));
  });
}
async function ee(t) {
  const a = await y();
  return new Promise((r, s) => {
    const o = a.transaction([m], "readonly").objectStore(m).get(t);
    ((o.onsuccess = () => {
      var l;
      return r(((l = o.result) == null ? void 0 : l.value) ?? null);
    }),
      (o.onerror = () => s(o.error)));
  });
}
async function te(t) {
  const a = await y();
  return new Promise((r, s) => {
    const o = a.transaction([m], "readwrite").objectStore(m).delete(t);
    ((o.onsuccess = () => r()), (o.onerror = () => s(o.error)));
  });
}
async function O() {
  const t = await y();
  return new Promise((a, r) => {
    const c = t.transaction([m], "readonly").objectStore(m).getAll();
    ((c.onsuccess = () => {
      const o = {};
      (c.result.forEach(l => {
        o[l.key] = l.value;
      }),
        a(o));
    }),
      (c.onerror = () => r(c.error)));
  });
}
async function ae(t, a) {
  const r = await y();
  return new Promise((s, n) => {
    const l = r
      .transaction([j], "readwrite")
      .objectStore(j)
      .put({ key: t, ...a, updatedAt: Date.now() });
    ((l.onsuccess = () => s()), (l.onerror = () => n(l.error)));
  });
}
async function re(t) {
  const a = await y();
  return new Promise((r, s) => {
    const o = a.transaction([j], "readonly").objectStore(j).get(t);
    ((o.onsuccess = () => r(o.result ?? null)), (o.onerror = () => s(o.error)));
  });
}
async function T(t, a, r) {
  const s = await y(),
    n = JSON.stringify(a),
    c = {
      name: r || `Auto-backup ${new Date().toLocaleString()}`,
      stationId: t,
      timestamp: new Date().toISOString(),
      size: new Blob([n]).size,
      data: a,
      compressed: !1,
    };
  return new Promise((o, l) => {
    const g = s.transaction([p], "readwrite").objectStore(p).add(c);
    ((g.onsuccess = () => {
      ((c.id = g.result), o(c));
    }),
      (g.onerror = () => l(g.error)));
  });
}
async function B(t) {
  const a = await y();
  return new Promise((r, s) => {
    const o = a.transaction([p], "readonly").objectStore(p).getAll();
    ((o.onsuccess = () => {
      const l = o.result;
      r(
        l
          .filter(d => d.stationId === t)
          .sort(
            (d, u) =>
              new Date(u.timestamp).getTime() - new Date(d.timestamp).getTime()
          )
      );
    }),
      (o.onerror = () => s(o.error)));
  });
}
async function se(t) {
  const a = await y();
  return new Promise((r, s) => {
    const o = a.transaction([p], "readonly").objectStore(p).get(t);
    ((o.onsuccess = () => {
      var l;
      return r(((l = o.result) == null ? void 0 : l.data) ?? null);
    }),
      (o.onerror = () => s(o.error)));
  });
}
async function q(t) {
  const a = await y();
  return new Promise((r, s) => {
    const o = a.transaction([p], "readwrite").objectStore(p).delete(t);
    ((o.onsuccess = () => r()), (o.onerror = () => s(o.error)));
  });
}
let v = null;
function oe(t, a, r = 1e3 * 60 * 30) {
  (L(),
    (v = setInterval(async () => {
      try {
        const s = a();
        await T(t, s, `Auto ${new Date().toLocaleTimeString()}`);
        const n = await B(t);
        if (n.length > 50) for (const c of n.slice(50)) c.id && (await q(c.id));
      } catch (s) {
        console.error("Auto-backup failed:", s);
      }
    }, r)));
}
function L() {
  v && (clearInterval(v), (v = null));
}
const ne = {
  async save(t, a) {
    try {
      await I(t, a);
    } catch {
      localStorage.setItem(t, JSON.stringify(a));
    }
  },
  async load(t) {
    try {
      const a = await ee(t);
      if (a !== null) return a;
    } catch {}
    try {
      const a = localStorage.getItem(t);
      if (a) return JSON.parse(a);
    } catch {}
    return null;
  },
  async remove(t) {
    try {
      await te(t);
    } catch {}
    localStorage.removeItem(t);
  },
  async loadAll() {
    try {
      return await O();
    } catch {
      return {};
    }
  },
  createBackup: T,
  getBackups: B,
  restoreBackup: se,
  deleteBackup: q,
  startAutoBackup: oe,
  stopAutoBackup: L,
  setSyncMeta: ae,
  getSyncMeta: re,
  async exportAll() {
    const t = await O(),
      a = JSON.stringify(t, null, 2);
    return new Blob([a], { type: "application/json" });
  },
  async importAll(t) {
    const a = JSON.parse(t);
    for (const [r, s] of Object.entries(a)) await I(r, s);
  },
  async getStorageStats() {
    const t = await O(),
      a = new Blob([JSON.stringify(t)]).size;
    let r = 0;
    for (let s = 0; s < localStorage.length; s++)
      r += (localStorage.getItem(localStorage.key(s)) || "").length * 2;
    return {
      indexedDB: a,
      localStorage: r,
      totalKeys: Object.keys(t).length + localStorage.length,
    };
  },
};
async function E(t, a = 100) {
  const r = await y();
  return new Promise((s, n) => {
    const d = r
      .transaction([S], "readonly")
      .objectStore(S)
      .index("stationId")
      .getAll(t, a);
    ((d.onsuccess = () => {
      const u = d.result.sort(
        (g, k) =>
          new Date(k.timestamp).getTime() - new Date(g.timestamp).getTime()
      );
      s(u);
    }),
      (d.onerror = () => n(d.error)));
  });
}
async function ce(t, a, r = 50) {
  return (await E(t, r * 2)).filter(n => n.category === a).slice(0, r);
}
async function le(t = 90) {
  const a = await y(),
    r = Date.now() - t * 24 * 60 * 60 * 1e3;
  return new Promise((s, n) => {
    const l = a.transaction([S], "readwrite").objectStore(S).index("timestamp"),
      d = IDBKeyRange.upperBound(new Date(r).toISOString()),
      u = l.openCursor(d);
    ((u.onsuccess = () => {
      const g = u.result;
      g ? (g.delete(), g.continue()) : s();
    }),
      (u.onerror = () => n(u.error)));
  });
}
window.FuelProStorage = ne;
const P = {
  data: { icon: Y, color: "text-blue-600 dark:text-blue-400", label: "Data" },
  sale: { icon: G, color: "text-green-600 dark:text-green-400", label: "Sale" },
  payment: {
    icon: Q,
    color: "text-purple-600 dark:text-purple-400",
    label: "Payment",
  },
  inventory: {
    icon: V,
    color: "text-amber-600 dark:text-amber-400",
    label: "Inventory",
  },
  auth: { icon: K, color: "text-red-600 dark:text-red-400", label: "Auth" },
  config: {
    icon: F,
    color: "text-gray-600 dark:text-gray-400",
    label: "Config",
  },
  sync: { icon: W, color: "text-cyan-600 dark:text-cyan-400", label: "Sync" },
};
function xe({ stationId: t }) {
  const [a, r] = f.useState([]),
    [s, n] = f.useState(""),
    [c, o] = f.useState("all"),
    [l, d] = f.useState(!1),
    [u, g] = f.useState({ total: 0, today: 0, thisWeek: 0 }),
    k = async () => {
      d(!0);
      try {
        const i = c === "all" ? await E(t, 200) : await ce(t, c, 100);
        r(i);
        const x = new Date(),
          h = new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(),
          A = h - x.getDay() * 864e5;
        g({
          total: i.length,
          today: i.filter(w => new Date(w.timestamp).getTime() >= h).length,
          thisWeek: i.filter(w => new Date(w.timestamp).getTime() >= A).length,
        });
      } catch (i) {
        console.error(i);
      }
      d(!1);
    };
  f.useEffect(() => {
    k();
  }, [t, c]);
  const D = a.filter(i => {
      var x;
      return (
        i.action.toLowerCase().includes(s.toLowerCase()) ||
        i.details.toLowerCase().includes(s.toLowerCase()) ||
        ((x = i.user) == null
          ? void 0
          : x.toLowerCase().includes(s.toLowerCase()))
      );
    }),
    R = () => {
      const i = ["Timestamp", "Action", "Category", "User", "Details"],
        x = D.map(b => [
          b.timestamp,
          b.action,
          b.category,
          b.user || "-",
          b.details,
        ]),
        h = [i, ...x].map(b => b.map(z => `"${z}"`).join(",")).join(`
`),
        A = new Blob([h], { type: "text/csv" }),
        w = URL.createObjectURL(A),
        C = document.createElement("a");
      ((C.href = w),
        (C.download = `audit_trail_${t}_${new Date().toISOString().split("T")[0]}.csv`),
        C.click(),
        URL.revokeObjectURL(w));
    };
  return e.jsxs("div", {
    className: "space-y-6",
    children: [
      e.jsxs("div", {
        className: "flex items-center gap-3",
        children: [
          e.jsx("div", {
            className: "p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl",
            children: e.jsx(M, {
              size: 24,
              className: "text-indigo-600 dark:text-indigo-400",
            }),
          }),
          e.jsxs("div", {
            children: [
              e.jsx("h2", {
                className: "text-2xl font-bold text-gray-900 dark:text-white",
                children: "Audit Trail",
              }),
              e.jsx("p", {
                className: "text-sm text-gray-500 dark:text-gray-400",
                children: "Complete activity log for compliance",
              }),
            ],
          }),
        ],
      }),
      e.jsxs("div", {
        className: "grid grid-cols-3 gap-4",
        children: [
          e.jsxs("div", {
            className:
              "bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700",
            children: [
              e.jsx("p", {
                className: "text-xs text-gray-500",
                children: "Total Events",
              }),
              e.jsx("p", {
                className: "text-2xl font-bold text-gray-900 dark:text-white",
                children: u.total,
              }),
            ],
          }),
          e.jsxs("div", {
            className:
              "bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700",
            children: [
              e.jsx("p", {
                className: "text-xs text-gray-500",
                children: "Today",
              }),
              e.jsx("p", {
                className:
                  "text-2xl font-bold text-blue-600 dark:text-blue-400",
                children: u.today,
              }),
            ],
          }),
          e.jsxs("div", {
            className:
              "bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700",
            children: [
              e.jsx("p", {
                className: "text-xs text-gray-500",
                children: "This Week",
              }),
              e.jsx("p", {
                className:
                  "text-2xl font-bold text-green-600 dark:text-green-400",
                children: u.thisWeek,
              }),
            ],
          }),
        ],
      }),
      e.jsxs("div", {
        className: "flex flex-col sm:flex-row gap-3",
        children: [
          e.jsxs("div", {
            className: "relative flex-1",
            children: [
              e.jsx(U, {
                size: 16,
                className:
                  "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400",
              }),
              e.jsx("input", {
                type: "text",
                placeholder: "Search audit log...",
                value: s,
                onChange: i => n(i.target.value),
                className:
                  "w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white",
              }),
            ],
          }),
          e.jsxs("select", {
            value: c,
            onChange: i => o(i.target.value),
            className:
              "px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white",
            children: [
              e.jsx("option", { value: "all", children: "All Categories" }),
              e.jsx("option", { value: "data", children: "Data" }),
              e.jsx("option", { value: "sale", children: "Sales" }),
              e.jsx("option", { value: "payment", children: "Payments" }),
              e.jsx("option", { value: "inventory", children: "Inventory" }),
              e.jsx("option", { value: "auth", children: "Auth" }),
              e.jsx("option", { value: "config", children: "Config" }),
              e.jsx("option", { value: "sync", children: "Sync" }),
            ],
          }),
          e.jsxs("button", {
            onClick: R,
            className:
              "px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium flex items-center gap-2",
            children: [e.jsx(J, { size: 16 }), " Export"],
          }),
          e.jsxs("button", {
            onClick: async () => {
              (await le(90), k());
            },
            className:
              "px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium flex items-center gap-2",
            children: [e.jsx($, { size: 16 }), " Clean Old"],
          }),
        ],
      }),
      e.jsxs("div", {
        className:
          "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden",
        children: [
          e.jsx("div", {
            className: "overflow-x-auto max-h-[600px] overflow-y-auto",
            children: e.jsxs("table", {
              className: "w-full text-xs",
              children: [
                e.jsx("thead", {
                  className: "sticky top-0 bg-gray-50 dark:bg-gray-700 z-10",
                  children: e.jsxs("tr", {
                    className: "border-b border-gray-200 dark:border-gray-700",
                    children: [
                      e.jsx("th", {
                        className: "text-left px-3 py-2",
                        children: "Time",
                      }),
                      e.jsx("th", {
                        className: "text-left px-3 py-2",
                        children: "Action",
                      }),
                      e.jsx("th", {
                        className: "px-3 py-2",
                        children: "Category",
                      }),
                      e.jsx("th", {
                        className: "text-left px-3 py-2",
                        children: "User",
                      }),
                      e.jsx("th", {
                        className: "text-left px-3 py-2",
                        children: "Details",
                      }),
                    ],
                  }),
                }),
                e.jsx("tbody", {
                  children: D.map(i => {
                    const x = P[i.category] || P.data,
                      h = x.icon;
                    return e.jsxs(
                      "tr",
                      {
                        className:
                          "border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors",
                        children: [
                          e.jsx("td", {
                            className:
                              "px-3 py-2 text-gray-500 whitespace-nowrap",
                            children: new Date(i.timestamp).toLocaleString(),
                          }),
                          e.jsx("td", {
                            className: "px-3 py-2 font-medium dark:text-white",
                            children: i.action,
                          }),
                          e.jsx("td", {
                            className: "px-3 py-2",
                            children: e.jsxs("span", {
                              className: `flex items-center gap-1 ${x.color}`,
                              children: [e.jsx(h, { size: 12 }), x.label],
                            }),
                          }),
                          e.jsx("td", {
                            className: "px-3 py-2 text-gray-500",
                            children: i.user || "System",
                          }),
                          e.jsx("td", {
                            className:
                              "px-3 py-2 text-gray-600 dark:text-gray-400 max-w-xs truncate",
                            children: i.details,
                          }),
                        ],
                      },
                      i.id
                    );
                  }),
                }),
              ],
            }),
          }),
          D.length === 0 &&
            !l &&
            e.jsx("p", {
              className: "text-center text-sm text-gray-500 py-8",
              children:
                "No audit entries found. Activities will be logged automatically as you use the system.",
            }),
        ],
      }),
    ],
  });
}
export { xe as default };
