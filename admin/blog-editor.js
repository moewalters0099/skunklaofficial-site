const status = document.querySelector("#status");
const result = document.querySelector("#result");
const selector = document.querySelector("#posts");
const form = document.querySelector("#post-form");
const buttons = [...form.querySelectorAll("button")];
let posts = [];
let categories = [];

function showView() {
  const views = [...document.querySelectorAll("[data-view]")];
  const active = views.find((view) => "#" + view.id === location.hash) ?? views[0];
  for (const view of views) view.hidden = view !== active;
  for (const link of document.querySelectorAll("nav a")) {
    if (link.hash === "#" + active.id) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
}

function showCategories() {
  const query = document.querySelector("#catalog-search").value.trim().toLowerCase();
  const matching = categories.filter(({ name }) => name.toLowerCase().includes(query));
  const rows = matching.map(({ name, path }) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = path;
    link.textContent = name;
    item.append(link);
    return item;
  });
  document.querySelector("#catalog-links").replaceChildren(...rows);
  document.querySelector("#catalog-status").textContent =
    matching.length ? "" : "No matching categories.";
}

async function loadCategories() {
  const catalogStatus = document.querySelector("#catalog-status");
  try {
    const response = await fetch("/catalog.html");
    if (!response.ok) throw new Error("Catalog unavailable");
    const catalog = new DOMParser().parseFromString(await response.text(), "text/html");
    categories = [...catalog.querySelectorAll("a.category-link")]
      .map((link) => ({
        name: link.textContent.trim(),
        path: new URL(link.getAttribute("href"), response.url).pathname,
      }))
      .filter(({ path }) => /^\/category-[a-z0-9-]+\.html$/.test(path));
    categories = [...new Map(categories.map((category) => [category.path, category])).values()];
    document.querySelector("#category-count").textContent = categories.length;
    document.querySelector("#catalog-search").addEventListener("input", showCategories);
    showCategories();
  } catch {
    catalogStatus.textContent = "Catalog categories could not be loaded. Refresh to try again.";
  }
}

window.addEventListener("hashchange", showView);

async function api(path, options) {
  const response = await fetch(path, options);
  if (response.status === 401) {
    location.replace("/admin/");
    throw new Error("Your session has expired.");
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload === null) {
    throw new Error(payload?.error ?? "The server could not complete the request. Please try again.");
  }
  return payload;
}

function showPost() {
  const post = posts.find((item) => item.id === selector.value);
  for (const field of ["title", "summary", "body", "photo_url", "video_url"]) {
    form.elements[field].value = post?.[field] ?? "";
  }
  document.querySelector("#form-title").textContent = post ? "Edit post" : "New post";
  document.querySelector("#draft").textContent = post?.published_at ? "Unpublish and save draft" : "Save draft";
}

async function loadPosts(selectedId = "") {
  posts = await api("/api/admin-posts");
  selector.replaceChildren(new Option("New post", ""));
  for (const post of posts) {
    const state = post.published_at ? "Published" : "Draft";
    selector.add(new Option(post.title + " (" + state + ")", post.id));
  }
  const published = posts.filter((post) => post.published_at).length;
  document.querySelector("#published-count").textContent = published;
  document.querySelector("#draft-count").textContent = posts.length - published;
  selector.value = selectedId;
  showPost();
}

selector.addEventListener("change", () => {
  result.textContent = "";
  showPost();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const action = event.submitter?.value ?? "draft";
  if (action === "draft" && posts.find((post) => post.id === selector.value)?.published_at &&
      !confirm("Remove this post from the public blog and save it as a draft?")) return;

  const data = Object.fromEntries(new FormData(form));
  data.action = action;
  data.id = selector.value || null;
  for (const button of buttons) button.disabled = true;
  selector.disabled = true;
  result.textContent = "Saving…";
  try {
    const saved = await api("/api/admin-posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const message = action === "publish" ? "Post published." : "Draft saved.";
    result.textContent = message;
    try {
      await loadPosts(saved.id);
    } catch {
      result.textContent = message + " Reload the editor to update the post list.";
      form.hidden = true;
      status.hidden = false;
      status.textContent = result.textContent;
    }
  } catch (error) {
    result.textContent = error.message;
  } finally {
    for (const button of buttons) button.disabled = false;
    selector.disabled = false;
  }
});

document.querySelector("#logout").addEventListener("click", async () => {
  try {
    await api("/api/admin-session", { method: "DELETE" });
    location.assign("/admin/");
  } catch (error) {
    status.hidden = false;
    status.textContent = error.message;
  }
});

(async () => {
  try {
    const session = await api("/api/admin-session");
    document.querySelector("#account-email").textContent = session.email;
    document.querySelector("#workspace").hidden = false;
    status.hidden = true;
    showView();
    document.dispatchEvent(new Event("dashboard-ready"));
    void loadCategories();
    await loadPosts();
    document.querySelector("#editor").hidden = false;
  } catch (error) {
    status.hidden = false;
    status.textContent = error.message;
  }
})();
