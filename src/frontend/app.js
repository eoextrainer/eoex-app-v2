const API_BASE = (window.__ENV__ && window.__ENV__.API_BASE_URL) || "/api/v1";

const state = {
  token: localStorage.getItem("eoex_token"),
  user: JSON.parse(localStorage.getItem("eoex_user") || "null"),
  currentApp: null,
  currentModule: null,
  impersonatedRole: null,
  menuOpen: true,
};

const viewEl = document.getElementById("view");
const loginModal = document.getElementById("login-modal");
const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");
const loginBtn = document.getElementById("login-btn");
const userEmailEl = document.getElementById("user-email");
const userPill = document.getElementById("user-pill");
const appTabsEl = document.getElementById("app-tabs");
const moduleTabsEl = document.getElementById("module-tabs");
const appMenuEl = document.getElementById("app-menu");
const hamburgerBtn = document.getElementById("hamburger-btn");
const credentialsList = document.getElementById("credentials-list");

const USERS = [
  { label: "System Admin", email: "system.admin@eoex.com", role: "system_admin" },
  { label: "CRM Manager", email: "crm.manager@eoex.com", role: "crm_manager" },
  { label: "Studio Manager", email: "studio.manager@eoex.com", role: "studio_manager" },
  { label: "ERP Manager", email: "erp.manager@eoex.com", role: "erp_manager" },
  { label: "Service Manager", email: "service.manager@eoex.com", role: "service_manager" },
  { label: "Business Development", email: "bdr@eoex.com", role: "crm_bdr" },
  { label: "Sales Account Manager", email: "sales.manager@eoex.com", role: "crm_sales_manager" },
  { label: "Marketing Manager", email: "marketing.manager@eoex.com", role: "studio_marketing_manager" },
  { label: "Digital Marketing", email: "digital.marketing@eoex.com", role: "studio_digital_marketing" },
  { label: "Campaign Manager", email: "campaign.manager@eoex.com", role: "studio_campaign_manager" },
  { label: "HR Manager", email: "hr.manager@eoex.com", role: "erp_hr_manager" },
  { label: "Finance Manager", email: "finance.manager@eoex.com", role: "erp_finance_manager" },
  { label: "Resource Planner", email: "resource.planner@eoex.com", role: "erp_resource_planning_manager" },
  { label: "CEO", email: "ceo@eoex.com", role: "erp_ceo" },
  { label: "Support L1", email: "support.l1@eoex.com", role: "service_level1" },
  { label: "Support L2", email: "support.l2@eoex.com", role: "service_level2" },
  { label: "Support L3", email: "support.l3@eoex.com", role: "service_level3" },
];

const APP_CONFIG = {
  CRM: {
    label: "CRM",
    modules: [
      "Dashboard",
      "Campaigns",
      "Leads",
      "Opportunities",
      "Accounts",
      "Contacts",
      "Tasks",
      "Reports",
      "Calendar",
    ],
  },
  STUDIO: {
    label: "Studio",
    modules: [
      "Dashboard",
      "Campaigns",
      "Leads",
      "Calendar",
      "Message Editor",
      "Contents Scheduler",
    ],
  },
  ERP: {
    label: "ERP",
    modules: [
      "Dashboard",
      "Asset Manager",
      "Finances",
      "HR",
      "Strategies",
      "QA & Risk",
      "Calendar",
    ],
  },
  SERVICE: {
    label: "Service",
    modules: [
      "Dashboard",
      "High SLA Tickets",
      "Mid SLA Tickets",
      "Low SLA Tickets",
      "Calendar",
    ],
  },
  ADMIN: {
    label: "Admin Portal",
    modules: ["Dashboard", "User Directory", "Audit", "Setup"],
  },
};

