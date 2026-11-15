"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#fff8f0", color: "#17120e", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, textAlign: "center" }}>
        <div>
          <h1 style={{ fontSize: 28 }}>משהו השתבש · Something went wrong</h1>
          <button onClick={reset} style={{ marginTop: 16, padding: "12px 24px", borderRadius: 999, border: "2px solid #17120e", background: "#ff5a36", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            לנסות שוב · Try again
          </button>
        </div>
      </body>
    </html>
  );
}
