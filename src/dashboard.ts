/**
 * The HTML platform served at `/`. Kept as a single inlined string so the
 * Worker stays a one-file deploy with no static asset binding.
 *
 * Note: this is a String.raw template, so the markup below must contain no
 * backticks and no `${` sequences. The inline script therefore builds strings
 * by concatenation rather than interpolation.
 */
export const DASHBOARD_HTML = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Spark Post</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #0b0d12;
    --surface: #14171f;
    --surface-2: #1b1f29;
    --border: #272c38;
    --text: #e8eaf0;
    --muted: #8d94a6;
    --accent: #6c8cff;
    --accent-ink: #ffffff;
    --danger: #ff6b6b;
    --warn: #ffb454;
    --ok: #3ddc97;
    --li: #4aa3ff;
    --bs: #3ddc97;
    --radius: 12px;
    --shadow: 0 10px 30px rgb(0 0 0 / 0.45);
  }
  @media (prefers-color-scheme: light) {
    :root {
      --bg: #f6f7fa;
      --surface: #ffffff;
      --surface-2: #f0f2f7;
      --border: #e0e4ed;
      --text: #12151c;
      --muted: #626a7d;
      --accent: #3f5fe0;
      /* The dark-mode red only reaches 2.8:1 on white, so it gets darker here. */
      --danger: #c62828;
      --warn: #9a5300;
      --li: #1565d8;
      --bs: #0f7a52;
      --shadow: 0 10px 30px rgb(18 21 28 / 0.13);
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 860px; margin: 0 auto; padding: 40px 20px 80px; }
  .sr {
    position: absolute; width: 1px; height: 1px; overflow: hidden;
    clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap;
  }

  header { margin-bottom: 28px; }
  h1 { margin: 0 0 6px; font-size: 26px; letter-spacing: -0.02em; }
  .sub { color: var(--muted); font-size: 14px; margin: 0; }
  .sub code {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 1px 6px;
    font-size: 12.5px;
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px;
  }

  label { display: block; font-size: 12px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.06em; color: var(--muted); margin-bottom: 8px; }
  textarea {
    width: 100%;
    min-height: 82px;
    resize: vertical;
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 11px 13px;
    font: inherit;
  }
  textarea:focus, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }

  .row { display: flex; gap: 12px; align-items: center; justify-content: space-between;
         margin-top: 14px; flex-wrap: wrap; }
  .submit { display: flex; align-items: center; gap: 12px; }
  .hint { color: var(--muted); font-size: 12.5px; }
  .seg { display: flex; gap: 6px; }
  .seg button {
    background: var(--surface-2);
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 6px 14px;
    font: inherit;
    font-size: 13.5px;
    cursor: pointer;
  }
  .seg button[aria-checked="true"] { background: var(--accent); border-color: var(--accent);
                                     color: var(--accent-ink); font-weight: 600; }

  .primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: var(--accent);
    color: var(--accent-ink);
    border: 0;
    border-radius: 10px;
    padding: 10px 20px;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  .primary:disabled { opacity: 0.8; cursor: progress; }
  .spinner {
    width: 13px; height: 13px; border-radius: 50%; flex: none;
    border: 2px solid color-mix(in srgb, var(--accent-ink) 35%, transparent);
    border-top-color: var(--accent-ink);
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .banner {
    margin-top: 14px;
    border-radius: 10px;
    padding: 10px 13px;
    font-size: 13.5px;
    border: 1px solid color-mix(in srgb, var(--danger) 45%, transparent);
    background: color-mix(in srgb, var(--danger) 12%, transparent);
    color: var(--danger);
    white-space: pre-wrap;
  }

  .feed-head { display: flex; align-items: baseline; justify-content: space-between;
               margin: 34px 0 14px; gap: 12px; flex-wrap: wrap; }
  h2 { font-size: 15px; margin: 0; text-transform: uppercase; letter-spacing: 0.06em;
       color: var(--muted); }

  .posts { display: grid; gap: 12px; }
  .post { background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 16px; }
  .post.fresh { border-color: var(--accent); }
  .post-top { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }

  /* Tinted chips rather than coloured text, so a mixed feed scans by platform. */
  .badge { font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em; padding: 3px 9px;
           border-radius: 999px; background: var(--surface-2); border: 1px solid var(--border); }
  .badge[data-p="LinkedIn"] {
    color: var(--li);
    background: color-mix(in srgb, var(--li) 14%, transparent);
    border-color: color-mix(in srgb, var(--li) 38%, transparent);
  }
  .badge[data-p="X"] {
    color: var(--text);
    background: color-mix(in srgb, var(--text) 11%, transparent);
    border-color: color-mix(in srgb, var(--text) 32%, transparent);
  }
  .badge[data-p="Bluesky"] {
    color: var(--bs);
    background: color-mix(in srgb, var(--bs) 14%, transparent);
    border-color: color-mix(in srgb, var(--bs) 38%, transparent);
  }

  .new { font-size: 11px; font-weight: 700; letter-spacing: 0.05em;
         text-transform: uppercase; color: var(--accent); }
  .meta { color: var(--muted); font-size: 12.5px; margin-left: auto; display: flex; gap: 10px; }
  .content { margin: 0; white-space: pre-wrap; font-size: 15.5px; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .tag { font-size: 12.5px; color: var(--accent); }

  /* The hook is not part of what Copy puts on the clipboard, so it reads as a
     note about the post rather than as the post's own title. */
  .hook { margin: 12px 0 0; font-size: 13px; color: var(--muted);
          display: flex; gap: 8px; align-items: baseline; }
  .hook-label { flex: none; font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em;
                text-transform: uppercase; background: var(--surface-2);
                border: 1px solid var(--border); border-radius: 5px; padding: 1px 5px; }

  .overflow {
    margin: 12px 0 0; font-size: 13px; border-radius: 8px; padding: 8px 11px;
    color: var(--warn);
    background: color-mix(in srgb, var(--warn) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--warn) 35%, transparent);
  }

  .post-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
  .ghost { background: none; border: 1px solid var(--border); color: var(--muted);
           border-radius: 8px; padding: 5px 12px; font: inherit; font-size: 13px; cursor: pointer; }
  .ghost:hover:not(:disabled) { color: var(--text); }
  .ghost:disabled { opacity: 0.5; cursor: not-allowed; }
  .ghost.del:hover:not(:disabled) { color: var(--danger); border-color: var(--danger); }
  .over { color: var(--danger); font-weight: 600; }

  .state { color: var(--muted); text-align: center; padding: 40px 20px;
           border: 1px dashed var(--border); border-radius: var(--radius);
           display: grid; gap: 12px; justify-items: center; }
  .state.danger { color: var(--danger);
                  border-color: color-mix(in srgb, var(--danger) 40%, transparent); }

  .post.pending { border-style: dashed; }
  .sk {
    height: 11px; border-radius: 6px;
    background: linear-gradient(90deg, var(--surface-2) 25%, var(--border) 37%, var(--surface-2) 63%);
    background-size: 400% 100%;
    animation: shimmer 1.4s ease-in-out infinite;
  }
  .sk.line { margin-bottom: 9px; }
  .sk.line:last-child { margin-bottom: 0; }
  @keyframes shimmer { from { background-position: 100% 0; } to { background-position: 0 0; } }

  .toasts {
    position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%);
    width: min(430px, calc(100% - 32px));
    display: grid; gap: 8px; z-index: 50;
  }
  .toast {
    display: flex; align-items: center; gap: 12px;
    background: var(--surface); border: 1px solid var(--border);
    box-shadow: var(--shadow); border-radius: 10px; padding: 10px 12px;
    font-size: 13.5px;
    animation: rise 0.18s ease-out;
  }
  .toast > span { flex: 1; }
  .toast.danger { color: var(--danger);
                  border-color: color-mix(in srgb, var(--danger) 45%, transparent); }
  .toast button {
    background: none; border: 0; color: var(--accent); font: inherit; font-weight: 600;
    cursor: pointer; padding: 2px 4px; border-radius: 6px; flex: none;
  }
  @keyframes rise { from { opacity: 0; transform: translateY(6px); } }

  footer { margin-top: 44px; color: var(--muted); font-size: 12.5px; text-align: center; }

  @media (max-width: 520px) {
    .wrap { padding: 28px 15px 72px; }
    .row { flex-direction: column; align-items: stretch; }
    .row .seg { flex-wrap: wrap; }
    .submit { flex-direction: column-reverse; align-items: stretch; gap: 8px; }
    .hint { text-align: center; }
    .meta { margin-left: 0; flex-basis: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sk, .spinner, .toast { animation: none; }
  }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>Spark Post</h1>
    <p class="sub">AI social copy, generated and stored in Supabase. Also live as an MCP server at <code>/mcp</code>.</p>
  </header>

  <form class="card" id="composer">
    <label for="topic">Topic or announcement</label>
    <textarea id="topic" placeholder="e.g. We just shipped real-time collaboration in our editor"
              aria-describedby="topic-hint" required></textarea>
    <div class="row">
      <div class="seg" id="platforms" role="radiogroup" aria-label="Target platform"></div>
      <div class="submit">
        <span class="hint" id="topic-hint"></span>
        <button class="primary" id="go" type="submit">Generate</button>
      </div>
    </div>
    <div class="banner" id="error" role="alert" hidden></div>
  </form>

  <div class="feed-head">
    <h2>Saved posts</h2>
    <div class="seg" id="filters" role="radiogroup" aria-label="Filter by platform"></div>
  </div>
  <div class="posts" id="posts" aria-busy="true"></div>

  <footer id="footer"></footer>
</div>

<div class="toasts" id="toasts"></div>
<p class="sr" id="live" role="status" aria-live="polite"></p>

<script>
const PLATFORMS = ["LinkedIn", "X", "Bluesky"];
const LIMITS = { LinkedIn: 3000, X: 280, Bluesky: 300 };
const UNDO_MS = 5000;
const FRESH_MS = 4000;

let platform = "LinkedIn";
let filter = "All";
let posts = [];
let freshId = null;
let freshTimer = null;
let loading = true;
let loadError = "";
let pending = null;
const pendingDeletes = new Map();

const el = (id) => document.getElementById(id);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function when(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return new Date(iso).toLocaleDateString();
}

/** Single live region for status changes, so the feed itself stays quiet. */
function announce(message) {
  el("live").textContent = message;
}

/* ---------- segmented controls ---------- */

function buildGroup(host, values, key, onPick) {
  host.innerHTML = values
    .map((v) => '<button type="button" role="radio" data-' + key + '="' + v + '">' + v + "</button>")
    .join("");

  const buttons = Array.from(host.querySelectorAll("button"));
  buttons.forEach((button, index) => {
    button.onclick = () => onPick(button.dataset[key]);
    button.onkeydown = (event) => {
      const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      const next = buttons[(index + step + buttons.length) % buttons.length];
      onPick(next.dataset[key]);
      next.focus();
    };
  });
}

function markGroup(host, key, current) {
  host.querySelectorAll("button").forEach((button) => {
    const on = button.dataset[key] === current;
    button.setAttribute("aria-checked", String(on));
    // One tab stop per group; arrow keys move within it.
    button.tabIndex = on ? 0 : -1;
  });
}

function syncSegments() {
  markGroup(el("platforms"), "p", platform);
  markGroup(el("filters"), "f", filter);
}

function buildSegments() {
  buildGroup(el("platforms"), PLATFORMS, "p", (value) => {
    platform = value;
    syncSegments();
  });
  buildGroup(el("filters"), ["All"].concat(PLATFORMS), "f", (value) => {
    filter = value;
    syncSegments();
    render();
  });
  syncSegments();
}

/* ---------- messaging ---------- */

/** The composer banner is reserved for generation failures. */
function showError(message) {
  const box = el("error");
  box.hidden = !message;
  box.textContent = message || "";
}

/** Transient feedback, shown next to nothing in particular. Returns the action button. */
function toast(message, options) {
  const opts = options || {};
  const node = document.createElement("div");
  node.className = "toast" + (opts.tone === "danger" ? " danger" : "");

  const text = document.createElement("span");
  text.textContent = message;
  node.appendChild(text);

  let action = null;
  if (opts.actionLabel) {
    action = document.createElement("button");
    action.type = "button";
    action.textContent = opts.actionLabel;
    action.onclick = () => {
      dismiss();
      opts.onAction();
    };
    node.appendChild(action);
  }

  el("toasts").appendChild(node);
  const timer = setTimeout(dismiss, opts.duration || 3200);
  function dismiss() {
    clearTimeout(timer);
    node.remove();
  }
  return action;
}

/* ---------- rendering ---------- */

function render() {
  const feed = el("posts");
  feed.setAttribute("aria-busy", String(loading || Boolean(pending)));

  if (loading) {
    feed.innerHTML = skeleton() + skeleton() + skeleton();
    el("footer").textContent = "";
    return;
  }

  if (loadError) {
    feed.innerHTML = '<div class="state danger"><span>' + esc(loadError) + "</span>" +
      '<button class="ghost" id="retry" type="button">Try again</button></div>';
    el("retry").onclick = () => {
      loading = true;
      loadError = "";
      render();
      load();
    };
    el("footer").textContent = "";
    return;
  }

  const shown = filter === "All" ? posts : posts.filter((p) => p.platform === filter);
  // The placeholder sits where the finished post will land, so the eye is
  // already in the right place when generation completes.
  const showPending = pending && (filter === "All" || filter === pending.platform);
  let html = showPending ? skeleton(pending.platform) : "";

  if (!shown.length && !html) {
    html = '<div class="state">' +
      (posts.length ? "No " + esc(filter) + " posts yet." : "Nothing generated yet. Write a topic above.") +
      "</div>";
  } else {
    html += shown.map(card).join("");
  }

  feed.innerHTML = html;
  feed.querySelectorAll("[data-copy]").forEach((b) => {
    b.onclick = () => copy(b, posts.find((p) => p.id === b.dataset.copy));
  });
  feed.querySelectorAll("[data-regen]").forEach((b) => {
    b.onclick = () => regenerate(b.dataset.regen);
  });
  feed.querySelectorAll("[data-del]").forEach((b) => {
    b.onclick = () => remove(b.dataset.del);
  });

  el("footer").textContent = posts.length
    ? posts.length + " post" + (posts.length === 1 ? "" : "s") + " stored in Supabase"
    : "";
}

/** Placeholder card. With a platform it stands in for a draft being written. */
function skeleton(name) {
  return '<article class="post pending" aria-hidden="true">' +
    '<div class="post-top">' +
      (name
        ? '<span class="badge" data-p="' + esc(name) + '">' + esc(name) + "</span>"
        : '<span class="sk" style="width:76px;height:21px;border-radius:999px"></span>') +
      '<span class="meta">' + (name ? "Writing…" : "") + "</span>" +
    "</div>" +
    '<div class="sk line" style="width:96%"></div>' +
    '<div class="sk line" style="width:88%"></div>' +
    '<div class="sk line" style="width:62%"></div>' +
  "</article>";
}

function card(p) {
  const full = fullText(p);
  const limit = LIMITS[p.platform];
  const over = full.length - limit;
  const isFresh = p.id === freshId;

  return '<article class="post' + (isFresh ? " fresh" : "") + '" data-id="' + esc(p.id) + '">' +
    '<div class="post-top">' +
      '<span class="badge" data-p="' + esc(p.platform) + '">' + esc(p.platform) + "</span>" +
      (isFresh ? '<span class="new">New</span>' : "") +
      '<span class="meta">' +
        '<span class="' + (over > 0 ? "over" : "") + '">' + full.length + "/" + limit +
          (over > 0 ? " · " + over + " over" : " chars") + "</span>" +
        "<span>" + esc(when(p.created_at)) + "</span>" +
      "</span>" +
    "</div>" +
    '<p class="content">' + esc(p.content) + "</p>" +
    (p.hashtags && p.hashtags.length
      ? '<div class="tags">' + p.hashtags.map((t) =>
          '<span class="tag">' + esc(t.startsWith("#") ? t : "#" + t) + "</span>").join("") + "</div>"
      : "") +
    '<p class="hook" title="Suggested hook - not included when you copy">' +
      '<span class="hook-label">Hook</span>' + esc(p.headline) +
    "</p>" +
    (over > 0
      ? '<p class="overflow">' + over + " character" + (over === 1 ? "" : "s") +
        " over the " + esc(p.platform) + " limit. Regenerate for a shorter draft." + "</p>"
      : "") +
    '<div class="post-actions">' +
      '<button class="ghost" data-copy="' + esc(p.id) + '">Copy</button>' +
      '<button class="ghost" data-regen="' + esc(p.id) + '"' + (pending ? " disabled" : "") +
        ">Regenerate</button>" +
      '<button class="ghost del" data-del="' + esc(p.id) + '">Delete</button>' +
    "</div>" +
  "</article>";
}

/** Exactly what Copy puts on the clipboard, and what the counter measures. */
function fullText(p) {
  const tags = (p.hashtags || []).map((t) => (t.startsWith("#") ? t : "#" + t)).join(" ");
  return [p.content, tags].filter(Boolean).join("\n\n");
}

function markFresh(id) {
  freshId = id;
  clearTimeout(freshTimer);
  // "New" is a moment, not a state - let it decay on its own.
  freshTimer = setTimeout(() => {
    freshId = null;
    render();
  }, FRESH_MS);
}

function scrollToFresh() {
  const node = Array.from(el("posts").children).find((n) => n.dataset.id === freshId);
  if (node) node.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
}

/* ---------- actions ---------- */

function setBusy(on) {
  const button = el("go");
  button.disabled = on;
  button.setAttribute("aria-busy", String(on));
  button.innerHTML = on ? '<span class="spinner"></span>Generating…' : "Generate";
}

async function generate(topic, target) {
  if (pending) return false;

  // Only move the filter when it would otherwise hide the result.
  if (filter !== "All" && filter !== target) {
    filter = target;
    syncSegments();
  }

  pending = { platform: target };
  showError("");
  setBusy(true);
  render();

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, platform: target }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || res.statusText);

    posts.unshift(body.post);
    markFresh(body.post.id);
    pending = null;
    render();
    scrollToFresh();
    announce(target + " post generated.");
    return true;
  } catch (err) {
    pending = null;
    render();
    showError(err.message);
    announce("Generation failed. " + err.message);
    return false;
  } finally {
    setBusy(false);
  }
}

