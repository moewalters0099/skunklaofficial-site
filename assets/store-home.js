(() => {
  const menu = document.querySelector(".store-menu");
  for (const button of document.querySelectorAll("[data-menu-open]")) {
    button.onclick = () => menu.showModal();
  }
  menu.onclick = (event) => { if (event.target === menu) menu.close(); };
  const search = document.querySelector(".store-search");
  for (const button of document.querySelectorAll("[data-search-open]")) {
    button.onclick = () => {
      search.classList.add("is-open");
      document.querySelector("#store-query").focus();
    };
  }
  search.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      search.classList.remove("is-open");
      document.querySelector("[data-search-open]").focus();
    }
  });
  const slides = [...document.querySelector("#store-slide").children];
  const controls = [...document.querySelectorAll(".store-slide-controls button")];
  controls.forEach((button, index) => {
    button.onclick = () => {
      slides.forEach((slide, position) => { slide.hidden = position !== index; });
      controls.forEach((control, position) => control.setAttribute("aria-pressed", String(position === index)));
    };
  });
  function updateCount() {
    try {
      const count = JSON.parse(localStorage.getItem("skunkla-cart") || "[]")
        .reduce((total, [, quantity]) => total + quantity, 0);
      document.querySelector(".store-cart-count").textContent = count;
    } catch {}
  }
  updateCount();
  window.addEventListener("storage", updateCount);
  window.addEventListener("pageshow", updateCount);
  document.addEventListener("click", () => queueMicrotask(updateCount));
})();