const MODULE_RENDERERS = {
  CRM: {
    Dashboard: () => renderDashboard("CRM"),
    Campaigns: () => renderListView("Campaigns", CRM_DATA.campaigns, CRM_DATA.campaignDetail),
    Leads: () => renderListView("Leads", CRM_DATA.leads, CRM_DATA.leadDetail),
    Opportunities: () => renderListView("Opportunities", CRM_DATA.opportunities, CRM_DATA.opportunityDetail),
    Accounts: () => renderListView("Accounts", CRM_DATA.accounts, CRM_DATA.accountDetail),
    Contacts: () => renderListView("Contacts", CRM_DATA.contacts, CRM_DATA.contactDetail),
    Tasks: () => renderListView("Tasks", CRM_DATA.tasks, CRM_DATA.taskDetail),
    Reports: () => renderReports("CRM"),
    Calendar: () => renderCalendar("Sales Forecast", CRM_DATA.calendarEntries),
  },
  STUDIO: {
    Dashboard: () => renderDashboard("STUDIO"),
    Campaigns: () => renderListView("Campaigns", STUDIO_DATA.campaigns, STUDIO_DATA.campaignDetail),
    Leads: () => renderListView("Leads", STUDIO_DATA.leads, STUDIO_DATA.leadDetail),
    Calendar: () => renderCalendar("Editorial Calendar", STUDIO_DATA.calendarEntries),
    "Message Editor": () => renderCards("Message Editor", STUDIO_DATA.editorCards),
    "Contents Scheduler": () => renderCards("Contents Scheduler", STUDIO_DATA.schedulerCards),
  },
  ERP: {
    Dashboard: () => renderDashboard("ERP"),
    "Asset Manager": () => renderListView("Assets", ERP_DATA.assets, ERP_DATA.assetDetail),
    Finances: () => renderCards("Finances", ERP_DATA.financeCards),
    HR: () => renderListView("HR Team", ERP_DATA.hr, ERP_DATA.hrDetail),
    Strategies: () => renderCards("Strategies", ERP_DATA.strategyCards),
    "QA & Risk": () => renderCards("QA & Risk", ERP_DATA.riskCards),
    Calendar: () => renderCalendar("Operations Planner", ERP_DATA.calendarEntries),
  },
  SERVICE: {
    Dashboard: () => renderDashboard("SERVICE"),
    "High SLA Tickets": () => renderListView("High SLA", SERVICE_DATA.high, SERVICE_DATA.highDetail),
    "Mid SLA Tickets": () => renderListView("Mid SLA", SERVICE_DATA.mid, SERVICE_DATA.midDetail),
    "Low SLA Tickets": () => renderListView("Low SLA", SERVICE_DATA.low, SERVICE_DATA.lowDetail),
    Calendar: () => renderCalendar("Support Calendar", SERVICE_DATA.calendarEntries),
  },
  ADMIN: {
    Dashboard: () => renderAdminDashboard(),
    "User Directory": () => renderUserDirectory(),
    Audit: () => renderCards("Audit", ADMIN_DATA.auditCards),
    Setup: () => renderCards("Setup", ADMIN_DATA.setupCards),
  },
};

function getEffectiveRole() {
  return state.impersonatedRole || state.user?.role;
}

function getAccessibleApps(role) {
  if (!role) return [];
  if (role === "system_admin") {
    return ["CRM", "STUDIO", "ERP", "SERVICE", "ADMIN"];
  }
  if (role.startsWith("crm_")) return ["CRM"];
  if (role.startsWith("studio_")) return ["STUDIO"];
  if (role.startsWith("erp_")) return ["ERP"];
  if (role.startsWith("service_")) return ["SERVICE"];
  return [];
}

function showLogin() {
  loginModal.classList.remove("hidden");
}

function hideLogin() {
  loginModal.classList.add("hidden");
}

function setUser(user, token) {
  state.user = user;
  state.token = token;
  localStorage.setItem("eoex_user", JSON.stringify(user));
  localStorage.setItem("eoex_token", token);
  userEmailEl.textContent = user?.email || "";
  userPill.style.display = user ? "flex" : "none";
  loginBtn.style.display = user ? "none" : "inline-grid";
}