/** Recourse for a draft that came back over the limit or off-voice. */
function regenerate(id) {
  const post = posts.find((p) => p.id === id);
  if (post) generate(post.topic, post.platform);
}

async function copy(button, post) {
  if (!post) return;
  try {
    await navigator.clipboard.writeText(fullText(post));
    const original = button.textContent;
    button.textContent = "Copied";
    announce("Post copied to the clipboard.");
    setTimeout(() => { button.textContent = original; }, 1200);
  } catch {
    toast("Could not access the clipboard.", { tone: "danger" });
  }
}

/**
 * Deleting is optimistic and the network call is deferred, so Undo needs no
 * re-insert endpoint - it just cancels the pending request.
 */
function remove(id) {
  const index = posts.findIndex((p) => p.id === id);
  if (index === -1) return;

  const post = posts[index];
  posts.splice(index, 1);
  render();

  pendingDeletes.set(id, {
    post,
    index,
    timer: setTimeout(() => commitDelete(id), UNDO_MS),
  });

  const undo = toast("Post deleted.", {
    actionLabel: "Undo",
    duration: UNDO_MS,
    onAction: () => undoDelete(id),
  });
  // Focus left with the deleted card, so hand it to the only action left.
  if (undo) undo.focus();
  announce("Post deleted. Undo available.");
}

