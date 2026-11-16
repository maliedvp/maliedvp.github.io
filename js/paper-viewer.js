// Minimal paper viewer for papers/*.html and cv.html, built on PDF.js (js/pdfjs, pdfjs-dist 6.4.299).
// Layout: top bar with controls (.paper-bar), contents from the PDF bookmarks (.paper-toc),
// the paper (.pdf-viewer[data-pdf]) and the paper details (.paper-info).
// Pages are rendered only while they are near the viewport, so long papers stay light on memory.
import { getDocument, GlobalWorkerOptions, TextLayer, RenderingCancelledException } from './pdfjs/build/pdf.min.mjs';

const PDFJS = new URL('./pdfjs/', import.meta.url);
GlobalWorkerOptions.workerSrc = new URL('build/pdf.worker.min.mjs', PDFJS).href;

const ZOOM_STEPS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3]; // relative to "fit width"
const MAX_FIT_WIDTH = 900;         // CSS px: page width at 100% on large screens
const MAX_CANVAS_PIXELS = 2 ** 24; // stays below the canvas size limit of mobile Safari
const JUMP_MARGIN = 16;            // space kept between the top bar and a jump target

const bar = document.querySelector('.paper-bar');
const viewer = document.querySelector('.pdf-viewer');
const scroller = viewer.querySelector('.pdf-pages');
const inner = viewer.querySelector('.pdf-pages-inner');
const statusEl = viewer.querySelector('.pdf-status');
const docLabel = viewer.dataset.label || 'paper'; // used in status messages ("Loading CV …")
const pageInput = bar.querySelector('.pdf-page-input');
const totalEl = bar.querySelector('.pdf-total');
const zoomLevel = bar.querySelector('.pdf-zoom-level');
const controls = bar.querySelectorAll('.pdf-controls button, .pdf-controls input');
const toc = document.querySelector('.paper-toc');
const tocList = toc.querySelector('.toc-list');
const tocToggle = bar.querySelector('.toc-toggle');
const cite = document.querySelector('.paper-info .cite');

// On small screens the BibTeX entry starts collapsed, so the paper comes first
if (cite && matchMedia('(max-width: 899px)').matches) cite.open = false;

// "All research": when the visitor came here from the homepage in this tab, go back in the history instead of
// loading the homepage again. The browser then restores it exactly where it was, without rebuilding it from the top.
// Visitors from elsewhere (search engines, shared links) follow the link as usual.
const backLink = bar.querySelector('.paper-back');
backLink.addEventListener('click', (event) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; // new tab etc.
  if (!document.referrer || history.length < 2) return;
  const from = new URL(document.referrer);
  const home = new URL(backLink.href);
  const homePaths = [home.pathname, home.pathname.replace(/index\.html$/, '')];
  if (from.origin === location.origin && homePaths.includes(from.pathname)) {
    event.preventDefault();
    history.back();
  }
});

let pages = [];          // one entry per page, see init()
let zoom = 1;
let scale = 1;           // PDF.js scale in use: fit-width scale times zoom
let currentIndex = 0;
const nearby = new Set(); // pages within the observer's margin
let tocEntries = [];     // { button, pageIndex, frac } in document order
let activeEntry = null;

function setStatus(text) {
  statusEl.textContent = text;
  statusEl.hidden = !text;
}

function barBottom() {
  return bar.getBoundingClientRect().bottom;
}

function availableWidth() {
  const style = getComputedStyle(scroller);
  return scroller.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
}

// ---- Rendering -------------------------------------------------------------

// Size every page box for the current zoom; pages near the viewport are re-rendered, the rest drop their canvas.
function layout() {
  const widest = Math.max(...pages.map((p) => p.width));
  scale = (Math.min(availableWidth(), MAX_FIT_WIDTH) / widest) * zoom;
  inner.style.setProperty('--scale-factor', scale);
  for (const p of pages) {
    p.div.style.width = `${Math.floor(p.width * scale)}px`;
    p.div.style.height = `${Math.floor(p.height * scale)}px`;
  }
  zoomLevel.textContent = `${Math.round(zoom * 100)}%`;
  for (const p of pages) {
    if (nearby.has(p)) render(p);
    else release(p);
  }
}