async function apiFetch(path, options = {}) {
  const headers = options.headers || {};
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return null;
  }
  return response.json();
}

function renderAppTabs() {
  const apps = getAccessibleApps(getEffectiveRole());
  appTabsEl.innerHTML = apps
    .map(
      (appKey) => `
      <button class="app-tab ${state.currentApp === appKey ? "active" : ""}" data-app="${appKey}">
        ${APP_CONFIG[appKey].label}
      </button>
    `
    )
    .join("");
  Array.from(appTabsEl.querySelectorAll(".app-tab")).forEach((btn) => {
    btn.addEventListener("click", () => {
      setCurrentApp(btn.dataset.app);
    });
  });
}

function renderAppMenu() {
  const apps = getAccessibleApps(getEffectiveRole());
  appMenuEl.innerHTML = apps
    .map((appKey) => {
      const modules = APP_CONFIG[appKey].modules;
      const moduleButtons = modules
        .map(
          (module) => `
          <button data-app="${appKey}" data-module="${module}" class="${
            state.currentApp === appKey && state.currentModule === module ? "active" : ""
          }">
            ${module}
          </button>
        `
        )
        .join("");
      return `
        <div class="app-card">
          <button class="app-toggle" data-app="${appKey}">
            ${APP_CONFIG[appKey].label}
            <span>${state.currentApp === appKey ? "▾" : "▸"}</span>
          </button>
          ${state.currentApp === appKey ? `<div class="app-modules">${moduleButtons}</div>` : ""}
        </div>
      `;
    })
    .join("");

  Array.from(appMenuEl.querySelectorAll(".app-toggle")).forEach((btn) => {
    btn.addEventListener("click", () => {
      setCurrentApp(btn.dataset.app);
    });
  });

  Array.from(appMenuEl.querySelectorAll(".app-modules button")).forEach((btn) => {
    btn.addEventListener("click", () => {
      setCurrentApp(btn.dataset.app, btn.dataset.module);
    });
  });
}

function renderModuleTabs() {
  const modules = APP_CONFIG[state.currentApp]?.modules || [];
  moduleTabsEl.innerHTML = modules
    .map(
      (module) => `
      <button class="module-tab ${state.currentModule === module ? "active" : ""}" data-module="${module}">
        ${module}
      </button>
    `
    )
    .join("");
  Array.from(moduleTabsEl.querySelectorAll(".module-tab")).forEach((btn) => {
    btn.addEventListener("click", () => {
      setCurrentApp(state.currentApp, btn.dataset.module);
    });
  });
}

function setCurrentApp(appKey, module) {
  const apps = getAccessibleApps(getEffectiveRole());
  if (!apps.includes(appKey)) return;
  state.currentApp = appKey;
  state.currentModule = module || APP_CONFIG[appKey].modules[0];
  renderShell();
}

function renderShell() {
  if (!state.user) {
    showLogin();
    return;
  }
  hideLogin();
  renderAppTabs();
  renderAppMenu();
  renderModuleTabs();
  renderModuleContent();
}

function renderModuleContent() {
  const appKey = state.currentApp;
  const module = state.currentModule;
  const renderer = MODULE_RENDERERS[appKey]?.[module];
  viewEl.innerHTML = renderer ? renderer() : `<div class="notice">Module unavailable.</div>`;
}

function renderDashboard(appKey) {
  const metrics = DASHBOARD_DATA[appKey] || [];
  return `
    <div>
      <div class="section-title">${APP_CONFIG[appKey].label} Overview</div>
      <p class="subtle">Snapshot of KPIs and activity for ${APP_CONFIG[appKey].label}.</p>
    </div>
    <div class="card-grid">
      ${metrics
        .map(
          (metric) => `
          <div class="card">
            <h3>${metric.label}</h3>
            <div class="metric">${metric.value}</div>
            <div class="subtle">${metric.subtext}</div>
          </div>
        `
        )
        .join("")}
    </div>
    <div class="card">
      <h3>Highlights</h3>
      <p class="subtle">${HIGHLIGHTS[appKey]}</p>
    </div>
  `;
}

