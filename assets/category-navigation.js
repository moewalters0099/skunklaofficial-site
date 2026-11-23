(() => {
  for (const item of document.querySelectorAll(".store-categories .store-category-item")) {
    const menu = item.querySelector("details");
    const toggle = menu.querySelector("summary");
    item.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") menu.open = true;
    });
    item.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse" && !menu.contains(document.activeElement)) menu.open = false;
    });
    item.addEventListener("focusout", (event) => {
      if (!item.contains(event.relatedTarget) && !item.matches(":hover")) menu.open = false;
    });
    item.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !menu.open) return;
      event.preventDefault();
      menu.open = false;
      toggle.focus();
    });
  }
})();