function undoDelete(id) {
  const entry = pendingDeletes.get(id);
  if (!entry) return;

  clearTimeout(entry.timer);
  pendingDeletes.delete(id);
  restore(entry);
  announce("Delete undone.");
}

function restore(entry) {
  posts.splice(Math.min(entry.index, posts.length), 0, entry.post);
  render();
}

async function commitDelete(id) {
  const entry = pendingDeletes.get(id);
  if (!entry) return;
  pendingDeletes.delete(id);

  try {
    const res = await fetch("/api/posts/" + encodeURIComponent(id), { method: "DELETE" });
    if (!res.ok) throw new Error((await res.json()).error || res.statusText);
  } catch (err) {
    restore(entry);
    toast("Could not delete that post. " + err.message, { tone: "danger", duration: 6000 });
  }
}

// A tab closed inside the undo window would otherwise leave the post behind.
addEventListener("pagehide", () => {
  pendingDeletes.forEach((entry, id) => {
    clearTimeout(entry.timer);
    fetch("/api/posts/" + encodeURIComponent(id), { method: "DELETE", keepalive: true });
  });
});

async function load() {
  try {
    const res = await fetch("/api/posts");
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || res.statusText);
    posts = body.posts;
    loadError = "";
  } catch (err) {
    loadError = "Could not load saved posts. " + err.message;
  }
  loading = false;
  render();
}

el("composer").onsubmit = async (event) => {
  event.preventDefault();
  const topic = el("topic").value.trim();
  if (!topic) {
    el("topic").focus();
    return;
  }
  if (await generate(topic, platform)) el("topic").value = "";
};

// Enter inserts a newline in a textarea, so the shortcut is the modified one.
el("topic").onkeydown = (event) => {
  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    el("composer").requestSubmit();
  }
};

el("topic-hint").textContent = (isMac ? "⌘" : "Ctrl+") + "↵ to generate";

buildSegments();
render();
load();
</script>
</body>
</html>`;