function renderListView(title, data, detail) {
  return `
    <div>
      <div class="section-title">${title}</div>
      <p class="subtle">List view styled after Salesforce list reports.</p>
    </div>
    <div class="list-layout">
      ${renderTable(data.columns, data.rows)}
      ${renderDetail(detail)}
    </div>
  `;
}

function renderCards(title, cards) {
  return `
    <div>
      <div class="section-title">${title}</div>
      <p class="subtle">Grouped services and feature clusters.</p>
    </div>
    <div class="card-grid">
      ${cards
        .map(
          (card) => `
          <div class="card">
            <h3>${card.title}</h3>
            <div class="metric">${card.value}</div>
            <div class="subtle">${card.description}</div>
          </div>
        `
        )
        .join("")}
    </div>
  `;
}

function renderReports(appKey) {
  return `
    <div>
      <div class="section-title">Reports</div>
      <p class="subtle">Automated insights for ${APP_CONFIG[appKey].label} leadership.</p>
    </div>
    <div class="card-grid">
      ${REPORTS_DATA[appKey]
        .map(
          (report) => `
          <div class="card">
            <h3>${report.title}</h3>
            <div class="metric">${report.value}</div>
            <div class="subtle">${report.description}</div>
          </div>
        `
        )
        .join("")}
    </div>
  `;
}

function renderCalendar(title, entries) {
  return `
    <div>
      <div class="section-title">${title} — 2026</div>
      <p class="subtle">Card-based yearly planner.</p>
    </div>
    <div class="calendar-grid">
      ${CALENDAR_MONTHS.map(
        (month) => `
        <div class="calendar-card">
          <h4>${month}</h4>
          ${entries
            .filter((entry) => entry.month === month)
            .map(
              (entry) => `
              <div class="calendar-entry">${entry.title}</div>
            `
            )
            .join("")}
        </div>
      `
      ).join("")}
    </div>
  `;
}

