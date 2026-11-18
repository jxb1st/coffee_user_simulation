// The simulator demo widget: a caption-free two-view video driven by inline JSON (script.pl-data): a live caption band (the latest
// assistant and user lines), a task-progress strip (phases, with the assistant's warnings and the planned mistakes marked along the
// time axis), a tick counter, simple controls and a collapsed transcript. Clicking a step, a mark or a transcript line seeks. No framework.
(function () {
  function init(root) {
    var video = root.querySelector("video"), d = JSON.parse(root.querySelector("script.pl-data").textContent);
    var dur = d.duration_s || 1, tickS = d.tick_s || 0.8, n = d.ticks_total || Math.round(dur / tickS);
    var sayA = root.querySelector(".sim-line.assistant .say"), sayU = root.querySelector(".sim-line.user .say"),
        tickEl = root.querySelector(".sim-tick"), strip = root.querySelector(".sim-strip"), dots = root.querySelector(".sim-dots"),
        playBtn = root.querySelector(".sim-playbtn"), range = root.querySelector("input[type=range]"), timeEl = root.querySelector(".sim-time"),
        tr = root.querySelector(".pl-transcript");
    video.src = root.dataset.video; range.max = dur; range.step = 0.1;
    var phases = d.phases || [];
    phases.forEach(function (p, i) {
      var el = document.createElement("div"); el.className = "sim-step"; el.style.left = (100 * (i + 0.5) / phases.length) + "%";
      el.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="l">' + esc(p.name) + "</span>";
      el.title = p.start_s == null ? "not reached" : "tick " + Math.floor(p.start_s / tickS);
      el.addEventListener("click", function () { if (p.start_s != null) seek(p.start_s); }); strip.appendChild(el); p.el = el;
    });
    var marks = [];
    (d.injections || []).forEach(function (i) { marks.push({ t: i.injected_s, cls: "mistake", title: "planned mistake: " + i.words }); });
    (d.warnings || []).forEach(function (w) { marks.push({ t: w.t_s, cls: "warn", title: "assistant warning: " + w.words }); });
    marks.forEach(function (m) {
      var el = document.createElement("div"); el.className = "sim-dot " + m.cls; el.style.left = (100 * m.t / dur) + "%"; el.title = m.title + " (tick " + Math.floor(m.t / tickS) + ")";
      el.addEventListener("click", function (ev) { ev.stopPropagation(); seek(m.t); }); dots.appendChild(el); m.el = el;
    });
    var rows = [];
    (d.events || []).forEach(function (e) { rows.push({ t: e.start, end: e.end, cls: e.speaker, html: "<b>" + (e.speaker === "assistant" ? "Assistant" : "User") + "</b> · tick " + e.tick + " — " + esc(e.text) }); });
    (d.injections || []).forEach(function (i) {
      rows.push({ t: i.injected_s, end: i.injected_s + 2.4, cls: "event", html: "planned mistake forced: " + esc(i.words) });
      if (i.released_s != null) rows.push({ t: i.released_s, end: i.released_s + 2.4, cls: "event", html: "released: " + esc(i.reason) + (i.prevented ? " — prevented" : "") });
    });
    rows.sort(function (a, b) { return a.t - b.t; });
    rows.forEach(function (r) {
      var li = document.createElement("li"); li.className = r.cls; li.innerHTML = r.html; li.dataset.t = r.t; li.dataset.end = r.end;
      li.addEventListener("click", function () { seek(r.t); }); tr.appendChild(li);
    });
    var lines = (d.events || []).slice().sort(function (a, b) { return a.start - b.start; });
    function seek(t) { video.currentTime = Math.max(0, Math.min(dur, t)); if (video.paused) video.play(); }
    function toggle() { if (video.paused) video.play(); else video.pause(); }
    root.querySelector(".sim-stage").addEventListener("click", toggle); playBtn.addEventListener("click", toggle);
    root.querySelector(".sim-full").addEventListener("click", function () { var el = root.querySelector(".sim-stage"); if (el.requestFullscreen) el.requestFullscreen(); });
    range.addEventListener("input", function () { video.currentTime = +range.value; });
    video.addEventListener("play", function () { root.classList.add("playing"); playBtn.textContent = "❚❚"; });
    video.addEventListener("pause", function () { root.classList.remove("playing"); playBtn.textContent = "▶"; });
    function mmss(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
    function update() {
      var t = video.currentTime, la = null, lu = null;
      lines.forEach(function (e) { if (e.start <= t) { if (e.speaker === "assistant") la = e; else lu = e; } });
      sayA.textContent = la ? la.text : ""; sayU.textContent = lu ? lu.text : "";
      tickEl.textContent = "Tick " + Math.min(n, Math.floor(t / tickS)) + " / " + n;
      range.value = t; timeEl.textContent = mmss(t) + " / " + mmss(dur);
      var cur = -1;
      phases.forEach(function (p, i) { if (p.start_s != null && t >= p.start_s) cur = i; });
      phases.forEach(function (p, i) { p.el.classList.toggle("done", i < cur || (i === cur && p.end_s != null && t >= p.end_s)); p.el.classList.toggle("now", i === cur); });
      marks.forEach(function (m) { m.el.classList.toggle("past", t >= m.t); });
      var seen = null;
      tr.querySelectorAll("li").forEach(function (li) { var on = t >= +li.dataset.t && t < +li.dataset.end; li.classList.toggle("now", on); if (on) seen = li; });
      if (seen && seen.scrollIntoView && root.querySelector("details").open) seen.scrollIntoView({ block: "nearest" });
    }
    video.addEventListener("timeupdate", update); video.addEventListener("seeked", update); video.addEventListener("loadedmetadata", update); update();
    root.dataset.ready = "1";
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  document.querySelectorAll(".sim").forEach(init);
})();
