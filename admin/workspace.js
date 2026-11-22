const themeToggle = document.querySelector("#theme-toggle");

function applyTheme(dark) {
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  themeToggle.setAttribute("aria-pressed", String(dark));
  themeToggle.textContent = dark ? "Light mode" : "Dark mode";
}
applyTheme(localStorage.getItem("skunkla-admin-theme") === "dark");
themeToggle.addEventListener("click", () => {
  const dark = themeToggle.getAttribute("aria-pressed") !== "true";
  applyTheme(dark);
  localStorage.setItem("skunkla-admin-theme", dark ? "dark" : "light");
});

const adminSearch = document.querySelector("#admin-search");
const adminList = document.querySelector("#admin-list");
const adminListStatus = document.querySelector("#admin-list-status");
const addAdmin = document.querySelector("#add-admin");
const addAdminStatus = document.querySelector("#add-admin-status");
let accounts = null;

function showAccounts() {
  if (!accounts) return;
  const query = adminSearch.value.trim().toLowerCase();
  const matching = accounts.filter(({ email }) => email.includes(query));
  const rows = matching.map(({ email, created_at }) => {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = email;
    const details = document.createElement("small");
    details.textContent = created_at ? "Administrator · Added " + created_at.slice(0, 10) : "Administrator";
    item.append(name, details);
    return item;
  });
  adminList.replaceChildren(...rows);
  adminListStatus.textContent = rows.length ? "" : "No matching admins.";
}

async function loadAccounts() {
  adminListStatus.textContent = "Loading administrators…";
  try {
    accounts = await api("/api/admin-accounts");
    showAccounts();
  } catch (error) {
    adminListStatus.textContent = error.message;
  }
}

function openAdmins() {
  if (location.hash === "#admins" && !document.querySelector("#workspace").hidden) {
    void loadAccounts();
  }
}
window.addEventListener("hashchange", openAdmins);
document.addEventListener("dashboard-ready", openAdmins);
adminSearch.addEventListener("input", showAccounts);
addAdmin.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = addAdmin.querySelector("button");
  const data = Object.fromEntries(new FormData(addAdmin));
  button.disabled = true;
  addAdminStatus.textContent = "Creating administrator…";
  try {
    await api("/api/admin-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    addAdmin.reset();
    adminSearch.value = "";
    addAdminStatus.textContent = "Administrator created.";
    await loadAccounts();
  } catch (error) {
    addAdminStatus.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