function renderTable(columns, rows) {
  return `
    <table class="table">
      <thead>
        <tr>
          ${columns.map((col) => `<th>${col}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
          <tr>
            ${row.map((cell) => `<td>${cell}</td>`).join("")}
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderDetail(detail) {
  return `
    <div class="card detail-card">
      <h3>${detail.title}</h3>
      ${detail.items
        .map(
          (item) => `
          <div class="detail-item">${item.label}<span>${item.value}</span></div>
        `
        )
        .join("")}
    </div>
  `;
}

function renderAdminDashboard() {
  const impersonationOptions = USERS.filter((user) => user.role !== "system_admin")
    .map(
      (user) => `<option value="${user.role}">${user.label} (${user.email})</option>`
    )
    .join("");

  return `
    <div>
      <div class="section-title">Admin Command Center</div>
      <p class="subtle">System admin can impersonate any user for testing.</p>
    </div>
    <div class="card-grid">
      ${ADMIN_DATA.adminCards
        .map(
          (card) => `
          <div class="card">
            <h3>${card.title}</h3>
            <div class="metric">${card.value}</div>
            <div class="subtle">${card.description}</div>
          </div>
        `
        )
        .join("")}
    </div>
    <div class="card">
      <h3>Impersonate user</h3>
      <div class="subtle">Change the visible app access for UI testing.</div>
      <div style="margin-top:12px; display:grid; gap:10px;">
        <select id="impersonate-select">
          <option value="">Reset to system admin</option>
          ${impersonationOptions}
        </select>
        <button class="btn" id="impersonate-btn">Apply impersonation</button>
      </div>
    </div>
  `;
}

function renderUserDirectory() {
  return `
    <div>
      <div class="section-title">User Directory</div>
      <p class="subtle">Preview of user accounts and app assignments.</p>
    </div>
    ${renderTable(
      ["Name", "Email", "Role", "App"],
      USERS.map((user) => [user.label, user.email, user.role, roleToApp(user.role)])
    )}
  `;
}

function roleToApp(role) {
  if (role === "system_admin") return "All Apps";
  if (role.startsWith("crm_")) return "CRM";
  if (role.startsWith("studio_")) return "Studio";
  if (role.startsWith("erp_")) return "ERP";
  if (role.startsWith("service_")) return "Service";
  return "";
}

function bindAdminControls() {
  const button = document.getElementById("impersonate-btn");
  const select = document.getElementById("impersonate-select");
  if (button && select) {
    button.addEventListener("click", () => {
      state.impersonatedRole = select.value || null;
      setCurrentApp(getAccessibleApps(getEffectiveRole())[0]);
    });
  }
}

function bindModuleHooks() {
  if (state.currentApp === "ADMIN" && state.currentModule === "Dashboard") {
    bindAdminControls();
  }
}

function renderCredentials() {
  credentialsList.classList.add("credentials-list");
  credentialsList.innerHTML = USERS.map(
    (user) => `
      <div class="credential-item">
        <strong>${user.label}</strong>
        <span>${user.email}</span>
      </div>
    `
  ).join("");
}

function renderAppState() {
  const apps = getAccessibleApps(getEffectiveRole());
  if (!apps.length) {
    viewEl.innerHTML = `<div class="notice">No apps available for this role.</div>`;
    return;
  }
  if (!state.currentApp || !apps.includes(state.currentApp)) {
    state.currentApp = apps[0];
    state.currentModule = APP_CONFIG[state.currentApp].modules[0];
  }
  renderShell();
  bindModuleHooks();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const payload = Object.fromEntries(formData.entries());
  try {
    const response = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    state.impersonatedRole = null;
    setUser(response.user, response.access_token);
    renderAppState();
  } catch (error) {
    alert("Login failed. " + error.message);
  }
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("eoex_token");
  localStorage.removeItem("eoex_user");
  state.token = null;
  state.user = null;
  state.impersonatedRole = null;
  renderShell();
});

loginBtn.addEventListener("click", () => {
  showLogin();
});

hamburgerBtn.addEventListener("click", () => {
  state.menuOpen = !state.menuOpen;
  appMenuEl.style.display = state.menuOpen ? "flex" : "none";
  hamburgerBtn.setAttribute("aria-expanded", String(state.menuOpen));
});

renderCredentials();
setUser(state.user, state.token);
renderAppState();

const CALENDAR_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DASHBOARD_DATA = {
  CRM: [
    { label: "Open Leads", value: "128", subtext: "+12 this week" },
    { label: "Pipeline", value: "$4.2M", subtext: "Q1 forecast" },
    { label: "Win Rate", value: "34%", subtext: "Rolling 90 days" },
    { label: "New Opportunities", value: "18", subtext: "Last 7 days" },
  ],
  STUDIO: [
    { label: "Active Campaigns", value: "14", subtext: "Across channels" },
    { label: "Content Ready", value: "36", subtext: "Scheduled assets" },
    { label: "Engagement", value: "6.2%", subtext: "Avg CTR" },
    { label: "Leads Generated", value: "420", subtext: "This month" },
  ],
  ERP: [
    { label: "Assets Managed", value: "128", subtext: "Operational" },
    { label: "Budget Used", value: "68%", subtext: "Fiscal year" },
    { label: "Headcount", value: "312", subtext: "Global" },
    { label: "Risk Items", value: "9", subtext: "Needs review" },
  ],
  SERVICE: [
    { label: "Open Tickets", value: "54", subtext: "All queues" },
    { label: "SLA Breaches", value: "2", subtext: "24h window" },
    { label: "CSAT", value: "94%", subtext: "Rolling 30 days" },
    { label: "Escalations", value: "6", subtext: "Active" },
  ],
  ADMIN: [
    { label: "Users", value: "17", subtext: "Active" },
    { label: "Apps", value: "4", subtext: "Live" },
    { label: "Integrations", value: "6", subtext: "Connected" },
    { label: "Compliance", value: "Ready", subtext: "Audit" },
  ],
};

