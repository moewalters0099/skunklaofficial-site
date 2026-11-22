const status = document.querySelector("#status");
const result = document.querySelector("#result");
const selector = document.querySelector("#posts");
const form = document.querySelector("#post-form");
const buttons = [...form.querySelectorAll("button")];
let posts = [];

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
  for (const field of ["title", "summary", "body"]) {
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
    status.textContent = error.message;
  }
});

(async () => {
  try {
    const session = await api("/api/admin-session");
    await loadPosts();
    status.textContent = "Signed in as " + session.email;
    document.querySelector("#editor").hidden = false;
  } catch (error) {
    status.textContent = error.message;
  }
})();
