import {
  c as E,
  aC as C,
  aK as R,
  G as A,
  aq as I,
  x as M,
  Y as z,
} from "./index-DGiOi-Vv.js";
import { j as t } from "./trpc-DPYLJugK.js";
import { b as r } from "./vendor-ByIt1aj4.js";
/**
 * @license lucide-react v0.510.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const U = [
    ["line", { x1: "3", x2: "21", y1: "22", y2: "22", key: "j8o0r" }],
    ["line", { x1: "6", x2: "6", y1: "18", y2: "11", key: "10tf0k" }],
    ["line", { x1: "10", x2: "10", y1: "18", y2: "11", key: "54lgf6" }],
    ["line", { x1: "14", x2: "14", y1: "18", y2: "11", key: "380y" }],
    ["line", { x1: "18", x2: "18", y1: "18", y2: "11", key: "1kevvc" }],
    ["polygon", { points: "12 2 20 7 4 7", key: "jkujk7" }],
  ],
  K = E("landmark", U);
function q({
  value: f,
  onChange: c,
  label: b = "Select Country / Region",
  placeholder: g = "Search countries...",
  className: v = "",
  id: N,
  showFlag: w = !0,
  filterCountries: d,
  showAutoDetect: S = !0,
}) {
  const [l, a] = r.useState(!1),
    [m, n] = r.useState(""),
    [p, h] = r.useState(0),
    y = r.useRef(null),
    k = r.useRef(null),
    i = r.useMemo(() => {
      let e = C;
      if (d != null && d.length) {
        const s = d.map(x => x.toUpperCase());
        e = e.filter(x => s.includes(x.code));
      }
      return e;
    }, [d]),
    o = r.useMemo(() => {
      const e = m.trim().toLowerCase();
      return e
        ? i.filter(
            s =>
              s.name.toLowerCase().includes(e) ||
              s.code.toLowerCase().includes(e) ||
              s.currency.toLowerCase().includes(e)
          )
        : i;
    }, [m, i]),
    u = r.useMemo(() => i.find(e => e.code === f) || null, [f, i]),
    L = r.useCallback(() => {
      try {
        const s = localStorage.getItem("fuelpro_location_country");
        if (s) {
          const x = JSON.parse(s),
            j = x.currentCountry || x.country;
          if (j) {
            (c(j.toUpperCase()), a(!1), n(""));
            return;
          }
        }
      } catch {}
      const e = R();
      (e !== "US" && c(e), a(!1), n(""));
    }, [c]);
  (r.useEffect(() => {
    const e = s => {
      y.current && !y.current.contains(s.target) && (a(!1), n(""));
    };
    return (
      document.addEventListener("mousedown", e),
      () => document.removeEventListener("mousedown", e)
    );
  }, []),
    r.useEffect(() => {
      l &&
        (setTimeout(() => {
          var e;
          return (e = k.current) == null ? void 0 : e.focus();
        }, 50),
        h(0));
    }, [l]));
  const D = r.useCallback(
    e => {
      if (l)
        switch (e.key) {
          case "ArrowDown":
            (e.preventDefault(), h(s => Math.min(s + 1, o.length - 1)));
            break;
          case "ArrowUp":
            (e.preventDefault(), h(s => Math.max(s - 1, 0)));
            break;
          case "Enter":
            (e.preventDefault(), o[p] && (c(o[p].code), a(!1), n("")));
            break;
          case "Escape":
            (a(!1), n(""));
            break;
        }
    },
    [l, o, p, c]
  );
  return t.jsxs("div", {
    className: `relative ${v}`,
    ref: y,
    onKeyDown: D,
    children: [
      b &&
        t.jsxs("label", {
          className:
            "text-xs text-gray-400 mb-1.5 block flex items-center gap-1",
          children: [t.jsx(A, { size: 11 }), " ", b],
        }),
      t.jsxs("button", {
        type: "button",
        id: N,
        onClick: () => a(e => !e),
        className:
          "w-full flex items-center justify-between gap-2 px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white hover:bg-white/[0.06] focus:outline-none focus:border-amber-500/30 transition-colors",
        children: [
          t.jsxs("div", {
            className: "flex items-center gap-2 min-w-0",
            children: [
              w &&
                u &&
                t.jsx("span", {
                  className: "text-base shrink-0",
                  children: u.flag,
                }),
              t.jsx("span", {
                className: "truncate",
                children: u ? `${u.code} - ${u.name}` : g,
              }),
            ],
          }),
          t.jsx(I, {
            size: 14,
            className: `text-gray-500 shrink-0 transition-transform ${l ? "rotate-180" : ""}`,
          }),
        ],
      }),
      l &&
        t.jsxs("div", {
          className:
            "absolute z-[100] mt-1 w-full bg-[#1c1c1e] border border-white/[0.08] rounded-lg shadow-2xl overflow-hidden",
          children: [
            t.jsxs("div", {
              className:
                "flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]",
              children: [
                t.jsx(M, { size: 13, className: "text-gray-500 shrink-0" }),
                t.jsx("input", {
                  ref: k,
                  type: "text",
                  value: m,
                  onChange: e => {
                    (n(e.target.value), h(0));
                  },
                  placeholder: g,
                  className:
                    "flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none",
                }),
                S &&
                  t.jsxs("button", {
                    type: "button",
                    onClick: L,
                    className:
                      "shrink-0 flex items-center gap-1 px-2 py-0.5 text-[10px] bg-amber-500/10 text-amber-400 rounded hover:bg-amber-500/20 transition-colors",
                    title: "Auto-detect from location",
                    children: [t.jsx(z, { size: 9 }), " Auto"],
                  }),
              ],
            }),
            t.jsxs("div", {
              className:
                "px-3 py-1 text-[10px] text-gray-600 border-b border-white/[0.04]",
              children: [o.length, " of ", i.length, " countries"],
            }),
            t.jsx("div", {
              className: "max-h-56 overflow-y-auto",
              children:
                o.length === 0
                  ? t.jsxs("div", {
                      className: "px-3 py-4 text-center text-xs text-gray-600",
                      children: ['No countries match "', m, '"'],
                    })
                  : o.map((e, s) =>
                      t.jsxs(
                        "button",
                        {
                          type: "button",
                          onClick: () => {
                            (c(e.code), a(!1), n(""));
                          },
                          className: `w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors text-left ${e.code === f ? "bg-amber-500/10 text-amber-300" : s === p ? "bg-white/[0.06] text-white" : "text-gray-300 hover:bg-white/[0.04]"}`,
                          children: [
                            w &&
                              t.jsx("span", {
                                className: "text-base shrink-0",
                                children: e.flag,
                              }),
                            t.jsx("span", {
                              className: "truncate flex-1",
                              children: e.name,
                            }),
                            t.jsx("span", {
                              className:
                                "text-[10px] text-gray-600 shrink-0 ml-1",
                              children: e.code,
                            }),
                            t.jsx("span", {
                              className: "text-[10px] text-gray-700 shrink-0",
                              children: e.currency,
                            }),
                          ],
                        },
                        e.code
                      )
                    ),
            }),
          ],
        }),
    ],
  });
}
export { K as L, q as S };
