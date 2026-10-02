(() => {
  const notice = document.querySelector("#notice");
  const tbody = document.querySelector("#users");
  const search = document.querySelector("#search");
  const serverBody = document.querySelector("#servers");
  const moderationServer = document.querySelector("#moderation-server");
  const moderationBody = document.querySelector("#moderation-members");
  const boostServer = document.querySelector("#boost-server");
  const boostDashboard = document.querySelector("#boost-dashboard");
  const clydeStatus = document.querySelector("#clyde-status");
  const repairClyde = document.querySelector("#repair-clyde");
  let users = [];
  let servers = [];
  let ownerId = "";

  const getToken = () => {
    const value = localStorage.getItem("token");
    if (!value) return "";
    try { return JSON.parse(value); } catch { return value; }
  };

  const token = getToken();
  const headers = { Authorization: token, "Content-Type": "application/json" };
  const escape = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  const showNotice = (message, error = false) => {
    notice.textContent = message;
    notice.className = `notice${error ? " error" : ""}`;
  };

  async function api(path, options = {}) {
    const response = await fetch(`/api/admin${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`);
    return body;
  }

  function render() {
    const query = search.value.trim().toLowerCase();
    const filtered = users.filter((user) => `${user.username} ${user.email || ""} ${user.id}`.toLowerCase().includes(query));
    tbody.innerHTML = filtered.length ? filtered.map((user) => {
      const self = user.id === ownerId;
      const service = user.system || (user.bot && user.username === "Clyde");
      const status = [
        user.terminated ? '<span class="pill terminated">Terminated</span>' : "",
        user.system ? '<span class="pill system">Solarcord System</span>' : "",
        user.operator ? '<span class="pill owner">Operator</span>' : "",
        user.premium ? '<span class="pill premium">Premium</span>' : "",
        user.verified ? '<span class="pill good">Verified</span>' : '<span class="pill">Unverified</span>',
        user.disabled ? '<span class="pill warn">Disabled</span>' : '<span class="pill good">Active</span>',
      ].join("");
      const actions = user.terminated
        ? `<button data-id="${escape(user.id)}" data-action="restore">Restore account</button>`
        : `<div class="action-group">
            <button data-id="${escape(user.id)}" data-action="${user.disabled ? "enable" : "disable"}" class="${user.disabled ? "" : "danger"}" ${self || service ? "disabled" : ""}>${user.disabled ? "Enable" : "Suspend"}</button>
            ${user.verified ? "" : `<button data-id="${escape(user.id)}" data-action="verify" ${service ? "disabled" : ""}>Verify</button>`}
            <button data-id="${escape(user.id)}" data-action="${user.operator ? "revokeOperator" : "grantOperator"}" ${self || service ? "disabled" : ""}>${user.operator ? "Remove operator" : "Make operator"}</button>
            <button data-id="${escape(user.id)}" data-action="${user.premium ? "revokePremium" : "grantPremium"}" ${service ? "disabled" : ""}>${user.premium ? "Remove Premium" : "Grant Premium"}</button>
            <button data-id="${escape(user.id)}" data-action="terminate" data-username="${escape(user.username)}" class="terminate-button" ${self || service ? "disabled" : ""}>Terminate</button>
          </div>`;
      return `<tr class="${user.terminated ? "terminated-row" : ""}">
        <td><div class="user-name">${escape(user.username)}#${escape(user.discriminator)}</div><div class="muted">${escape(user.id)}</div></td>
        <td>${escape(user.email || "No email")}</td>
        <td>${status}</td>
        <td>${new Date(user.created_at).toLocaleDateString()}</td>
        <td>
          ${actions}
        </td>
      </tr>`;
    }).join("") : '<tr><td colspan="5" class="loading">No matching users.</td></tr>';
  }

  function renderServers() {
    serverBody.innerHTML = servers.length ? servers.map((server) => {
      const partnered = server.features.includes("PARTNERED");
      const verified = server.features.includes("VERIFIED");
      const community = server.features.includes("COMMUNITY");
      const badges = [
        partnered ? '<span class="pill partner">Partnered</span>' : "",
        verified ? '<span class="pill verified-server">Verified</span>' : "",
        community ? '<span class="pill community">Community</span>' : "",
      ].join("") || '<span class="muted">No programme badges</span>';
      const owner = server.owner ? `${escape(server.owner.username)}#${escape(server.owner.discriminator)}` : "No owner";
      const progress = Math.min(100, (Number(server.premium_subscription_count) / 14) * 100);
      return `<tr>
        <td><div class="user-name">${escape(server.name)}</div><div class="muted">${escape(server.id)}</div></td>
        <td>${owner}</td>
        <td>${Number(server.member_count).toLocaleString()}</td>
        <td><div><span class="boost-count">${Number(server.premium_subscription_count).toLocaleString()}</span> &middot; Tier ${Number(server.premium_tier)}</div><div class="mini-progress"><span style="width:${progress}%"></span></div></td>
        <td>${badges}</td>
        <td>
          <div class="action-group">
            <button data-server-id="${escape(server.id)}" data-server-action="${partnered ? "unpartner" : "partner"}">${partnered ? "Remove Partner" : "Make Partner"}</button>
            <button data-server-id="${escape(server.id)}" data-server-action="${verified ? "unverify" : "verify"}">${verified ? "Remove Verified" : "Verify Server"}</button>
            <button data-server-id="${escape(server.id)}" data-server-action="${community ? "disableCommunity" : "enableCommunity"}">${community ? "Disable Community" : "Enable Community"}</button>
          </div>
        </td>
      </tr>`;
    }).join("") : '<tr><td colspan="6" class="loading">No servers found.</td></tr>';
  }

  function renderBoostDashboard() {
    const server = servers.find((item) => item.id === boostServer.value);
    if (!server) {
      boostDashboard.className = "boost-dashboard loading";
      boostDashboard.textContent = "Choose a server to manage its boost level.";
      return;
    }
    const count = Number(server.premium_subscription_count) || 0;
    const tier = Number(server.premium_tier) || 0;
    const requirements = server.boost_tier_requirements || [0, 2, 7, 14];
    const progress = Math.min(100, count / 14 * 100);
    const cards = [1, 2, 3].map((level) => {
      const unlocked = tier >= level;
      const benefits = level === 1 ? "Animated icon access · better audio" : level === 2 ? "Server banner · larger uploads" : "Vanity-ready · maximum quality";
      return `<article class="tier-card ${unlocked ? "unlocked" : ""}">
        <div class="tier-orb">${level}</div>
        <div><span>BOOST TIER ${level}</span><strong>${requirements[level]} boosts</strong><small>${benefits}</small></div>
        <button data-boost-tier="${level}" ${tier === level ? "disabled" : ""}>${tier === level ? "Active" : `Set Tier ${level}`}</button>
      </article>`;
    }).join("");
    boostDashboard.className = "boost-dashboard";
    boostDashboard.innerHTML = `<div class="boost-summary">
      <div><span class="boost-kicker">${escape(server.name)}</span><strong>${count} boosts</strong><small>Current level: Tier ${tier}</small></div>
      <button data-boost-tier="0" class="secondary" ${tier === 0 ? "disabled" : ""}>Reset boosts</button>
    </div>
    <div class="boost-progress"><span style="width:${progress}%"></span><i style="left:${2 / 14 * 100}%">1</i><i style="left:${7 / 14 * 100}%">2</i><i style="left:100%">3</i></div>
    <div class="tier-grid">${cards}</div>`;
  }

  function renderClyde(clyde) {
    clydeStatus.className = "clyde-status";
    clydeStatus.innerHTML = `<div class="clyde-profile">
      <img src="/avatars/${escape(clyde.id)}/${escape(clyde.avatar)}.png" alt="Clyde" />
      <div><strong>Clyde#${escape(clyde.discriminator)}</strong><span><b class="online-dot"></b> Online &middot; Verified bot</span></div>
      <div class="clyde-metric"><strong>${Number(clyde.memberships).toLocaleString()}/${Number(clyde.servers).toLocaleString()}</strong><span>servers joined</span></div>
    </div><div class="command-list">${clyde.commands.map((command) => `<code>Clyde ${escape(command)}</code>`).join("")}</div>`;
  }

  async function loadModeration() {
    const guildId = moderationServer.value;
    if (!guildId) {
      moderationBody.innerHTML = '<tr><td colspan="5" class="loading">Choose a server to manage its members.</td></tr>';
      return;
    }
    moderationBody.innerHTML = '<tr><td colspan="5" class="loading">Loading members&hellip;</td></tr>';
    try {
      const entries = await api(`/servers/${guildId}/members`);
      moderationBody.innerHTML = entries.length ? entries.map((entry) => {
        const user = entry.user || {};
        const protectedUser = user.system || user.id === ownerId || (user.bot && user.username === "Clyde");
        const timedOut = entry.communication_disabled_until && new Date(entry.communication_disabled_until) > new Date();
        const state = entry.status === "banned"
          ? '<span class="pill warn">Banned</span>'
          : timedOut ? '<span class="pill warn">Timed out</span>' : '<span class="pill good">Member</span>';
        const actions = entry.status === "banned"
          ? `<button data-member-id="${escape(user.id)}" data-member-action="unban">Unban</button>`
          : `<button data-member-id="${escape(user.id)}" data-member-action="${timedOut ? "clearTimeout" : "timeout"}" ${protectedUser ? "disabled" : ""}>${timedOut ? "Clear timeout" : "Timeout 1h"}</button>
             <button data-member-id="${escape(user.id)}" data-member-action="kick" class="danger" ${protectedUser ? "disabled" : ""}>Kick</button>
             <button data-member-id="${escape(user.id)}" data-member-action="ban" class="danger" ${protectedUser ? "disabled" : ""}>Ban</button>`;
        return `<tr>
          <td><div class="user-name">${escape(user.username)}#${escape(user.discriminator)}</div><div class="muted">${escape(user.id)}</div></td>
          <td>${state}</td>
          <td>${entry.joined_at ? new Date(entry.joined_at).toLocaleDateString() : "&mdash;"}</td>
          <td>${entry.premium_since ? '<span class="pill premium">Boosting</span>' : "No"}</td>
          <td>${actions}</td>
        </tr>`;
      }).join("") : '<tr><td colspan="5" class="loading">No members found.</td></tr>';
    } catch (error) {
      showNotice(error.message, true);
      moderationBody.innerHTML = '<tr><td colspan="5" class="loading">Moderation data could not be loaded.</td></tr>';
    }
  }

  async function load() {
    if (!token) {
      showNotice("Log in to Solarcord first, then return to /admin.", true);
      tbody.innerHTML = '<tr><td colspan="5" class="loading"><a href="/login">Go to login</a></td></tr>';
      return;
    }
    try {
      const [overview, userList, serverList, clyde] = await Promise.all([api(""), api("/users"), api("/servers"), api("/clyde")]);
      ownerId = overview.owner.id;
      users = userList;
      servers = serverList;
      moderationServer.innerHTML = '<option value="">Select a server</option>' + servers.map((server) => `<option value="${escape(server.id)}">${escape(server.name)}</option>`).join("");
      boostServer.innerHTML = '<option value="">Select a server</option>' + servers.map((server) => `<option value="${escape(server.id)}">${escape(server.name)}</option>`).join("");
      if (servers.length) boostServer.value = servers[0].id;
      document.querySelector("#identity").textContent = `${overview.owner.username}#${overview.owner.discriminator}`;
      document.querySelector("#instance-description").textContent = overview.instance.description;
      for (const [key, value] of Object.entries(overview.stats)) {
        const target = document.querySelector(`#stat-${key}`);
        if (target) target.textContent = Number(value).toLocaleString();
      }
      render();
      renderServers();
      renderBoostDashboard();
      renderClyde(clyde);
    } catch (error) {
      showNotice(error.message === "Missing Authorization Header" ? "Log in to Solarcord first, then return here." : error.message, true);
      tbody.innerHTML = '<tr><td colspan="5" class="loading">Admin access could not be loaded.</td></tr>';
    }
  }

  search.addEventListener("input", render);
  tbody.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "terminate") {
      const confirmed = window.confirm(`Terminate ${button.dataset.username}? They will be signed out immediately and unable to log back in until restored.`);
      if (!confirmed) return;
    }
    button.disabled = true;
    try {
      await api(`/users/${button.dataset.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: button.dataset.action,
          reason: button.dataset.action === "terminate" ? "Terminated from the Solarcord admin panel" : undefined,
        }),
      });
      users = await api("/users");
      showNotice(button.dataset.action === "terminate" ? "Account terminated and all sessions revoked." : button.dataset.action === "restore" ? "Account restored. The user can log in again." : "User updated.");
      render();
    } catch (error) {
      showNotice(error.message, true);
      button.disabled = false;
    }
  });

  serverBody.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-server-action]");
    if (!button) return;
    button.disabled = true;
    try {
      await api(`/servers/${button.dataset.serverId}`, { method: "PATCH", body: JSON.stringify({ action: button.dataset.serverAction }) });
      servers = await api("/servers");
      showNotice("Server updated.");
      renderServers();
      renderBoostDashboard();
      if (moderationServer.value) await loadModeration();
    } catch (error) {
      showNotice(error.message, true);
      button.disabled = false;
    }
  });

  moderationServer.addEventListener("change", loadModeration);
  boostServer.addEventListener("change", renderBoostDashboard);
  boostDashboard.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-boost-tier]");
    if (!button || !boostServer.value) return;
    button.disabled = true;
    try {
      const tier = Number(button.dataset.boostTier);
      await api(`/servers/${boostServer.value}`, { method: "PATCH", body: JSON.stringify({ action: "setBoostTier", tier }) });
      servers = await api("/servers");
      showNotice(`Boost Tier ${tier} applied.`);
      renderServers();
      renderBoostDashboard();
    } catch (error) {
      showNotice(error.message, true);
      button.disabled = false;
    }
  });
  moderationBody.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-member-action]");
    if (!button || !moderationServer.value) return;
    button.disabled = true;
    try {
      await api(`/servers/${moderationServer.value}/members/${button.dataset.memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: button.dataset.memberAction, minutes: 60 }),
      });
      showNotice("Moderation action completed.");
      await loadModeration();
    } catch (error) {
      showNotice(error.message, true);
      button.disabled = false;
    }
  });

  repairClyde.addEventListener("click", async () => {
    repairClyde.disabled = true;
    try {
      const result = await api("/clyde/repair", { method: "POST", body: "{}" });
      renderClyde(await api("/clyde"));
      showNotice(result.message);
    } catch (error) {
      showNotice(error.message, true);
    } finally {
      repairClyde.disabled = false;
    }
  });

  document.querySelectorAll(".channel[href^='#']").forEach((link) => link.addEventListener("click", () => {
    document.querySelectorAll(".channel").forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
  }));

  load();
})();
