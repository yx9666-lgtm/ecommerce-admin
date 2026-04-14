"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ margin: 0, backgroundColor: "#0a0a0a", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: "3.75rem", fontWeight: "bold", color: "#f59e0b" }}>500</div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginTop: "1.5rem" }}>
              系统错误
            </h2>
            <p style={{ color: "#a1a1aa", marginTop: "0.75rem", maxWidth: "28rem" }}>
              系统发生了严重错误，请刷新页面重试。
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: "1.5rem",
                padding: "0.625rem 1.5rem",
                borderRadius: "9999px",
                border: "none",
                background: "linear-gradient(to right, #f59e0b, #ea580c)",
                color: "#fff",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              刷新页面
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
