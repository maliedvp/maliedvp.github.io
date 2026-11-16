// Copies the BibTeX entry of a "Cite" disclosure to the clipboard.
// Buttons declare their target with command="--copy" commandfor="<id of the code element>".
(() => {
  const timers = new WeakMap();
  let lastMessage = '';

  function report(button, ok) {
    const tip = button.nextElementSibling; // the role="status" bubble
    clearTimeout(timers.get(button));
    button.removeAttribute('data-copied');
    button.removeAttribute('data-failed');
    let message = ok ? 'Copied' : 'Copy failed';
    if (message === lastMessage) message += ' '; // VoiceOver skips a message identical to the last one
    lastMessage = message;
    tip.textContent = '';
    button.setAttribute(ok ? 'data-copied' : 'data-failed', '');
    requestAnimationFrame(() => (tip.textContent = message));
    timers.set(button, setTimeout(() => {
      button.removeAttribute('data-copied');
      button.removeAttribute('data-failed');
      tip.textContent = '';
    }, 2000));
  }

  async function copy(button, target) {
    const text = target.innerText.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      report(button, true);
    } catch {
      report(button, false);
    }
  }

  // Homepage: "Cite" buttons in the info line open and close the BibTeX entry below that line
  document.addEventListener('click', (event) => {
    const toggle = event.target.closest('.cite-toggle');
    if (!toggle) return;
    const panel = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!panel) return;
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
  });

  if ('CommandEvent' in window) {
    // command events do not bubble, so listen in the capture phase
    document.addEventListener('command', (event) => {
      if (event.command === '--copy') copy(event.source, event.target);
    }, true);
  } else {
    // Browsers without Invoker Commands: same behaviour via a click listener
    document.addEventListener('click', (event) => {
      const button = event.target.closest('button[command="--copy"]');
      if (!button) return;
      const target = document.getElementById(button.getAttribute('commandfor'));
      if (target) copy(button, target);
    });
  }
})();
