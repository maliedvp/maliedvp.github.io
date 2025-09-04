document.addEventListener("DOMContentLoaded", async function () {
  // Only run on mobile
  if (!window.matchMedia("(max-width: 768px)").matches) return;

  // Defaults
  let cfg = {
    text: "Scroll down",
    delay_ms: 1000,
    auto_hide_ms: 0,     // 0 = don't auto-hide
    bottom_px: 60
  };

  // Try loading optional JSON config
  try {
    const res = await fetch("js/scroll-hint.config.json", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      cfg = { ...cfg, ...data };
    }
  } catch (_) { /* ignore if missing when running locally */ }

  // Ensure the hint element exists (create if not in HTML)
  let hint = document.getElementById("scrollHint");
  if (!hint) {
    hint = document.createElement("div");
    hint.id = "scrollHint";
    hint.className = "scroll-hint";
    document.body.appendChild(hint);
  }

  // Apply text and position (CSS handles visuals)
  hint.textContent = cfg.text;
  hint.style.bottom = cfg.bottom_px + "px";

  // Show after delay unless user has scrolled
  let timer = setTimeout(() => {
    if (window.scrollY <= 20) hint.classList.add("visible");
  }, cfg.delay_ms);

  // Hide when user scrolls
  const onScroll = () => {
    hint.classList.remove("visible");
    clearTimeout(timer);
    window.removeEventListener("scroll", onScroll);
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  // Optional auto-hide after N ms even if no scroll
  if (cfg.auto_hide_ms > 0) {
    setTimeout(() => hint.classList.remove("visible"), cfg.delay_ms + cfg.auto_hide_ms);
  }
});