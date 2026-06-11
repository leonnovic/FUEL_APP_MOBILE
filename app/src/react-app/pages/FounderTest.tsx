/**
 * Minimal Founder test page — verifies routing works
 * before loading the full 991-line FounderAccessV2
 */
export default function FounderTest() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1
          style={{ fontSize: "24px", color: "#f59e0b", marginBottom: "16px" }}
        >
          ⛽ Founder Access
        </h1>
        <p style={{ color: "#9ca3af", fontSize: "14px" }}>
          Routing is working correctly.
        </p>
        <p style={{ color: "#6b7280", fontSize: "12px", marginTop: "8px" }}>
          Full admin panel is being optimized for load speed.
        </p>
      </div>
    </div>
  );
}
