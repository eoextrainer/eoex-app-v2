const API_BASE = (window.__ENV__ && window.__ENV__.API_BASE_URL) || "/api/v1";

const state = {
  token: localStorage.getItem("eoex_token"),
  user: JSON.parse(localStorage.getItem("eoex_user") || "null"),
};

const viewEl = document.getElementById("view");
const pageTitleEl = document.getElementById("page-title");
const loginModal = document.getElementById("login-modal");
const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");
const userEmailEl = document.getElementById("user-email");

const routes = {
  "#/dashboard": renderDashboard,
  "#/crm": renderCRM,
  "#/erp": renderERP,
  "#/studio": renderStudio,
  "#/support": renderSupport,
  "#/settings": renderSettings,
};

const navLinks = Array.from(document.querySelectorAll(".nav a"));

function setActiveRoute(hash) {
  navLinks.forEach((link) => {
    if (link.getAttribute("href") === hash) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
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

async function renderDashboard() {
  pageTitleEl.textContent = "Dashboard";
  viewEl.innerHTML = `<div class="notice">Loading overview...</div>`;
  try {
    const metrics = await apiFetch("/metrics/overview");
    viewEl.innerHTML = `
      <div class="card-grid">
        ${renderMetricCard("Contacts", metrics.contacts)}
        ${renderMetricCard("Products", metrics.products)}
        ${renderMetricCard("Orders", metrics.orders)}
        ${renderMetricCard("Campaigns", metrics.campaigns)}
        ${renderMetricCard("Tickets", metrics.tickets)}
      </div>
      <div class="section-header">
        <h2>System status</h2>
      </div>
      <div class="card">
        <div class="status"><span class="status-dot"></span>All services operational</div>
        <p>Last sync: ${new Date().toLocaleString()}</p>
      </div>
    `;
  } catch (error) {
    viewEl.innerHTML = `<div class="notice">${error.message}</div>`;
  }
}

function renderMetricCard(label, value) {
  return `
    <div class="card">
      <h3>${label}</h3>
      <div class="metric">${value ?? 0}</div>
    </div>
  `;
}

async function renderCRM() {
  pageTitleEl.textContent = "CRM";
  viewEl.innerHTML = `<div class="notice">Loading contacts...</div>`;
  try {
    const { items } = await apiFetch("/crm/contacts");
    viewEl.innerHTML = `
      <div class="section-header">
        <h2>Contacts</h2>
      </div>
      ${renderContactForm()}
      ${renderContactsTable(items)}
    `;
    bindContactForm();
  } catch (error) {
    viewEl.innerHTML = `<div class="notice">${error.message}</div>`;
  }
}

function renderContactForm() {
  return `
    <div class="card">
      <h3>Add contact</h3>
      <form id="contact-form">
        <div class="form-row">
          <input name="first_name" placeholder="First name" required />
          <input name="last_name" placeholder="Last name" required />
          <input name="email" type="email" placeholder="Email" />
          <input name="company" placeholder="Company" />
          <select name="status">
            <option value="new">New</option>
            <option value="qualified">Qualified</option>
            <option value="converted">Converted</option>
          </select>
        </div>
        <button class="btn btn-primary" type="submit">Save contact</button>
      </form>
    </div>
  `;
}

function renderContactsTable(items) {
  if (!items.length) {
    return `<div class="notice">No contacts yet. Add your first contact above.</div>`;
  }
  return `
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Company</th>
          <th>Status</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
          <tr>
            <td>${item.first_name} ${item.last_name}</td>
            <td>${item.email || "-"}</td>
            <td>${item.company || "-"}</td>
            <td><span class="badge">${item.status}</span></td>
            <td>${new Date(item.created_at).toLocaleDateString()}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function bindContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      await apiFetch("/crm/contacts", {
        method: "POST",
        body: JSON.stringify(data),
      });
      renderCRM();
    } catch (error) {
      alert(error.message);
    }
  });
}

async function renderERP() {
  pageTitleEl.textContent = "ERP";
  viewEl.innerHTML = `<div class="notice">Loading products...</div>`;
  try {
    const { items } = await apiFetch("/erp/products");
    viewEl.innerHTML = `
      <div class="section-header">
        <h2>Inventory</h2>
      </div>
      ${renderProductForm()}
      ${renderProductsTable(items)}
    `;
    bindProductForm();
  } catch (error) {
    viewEl.innerHTML = `<div class="notice">${error.message}</div>`;
  }
}

function renderProductForm() {
  return `
    <div class="card">
      <h3>Add product</h3>
      <form id="product-form">
        <div class="form-row">
          <input name="sku" placeholder="SKU" required />
          <input name="name" placeholder="Name" required />
          <input name="category" placeholder="Category" />
          <input name="unit_price" type="number" step="0.01" placeholder="Unit price" required />
          <input name="stock_quantity" type="number" placeholder="Stock" value="0" />
        </div>
        <button class="btn btn-primary" type="submit">Save product</button>
      </form>
    </div>
  `;
}

function renderProductsTable(items) {
  if (!items.length) {
    return `<div class="notice">No products yet. Add a product above.</div>`;
  }
  return `
    <table class="table">
      <thead>
        <tr>
          <th>SKU</th>
          <th>Name</th>
          <th>Category</th>
          <th>Price</th>
          <th>Stock</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
          <tr>
            <td>${item.sku}</td>
            <td>${item.name}</td>
            <td>${item.category || "-"}</td>
            <td>$${Number(item.unit_price).toFixed(2)}</td>
            <td>${item.stock_quantity}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function bindProductForm() {
  const form = document.getElementById("product-form");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.unit_price = Number(data.unit_price || 0);
    data.stock_quantity = Number(data.stock_quantity || 0);
    try {
      await apiFetch("/erp/products", {
        method: "POST",
        body: JSON.stringify(data),
      });
      renderERP();
    } catch (error) {
      alert(error.message);
    }
  });
}

async function renderStudio() {
  pageTitleEl.textContent = "Studio";
  viewEl.innerHTML = `<div class="notice">Loading campaigns...</div>`;
  try {
    const { items } = await apiFetch("/studio/campaigns");
    viewEl.innerHTML = `
      <div class="section-header">
        <h2>Campaigns</h2>
      </div>
      ${renderCampaignForm()}
      ${renderCampaignsTable(items)}
    `;
    bindCampaignForm();
  } catch (error) {
    viewEl.innerHTML = `<div class="notice">${error.message}</div>`;
  }
}

function renderCampaignForm() {
  return `
    <div class="card">
      <h3>New campaign</h3>
      <form id="campaign-form">
        <div class="form-row">
          <input name="name" placeholder="Campaign name" required />
          <input name="campaign_type" placeholder="Type" required />
          <select name="status">
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
          <input name="budget" type="number" step="0.01" placeholder="Budget" />
        </div>
        <button class="btn btn-primary" type="submit">Save campaign</button>
      </form>
    </div>
  `;
}

function renderCampaignsTable(items) {
  if (!items.length) {
    return `<div class="notice">No campaigns yet. Add a campaign above.</div>`;
  }
  return `
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Status</th>
          <th>Budget</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
          <tr>
            <td>${item.name}</td>
            <td>${item.campaign_type}</td>
            <td><span class="badge">${item.status}</span></td>
            <td>${item.budget ? `$${Number(item.budget).toFixed(2)}` : "-"}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function bindCampaignForm() {
  const form = document.getElementById("campaign-form");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.budget = data.budget ? Number(data.budget) : null;
    try {
      await apiFetch("/studio/campaigns", {
        method: "POST",
        body: JSON.stringify(data),
      });
      renderStudio();
    } catch (error) {
      alert(error.message);
    }
  });
}

async function renderSupport() {
  pageTitleEl.textContent = "Support";
  viewEl.innerHTML = `<div class="notice">Loading tickets...</div>`;
  try {
    const { items } = await apiFetch("/support/tickets");
    viewEl.innerHTML = `
      <div class="section-header">
        <h2>Tickets</h2>
      </div>
      ${renderTicketForm()}
      ${renderTicketsTable(items)}
    `;
    bindTicketForm();
  } catch (error) {
    viewEl.innerHTML = `<div class="notice">${error.message}</div>`;
  }
}

function renderTicketForm() {
  return `
    <div class="card">
      <h3>New ticket</h3>
      <form id="ticket-form">
        <div class="form-row">
          <input name="subject" placeholder="Subject" required />
          <select name="priority">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
          </select>
          <select name="status">
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <textarea name="description" placeholder="Describe the issue" required></textarea>
        <button class="btn btn-primary" type="submit">Create ticket</button>
      </form>
    </div>
  `;
}

function renderTicketsTable(items) {
  if (!items.length) {
    return `<div class="notice">No tickets yet. Add a ticket above.</div>`;
  }
  return `
    <table class="table">
      <thead>
        <tr>
          <th>Ticket</th>
          <th>Subject</th>
          <th>Priority</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
          <tr>
            <td>${item.ticket_number}</td>
            <td>${item.subject}</td>
            <td>${item.priority}</td>
            <td><span class="badge">${item.status}</span></td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function bindTicketForm() {
  const form = document.getElementById("ticket-form");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      await apiFetch("/support/tickets", {
        method: "POST",
        body: JSON.stringify(data),
      });
      renderSupport();
    } catch (error) {
      alert(error.message);
    }
  });
}

function renderSettings() {
  pageTitleEl.textContent = "Settings";
  viewEl.innerHTML = `
    <div class="card">
      <h3>Theme</h3>
      <p>Switch between light and dark modes.</p>
      <button id="toggle-theme" class="btn btn-outline">Toggle theme</button>
    </div>
  `;

  const toggle = document.getElementById("toggle-theme");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const body = document.body;
      const next = body.dataset.theme === "dark" ? "light" : "dark";
      body.dataset.theme = next;
    });
  }
}

function renderRoute() {
  const hash = window.location.hash || "#/dashboard";
  setActiveRoute(hash);
  const handler = routes[hash] || renderDashboard;
  if (!state.token) {
    showLogin();
    return;
  }
  hideLogin();
  handler();
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
    setUser(response.user, response.access_token);
    renderRoute();
  } catch (error) {
    alert("Login failed. " + error.message);
  }
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("eoex_token");
  localStorage.removeItem("eoex_user");
  state.token = null;
  state.user = null;
  renderRoute();
});

userEmailEl.textContent = state.user?.email || "";
window.addEventListener("hashchange", renderRoute);

renderRoute();