const HIGHLIGHTS = {
  CRM: "Forecasted revenue is ahead of plan with top accounts in late-stage negotiation.",
  STUDIO: "New editorial calendar sync completed. Pipeline optimized for Q1 campaigns.",
  ERP: "Operational planner updated with HR resourcing and finance checkpoints.",
  SERVICE: "Critical SLA coverage achieved across all regions.",
  ADMIN: "System health stable. No critical alerts in the last 24 hours.",
};

const CRM_DATA = {
  campaigns: {
    columns: ["Campaign", "Status", "Start", "Budget"],
    rows: [
      ["Q1 Pipeline Boost", "Active", "Jan 12", "$120,000"],
      ["Enterprise Webinar", "Planned", "Feb 02", "$48,000"],
      ["Retail Win-Back", "Active", "Feb 18", "$68,500"],
    ],
  },
  campaignDetail: {
    title: "Campaign Snapshot",
    items: [
      { label: "Owner", value: "CRM Manager" },
      { label: "Type", value: "Multi-touch" },
      { label: "Region", value: "North America" },
      { label: "ROI", value: "4.2x" },
    ],
  },
  leads: {
    columns: ["Lead", "Company", "Status", "Score"],
    rows: [
      ["Jordan Lee", "Axis Mobility", "New", "81"],
      ["Camila Stone", "Northwind", "Working", "76"],
      ["Rafael Cruz", "Blue Cloud", "Qualified", "92"],
    ],
  },
  leadDetail: {
    title: "Lead Summary",
    items: [
      { label: "Source", value: "Inbound" },
      { label: "Interest", value: "Enterprise" },
      { label: "Owner", value: "BDR" },
      { label: "Next Step", value: "Discovery call" },
    ],
  },
  opportunities: {
    columns: ["Opportunity", "Stage", "Amount", "Close"],
    rows: [
      ["Mercury Logistics", "Negotiation", "$680,000", "Mar 22"],
      ["Vertex Media", "Proposal", "$240,000", "Apr 05"],
      ["Summit Health", "Qualification", "$145,000", "May 11"],
    ],
  },
  opportunityDetail: {
    title: "Opportunity",
    items: [
      { label: "Probability", value: "62%" },
      { label: "Owner", value: "Sales Account Manager" },
      { label: "Region", value: "EMEA" },
      { label: "Next Step", value: "Pricing review" },
    ],
  },
  accounts: {
    columns: ["Account", "Industry", "Tier", "Health"],
    rows: [
      ["Atlas Industries", "Manufacturing", "Enterprise", "Strong"],
      ["Nova Retail", "Retail", "Growth", "Stable"],
      ["Zenith Bio", "Healthcare", "Enterprise", "At risk"],
    ],
  },
  accountDetail: {
    title: "Account",
    items: [
      { label: "ARR", value: "$1.2M" },
      { label: "Renewal", value: "Jun 30" },
      { label: "CSAT", value: "95%" },
      { label: "Owner", value: "CRM Manager" },
    ],
  },
  contacts: {
    columns: ["Contact", "Role", "Account", "Status"],
    rows: [
      ["Avery Kim", "Director", "Atlas Industries", "Engaged"],
      ["Liam Chen", "VP Ops", "Nova Retail", "Active"],
      ["Sophia Patel", "CFO", "Zenith Bio", "Nurture"],
    ],
  },
  contactDetail: {
    title: "Contact",
    items: [
      { label: "Last Touch", value: "2 days ago" },
      { label: "Channel", value: "Email" },
      { label: "Owner", value: "CRM Manager" },
      { label: "Notes", value: "Budget approved" },
    ],
  },
  tasks: {
    columns: ["Task", "Owner", "Due", "Priority"],
    rows: [
      ["Follow-up call", "BDR", "Feb 14", "High"],
      ["Send proposal", "Sales Manager", "Feb 16", "Medium"],
      ["Account review", "CRM Manager", "Feb 20", "Low"],
    ],
  },
  taskDetail: {
    title: "Task",
    items: [
      { label: "Status", value: "In progress" },
      { label: "Category", value: "Outbound" },
      { label: "Reminder", value: "Set" },
      { label: "Linked record", value: "Mercury Logistics" },
    ],
  },
  calendarEntries: [
    { month: "January", title: "Forecast review" },
    { month: "March", title: "Pipeline summit" },
    { month: "June", title: "Mid-year close plan" },
    { month: "September", title: "Q4 prep" },
  ],
};