async function render(p) {
  if (p.canvas && p.renderedScale === scale) return;
  p.task?.cancel();
  const target = scale;
  const viewport = p.page.getViewport({ scale: target });
  const outputScale = Math.min(
    window.devicePixelRatio || 1,
    Math.sqrt(MAX_CANVAS_PIXELS / (viewport.width * viewport.height)),
  );
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.setAttribute('aria-hidden', 'true'); // the text layer carries the text

  const task = p.page.render({
    canvas,
    viewport,
    transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
  });
  p.task = task;
  try {
    await task.promise;
  } catch (error) {
    if (!(error instanceof RenderingCancelledException)) console.error(error);
    return;
  } finally {
    if (p.task === task) p.task = null;
  }
  if (target !== scale || !nearby.has(p)) {
    canvas.width = 0;
    return;
  }

  // Swap in the finished canvas so zooming never flashes an empty page
  if (p.canvas) {
    p.canvas.width = 0;
    p.canvas.remove();
  }
  p.div.prepend(canvas);
  p.canvas = canvas;
  p.renderedScale = target;

  if (!p.textLayer) {
    p.textLayer = new TextLayer({ textContentSource: p.page.streamTextContent(), container: p.textDiv, viewport });
    p.textLayer.render().catch((error) => console.error(error));
  } else {
    p.textLayer.update({ viewport });
  }
}

function release(p) {
  p.task?.cancel();
  p.task = null;
  if (p.canvas) {
    p.canvas.width = 0; // frees the bitmap right away, notably in Safari
    p.canvas.remove();
    p.canvas = null;
  }
  p.renderedScale = 0;
}

// ---- Position: current page, jumps, zoom anchoring ----------------------------

// The current page is the one crossing a line a third of the way down the visible area
function findCurrentIndex() {
  const top = barBottom();
  const line = top + (window.innerHeight - top) / 3;
  const index = pages.findIndex((p) => p.div.getBoundingClientRect().bottom > line);
  return index === -1 ? pages.length - 1 : index;
}

function onScroll() {
  currentIndex = findCurrentIndex();
  if (document.activeElement !== pageInput) pageInput.value = currentIndex + 1;
  highlightTocEntry();
}

// Keep the same spot of the current page in place when the page size changes
function withAnchor(change) {
  const p = pages[currentIndex];
  const top = barBottom();
  const before = p.div.getBoundingClientRect();
  const fraction = (top - before.top) / before.height;
  change();
  const after = p.div.getBoundingClientRect();
  window.scrollBy(0, after.top + fraction * after.height - top);
}

function setZoom(value) {
  if (value === zoom) return;
  withAnchor(() => {
    zoom = value;
    layout();
  });
}

// Scroll so that a point of a page (fraction of its height from the top) sits just below the top bar
function scrollToPoint(pageIndex, frac = 0) {
  const rect = pages[pageIndex].div.getBoundingClientRect();
  window.scrollTo({ top: window.scrollY + rect.top + frac * rect.height - barBottom() - JUMP_MARGIN });
}

function goToPage(number) {
  if (!Number.isFinite(number)) {
    pageInput.value = currentIndex + 1;
    return;
  }
  const index = Math.min(Math.max(Math.round(number), 1), pages.length) - 1;
  pageInput.value = index + 1;
  scrollToPoint(index);
}

// ---- Contents (PDF bookmarks) --------------------------------------------------

async function resolveDestination(pdf, dest) {
  try {
    const explicit = typeof dest === 'string' ? await pdf.getDestination(dest) : dest;
    if (!Array.isArray(explicit)) return null;
    const [ref, mode, ...args] = explicit;
    const pageIndex = Number.isInteger(ref) ? ref : await pdf.getPageIndex(ref);
    if (!pages[pageIndex]) return null;
    // PDF y coordinates grow upwards; convert the destination's top edge to a fraction from the page top
    let top = null;
    if (mode?.name === 'XYZ') top = args[1];
    else if (mode?.name === 'FitH' || mode?.name === 'FitBH') top = args[0];
    else if (mode?.name === 'FitR') top = args[3];
    const [, y0, , y1] = pages[pageIndex].page.view;
    const frac = typeof top === 'number' ? Math.min(Math.max((y1 - top) / (y1 - y0), 0), 1) : 0;
    return { pageIndex, frac };
  } catch {
    return null;
  }
}

// Some LaTeX PDFs give a bookmark the anchor of the previous section (typically "References" added to the
// contents without \phantomsection). For such duplicates, look for a heading with the bookmark's title further on.
async function findHeading(title, fromIndex, belowFrac) {
  const wanted = title.toLowerCase().replace(/\s+/g, ' ');
  const last = Math.min(fromIndex + 15, pages.length - 1);
  for (let i = fromIndex; i <= last; i++) {
    const { page } = pages[i];
    const [, y0, , y1] = page.view;
    const { items } = await page.getTextContent();
    for (const item of items) {
      const text = item.str.trim().toLowerCase().replace(/\s+/g, ' ').replace(/^\d+(\.\d+)*\.?\s+/, '');
      if (text !== wanted) continue;
      const top = item.transform[5] + item.height;
      const frac = Math.min(Math.max((y1 - top) / (y1 - y0), 0), 1);
      if (i > fromIndex || frac > belowFrac) return { pageIndex: i, frac };
    }
  }
  return null;
}

