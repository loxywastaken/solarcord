(() => {
  if (location.pathname === "/admin") return;
  const readToken = () => {
    const raw = localStorage.getItem("token");
    if (!raw) return "";
    try { return JSON.parse(raw); } catch { return raw; }
  };
  window.addEventListener("DOMContentLoaded", async () => {
    const token = readToken();
    if (!token) return;
    const response = await fetch("/api/admin", { headers: { Authorization: token } }).catch(() => null);
    if (!response?.ok) return;
    const link = document.createElement("a");
    link.href = "/admin";
    link.textContent = "Admin";
    link.title = "Open Solarcord admin panel";
    Object.assign(link.style, {
      position: "fixed", right: "18px", bottom: "18px", zIndex: "999999",
      padding: "10px 14px", borderRadius: "8px", color: "#ffffff",
      background: "#5865f2", font: "700 13px system-ui",
      boxShadow: "0 8px 30px #0007", transition: "background-color 0.17s ease"
    });
    link.addEventListener("mouseenter", () => { link.style.backgroundColor = "#4752c4"; });
    link.addEventListener("mouseleave", () => { link.style.backgroundColor = "#5865f2"; });
    document.body.appendChild(link);
  });
})();