const STUDIO_DATA = {
  campaigns: {
    columns: ["Campaign", "Channel", "Status", "Launch"],
    rows: [
      ["Brand Refresh", "Social", "Active", "Jan 20"],
      ["Growth Webinar", "Email", "Draft", "Feb 12"],
      ["Partner Spotlight", "Paid", "Active", "Feb 27"],
    ],
  },
  campaignDetail: {
    title: "Campaign",
    items: [
      { label: "Owner", value: "Studio Manager" },
      { label: "Spend", value: "$42,000" },
      { label: "Reach", value: "1.2M" },
      { label: "CTR", value: "5.4%" },
    ],
  },
  leads: {
    columns: ["Lead", "Source", "Stage", "Score"],
    rows: [
      ["Ariana Cole", "Content", "Nurture", "78"],
      ["Diego Ramos", "Web", "Qualified", "85"],
      ["Nia Brooks", "Social", "New", "70"],
    ],
  },
  leadDetail: {
    title: "Lead",
    items: [
      { label: "Journey", value: "Awareness" },
      { label: "Owner", value: "Digital Marketing" },
      { label: "Next Touch", value: "Email cadence" },
      { label: "Engagement", value: "High" },
    ],
  },
  calendarEntries: [
    { month: "February", title: "Editorial sync" },
    { month: "April", title: "Campaign audit" },
    { month: "July", title: "Brand launch" },
    { month: "November", title: "Holiday plan" },
  ],
  editorCards: [
    { title: "Email Studio", value: "14 templates", description: "Personalized journeys" },
    { title: "Social Composer", value: "8 queues", description: "Cross-channel scheduling" },
    { title: "Design Kit", value: "28 assets", description: "Approved creatives" },
  ],
  schedulerCards: [
    { title: "Weekly Slots", value: "36", description: "Open publishing windows" },
    { title: "Assets Due", value: "7", description: "Due this week" },
    { title: "Approvals", value: "5", description: "Pending review" },
  ],
};

const ERP_DATA = {
  assets: {
    columns: ["Asset", "Type", "Status", "Owner"],
    rows: [
      ["Fleet A-12", "Logistics", "Active", "Ops"],
      ["Plant 5", "Manufacturing", "Maintenance", "Facilities"],
      ["DC West", "Distribution", "Active", "Supply Chain"],
    ],
  },
  assetDetail: {
    title: "Asset",
    items: [
      { label: "Utilization", value: "82%" },
      { label: "Next Service", value: "Mar 10" },
      { label: "Risk", value: "Low" },
      { label: "Owner", value: "ERP Manager" },
    ],
  },
  financeCards: [
    { title: "Budget", value: "$14.2M", description: "Approved FY" },
    { title: "Spend", value: "$9.8M", description: "YTD" },
    { title: "Forecast", value: "$13.4M", description: "Projected" },
  ],
  hr: {
    columns: ["Team", "Headcount", "Open Roles", "Lead"],
    rows: [
      ["Engineering", "86", "4", "HR Manager"],
      ["Operations", "64", "2", "HR Manager"],
      ["Finance", "24", "1", "HR Manager"],
    ],
  },
  hrDetail: {
    title: "HR Summary",
    items: [
      { label: "Attrition", value: "3.2%" },
      { label: "Engagement", value: "88%" },
      { label: "Open roles", value: "7" },
      { label: "Owner", value: "HR Manager" },
    ],
  },
  strategyCards: [
    { title: "Roadmap", value: "Q1-26", description: "Strategic initiatives" },
    { title: "OKRs", value: "12", description: "In progress" },
    { title: "Investments", value: "$4.1M", description: "Approved" },
  ],
  riskCards: [
    { title: "Risk Register", value: "9", description: "Active items" },
    { title: "Compliance", value: "On track", description: "Audit ready" },
    { title: "Quality", value: "98%", description: "Pass rate" },
  ],
  calendarEntries: [
    { month: "January", title: "Budget review" },
    { month: "May", title: "Operations audit" },
    { month: "August", title: "Resource planning" },
    { month: "December", title: "Year-end close" },
  ],
};