// Optional per-page cleanup of the PDF bookmarks, as JSON in <script type="application/json" id="toc-config">:
// { "hide": [titles to drop], "unwrap": [titles replaced by their children], "rename": { "old title": "new title" } }
function readTocConfig() {
  try {
    return JSON.parse(document.getElementById('toc-config')?.textContent || '{}');
  } catch (error) {
    console.error('Invalid toc-config', error);
    return {};
  }
}

async function buildContents(pdf) {
  const outline = await pdf.getOutline().catch(() => null);
  if (!outline?.length) return;
  const { hide = [], unwrap = [], rename = {} } = readTocConfig();

  async function addItems(items, list) {
    for (const item of items) {
      const original = item.title.trim();
      if (hide.includes(original)) continue;
      if (unwrap.includes(original)) {
        await addItems(item.items ?? [], list);
        continue;
      }
      const li = document.createElement('li');
      const target = item.dest ? await resolveDestination(pdf, item.dest) : null;
      const title = rename[original] ?? original;
      if (target) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = title;
        const entry = { button, title, ...target };
        button.addEventListener('click', () => {
          const inDrawer = toc.classList.contains('is-open');
          scrollToPoint(entry.pageIndex, entry.frac);
          if (inDrawer) closeContents({ returnFocus: true });
        });
        li.append(button);
        tocEntries.push(entry);
      } else if (title) {
        const label = document.createElement('span');
        label.className = 'toc-label';
        label.textContent = title;
        li.append(label);
      }
      if (item.items?.length) {
        const sub = document.createElement('ol');
        await addItems(item.items, sub);
        li.append(sub);
      }
      if (li.childElementCount) list.append(li);
    }
  }

  await addItems(outline, tocList);

  const seen = new Set();
  for (const entry of tocEntries) {
    const key = `${entry.pageIndex}:${entry.frac}`;
    if (seen.has(key)) {
      const heading = await findHeading(entry.title, entry.pageIndex, entry.frac);
      if (heading) Object.assign(entry, heading);
    }
    seen.add(key);
  }
  tocEntries.sort((a, b) => a.pageIndex - b.pageIndex || a.frac - b.frac);
  if (tocEntries.length) document.body.classList.remove('no-toc');
}

// Mark the last section heading that has scrolled past the top bar
function highlightTocEntry() {
  if (!tocEntries.length) return;
  const line = barBottom() + JUMP_MARGIN + 8;
  let active = null;
  for (const entry of tocEntries) {
    const rect = pages[entry.pageIndex].div.getBoundingClientRect();
    if (rect.top + entry.frac * rect.height <= line) active = entry;
    else break;
  }
  if (active === activeEntry) return;
  activeEntry?.button.removeAttribute('aria-current');
  active?.button.setAttribute('aria-current', 'location');
  activeEntry = active;

  // Keep the marked entry visible inside the contents column without moving the page
  if (active) {
    const box = toc.getBoundingClientRect();
    const item = active.button.getBoundingClientRect();
    if (item.top < box.top || item.bottom > box.bottom) {
      toc.scrollTop += item.top - box.top - toc.clientHeight / 3;
    }
  }
}

function openContents() {
  toc.classList.add('is-open');
  tocToggle.setAttribute('aria-expanded', 'true');
  (activeEntry?.button ?? toc.querySelector('button'))?.focus({ preventScroll: true });
}

function closeContents({ returnFocus = false } = {}) {
  if (!toc.classList.contains('is-open')) return;
  toc.classList.remove('is-open');
  tocToggle.setAttribute('aria-expanded', 'false');
  if (returnFocus) tocToggle.focus({ preventScroll: true });
}

tocToggle.addEventListener('click', () => {
  if (toc.classList.contains('is-open')) closeContents();
  else openContents();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && toc.classList.contains('is-open')) closeContents({ returnFocus: true });
});
document.addEventListener('click', (event) => {
  if (toc.classList.contains('is-open') && !toc.contains(event.target) && !tocToggle.contains(event.target)) {
    closeContents();
  }
});
// The drawer only exists below 1200px
matchMedia('(min-width: 1200px)').addEventListener('change', (event) => {
  if (event.matches) closeContents();
});

