(() => {
  const themes = {
    midnight: { name: "Midnight", colors: ["#111214", "#313338"] },
    aurora: { name: "Aurora", colors: ["#10283a", "#7758d8"] },
    sunset: { name: "Sunset", colors: ["#642b73", "#f06f60"] },
    cotton: { name: "Cotton Candy", colors: ["#6f78e8", "#e278c2"] },
    galaxy: { name: "Galaxy", colors: ["#17122b", "#4f46a5"] },
    mint: { name: "Mint", colors: ["#123c3b", "#4c8b7b"] },
  };

  const saved = localStorage.getItem("solarcord-theme");
  let active = themes[saved] ? saved : "midnight";

  function apply(name) {
    active = themes[name] ? name : "midnight";
    document.documentElement.dataset.solarcordTheme = active;
    localStorage.setItem("solarcord-theme", active);
    document.querySelectorAll("[data-theme-name]").forEach((button) => {
      const selected = button.dataset.themeName === active;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    window.dispatchEvent(new CustomEvent("solarcord-theme-change", { detail: { theme: active } }));
  }

  function makeThemeButton(name, compact = false) {
    const theme = themes[name];
    const button = document.createElement("button");
    button.type = "button";
    button.className = `sc-theme-card${compact ? " compact" : ""}`;
    button.dataset.themeName = name;
    button.style.setProperty("--swatch-a", theme.colors[0]);
    button.style.setProperty("--swatch-b", theme.colors[1]);
    button.setAttribute("aria-label", `Use ${theme.name} theme`);
    const swatch = document.createElement("span");
    swatch.className = "sc-theme-swatch";
    const label = document.createElement("span");
    label.className = "sc-theme-label";
    label.textContent = theme.name;
    button.append(swatch, label);
    button.addEventListener("click", () => apply(name));
    return button;
  }

  function renderPickers() {
    const pickers = document.querySelectorAll("[data-theme-picker]");
    pickers.forEach((picker) => {
      picker.textContent = "";
      Object.keys(themes).forEach((name) => picker.append(makeThemeButton(name)));
    });
    if (pickers.length) return;

    if (/^\/(login|register)/.test(location.pathname)) {
      const brand = document.createElement("a");
      brand.id = "solarcord-auth-brand";
      brand.href = "/";
      brand.setAttribute("aria-label", "Solarcord home");
      const logo = document.createElement("img");
      logo.src = "/assets/solarcord-logo.png";
      logo.alt = "";
      const name = document.createElement("strong");
      name.textContent = "Solarcord";
      brand.append(logo, name);
      document.body.append(brand);
    }

    const launcher = document.createElement("button");
    launcher.id = "solarcord-theme-launcher";
    launcher.type = "button";
    launcher.title = "Solarcord themes";
    launcher.setAttribute("aria-label", "Open Solarcord theme picker");
    launcher.textContent = "✨";

    const panel = document.createElement("div");
    panel.id = "solarcord-theme-popover";
    panel.hidden = true;
    const heading = document.createElement("strong");
    heading.textContent = "Solarcord themes";
    const grid = document.createElement("div");
    grid.className = "sc-theme-popover-grid";
    Object.keys(themes).forEach((name) => grid.append(makeThemeButton(name, true)));
    panel.append(heading, grid);
    launcher.addEventListener("click", () => { panel.hidden = !panel.hidden; });
    document.addEventListener("click", (event) => {
      if (!panel.hidden && !panel.contains(event.target) && event.target !== launcher) panel.hidden = true;
    });
    document.body.append(panel, launcher);
  }

  document.documentElement.dataset.solarcordTheme = active;
  window.SolarcordThemes = { themes, apply, get active() { return active; } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { renderPickers(); apply(active); });
  else { renderPickers(); apply(active); }
  window.addEventListener("storage", (event) => {
    if (event.key === "solarcord-theme" && event.newValue) apply(event.newValue);
  });
})();