const SERVICE_DATA = {
  high: {
    columns: ["Ticket", "Account", "Priority", "Owner"],
    rows: [
      ["SLA-1021", "Atlas Industries", "High", "L3"],
      ["SLA-1027", "Nova Retail", "High", "L2"],
      ["SLA-1032", "Zenith Bio", "High", "L3"],
    ],
  },
  highDetail: {
    title: "High SLA",
    items: [
      { label: "Response", value: "30 min" },
      { label: "Escalation", value: "In progress" },
      { label: "Owner", value: "Support L3" },
      { label: "Status", value: "Active" },
    ],
  },
  mid: {
    columns: ["Ticket", "Account", "Priority", "Owner"],
    rows: [
      ["SLA-1102", "Vertex Media", "Medium", "L2"],
      ["SLA-1109", "Mercury Logistics", "Medium", "L2"],
      ["SLA-1115", "Summit Health", "Medium", "L1"],
    ],
  },
  midDetail: {
    title: "Mid SLA",
    items: [
      { label: "Response", value: "2 hrs" },
      { label: "Escalation", value: "Queued" },
      { label: "Owner", value: "Support L2" },
      { label: "Status", value: "Active" },
    ],
  },
  low: {
    columns: ["Ticket", "Account", "Priority", "Owner"],
    rows: [
      ["SLA-1202", "Blue Cloud", "Low", "L1"],
      ["SLA-1208", "Bright Labs", "Low", "L1"],
      ["SLA-1211", "Orchid Systems", "Low", "L1"],
    ],
  },
  lowDetail: {
    title: "Low SLA",
    items: [
      { label: "Response", value: "8 hrs" },
      { label: "Escalation", value: "Pending" },
      { label: "Owner", value: "Support L1" },
      { label: "Status", value: "Open" },
    ],
  },
  calendarEntries: [
    { month: "March", title: "SLA review" },
    { month: "June", title: "Support summit" },
    { month: "October", title: "Incident drill" },
    { month: "December", title: "Year-end coverage" },
  ],
};

const ADMIN_DATA = {
  adminCards: [
    { title: "Impersonations", value: "Enabled", description: "Testing mode" },
    { title: "Audit Trails", value: "100%", description: "Captured" },
    { title: "Integrations", value: "6", description: "Active" },
  ],
  auditCards: [
    { title: "Login Events", value: "94", description: "Last 24 hours" },
    { title: "Policy Alerts", value: "0", description: "All clear" },
    { title: "Exports", value: "6", description: "Week to date" },
  ],
  setupCards: [
    { title: "Org Settings", value: "Configured", description: "Global defaults" },
    { title: "RLS Policies", value: "Enabled", description: "Tenant isolation" },
    { title: "Environment", value: "Production", description: "Stable" },
  ],
};

const REPORTS_DATA = {
  CRM: [
    { title: "Pipeline Coverage", value: "3.4x", description: "Quota coverage" },
    { title: "Top Accounts", value: "12", description: "Priority focus" },
    { title: "Forecast Accuracy", value: "92%", description: "Last quarter" },
  ],
};