// Browsers tie a wheel or trackpad gesture to the first element that can scroll. Once a side column has
// reached its end, hand the rest of the gesture to the page, so the paper never seems stuck.
function passWheelToPageAtEnds(column) {
  column.addEventListener('wheel', (event) => {
    if (event.ctrlKey || event.deltaY === 0) return;                // pinch zoom or sideways scrolling
    if (column.classList.contains('is-open')) return;               // the open drawer scrolls on its own
    if (column.scrollHeight <= column.clientHeight) return;         // not a scroll container: browser default
    const atTop = column.scrollTop <= 0;
    const atBottom = column.scrollTop + column.clientHeight >= column.scrollHeight - 1;
    if ((event.deltaY > 0 && atBottom) || (event.deltaY < 0 && atTop)) {
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      window.scrollBy(0, event.deltaY * unit);
    }
  }, { passive: false });
}
passWheelToPageAtEnds(toc);
passWheelToPageAtEnds(document.querySelector('.paper-info'));

// Pages that show when the PDF was last updated (cv.html): fill <time data-pdf-date> from the PDF's own
// modification or creation date, so the page needs no hand edit when the file is replaced.
async function showPdfDate(pdf) {
  const el = document.querySelector('[data-pdf-date]');
  if (!el) return;
  const { info } = await pdf.getMetadata().catch(() => ({}));
  const match = /^D:(\d{4})(\d{2})(\d{2})/.exec(info?.ModDate || info?.CreationDate || '');
  if (!match) return;
  const [, year, month, day] = match;
  el.dateTime = `${year}-${month}-${day}`;
  el.textContent = new Date(Date.UTC(+year, +month - 1, +day))
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  el.closest('[hidden]')?.removeAttribute('hidden');
}

// ---- Start -------------------------------------------------------------------------

async function init() {
  const loading = getDocument({
    url: new URL(viewer.dataset.pdf, document.baseURI).href,
    standardFontDataUrl: new URL('standard_fonts/', PDFJS).href,
    wasmUrl: new URL('wasm/', PDFJS).href,
    iccUrl: new URL('iccs/', PDFJS).href,
  });
  loading.onProgress = ({ loaded, total }) => {
    if (total) setStatus(`Loading ${docLabel} … ${Math.min(100, Math.round((loaded / total) * 100))}%`);
  };

  let pdf;
  try {
    pdf = await loading.promise;
  } catch (error) {
    console.error(error);
    setStatus(`The ${docLabel} could not be loaded. Please try again later.`);
    return;
  }
  showPdfDate(pdf);

  const proxies = await Promise.all(Array.from({ length: pdf.numPages }, (_, i) => pdf.getPage(i + 1)));
  pages = proxies.map((page, i) => {
    const { width, height } = page.getViewport({ scale: 1 });
    const div = document.createElement('div');
    div.className = 'pdf-page';
    div.dataset.index = i;
    div.setAttribute('role', 'group');
    div.setAttribute('aria-label', `Page ${i + 1} of ${pdf.numPages}`);
    const textDiv = document.createElement('div');
    textDiv.className = 'textLayer';
    div.append(textDiv);
    inner.append(div);
    return { page, width, height, div, textDiv, canvas: null, renderedScale: 0, task: null, textLayer: null };
  });

  // Contents first: showing the column changes the width available to the pages
  await buildContents(pdf);

  setStatus('');
  totalEl.textContent = pages.length;
  pageInput.max = pages.length;
  pageInput.value = 1;
  controls.forEach((control) => (control.disabled = false));
  layout();
  highlightTocEntry();

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const p = pages[entry.target.dataset.index];
      if (entry.isIntersecting) {
        nearby.add(p);
        render(p);
      } else {
        nearby.delete(p);
        release(p);
      }
    }
  }, { rootMargin: '100% 0px' });
  pages.forEach((p) => observer.observe(p.div));

  let frame = 0;
  window.addEventListener('scroll', () => {
    if (!frame) frame = requestAnimationFrame(() => {
      frame = 0;
      onScroll();
    });
  }, { passive: true });

  let lastWidth = scroller.clientWidth;
  new ResizeObserver(() => {
    if (scroller.clientWidth === lastWidth) return;
    lastWidth = scroller.clientWidth;
    withAnchor(layout);
  }).observe(scroller);

  bar.querySelector('[data-zoom="in"]').addEventListener('click', () => {
    setZoom(ZOOM_STEPS.find((step) => step > zoom + 1e-6) ?? zoom);
  });
  bar.querySelector('[data-zoom="out"]').addEventListener('click', () => {
    setZoom(ZOOM_STEPS.findLast((step) => step < zoom - 1e-6) ?? zoom);
  });
  bar.querySelector('[data-zoom="fit"]').addEventListener('click', () => setZoom(1));

  pageInput.addEventListener('change', () => goToPage(pageInput.valueAsNumber));
  pageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') goToPage(pageInput.valueAsNumber);
  });
}

init();
