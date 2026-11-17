// Episode player: a video (the presentation cut, 0.8 s per tick) with three panels driven by player_data.json on `timeupdate`:
// the transcript (current line highlighted, click → seek), the action queue (running command bold, done ones muted, takeover
// commands flagged), the sub-goal checklist; a tick bar with event / release / sub-goal marks. No framework.
(function () {
  function init(root) {
    var video = root.querySelector("video"), tr = root.querySelector(".pl-transcript"), ac = root.querySelector(".pl-actions"),
        sg = root.querySelector(".pl-subgoals"), bar = root.querySelector(".pl-tickbar"), prog = root.querySelector(".pl-progress"),
        tickEl = root.querySelector(".pl-tick"), outEl = root.querySelector(".pl-outcome");
    video.src = root.dataset.video;
    var inline = root.querySelector("script.pl-data");                       // the page embeds player_data.json inline; a data-timeline URL is the fallback
    var load = inline ? Promise.resolve(JSON.parse(inline.textContent)) : fetch(root.dataset.timeline).then(function (r) { return r.json(); });
    load.then(function (d) {
      var dur = d.duration_s || 1, tickS = d.tick_s || 0.8;
      outEl.textContent = (d.case || "") + " · " + (d.persona || "") + " · outcome " + (d.outcome || "");
      var rows = [];
      d.events.forEach(function (e) { rows.push({ t: e.start, end: e.end, cls: e.speaker, html: "<b>" + (e.speaker === "assistant" ? "assistant" : "user") + "</b> · t" + e.tick + " — " + esc(e.text) }); });
      (d.injections || []).forEach(function (i) {
        rows.push({ t: i.injected_s, end: i.injected_s + 2.4, cls: "event", html: "forced error: " + esc(i.words) });
        if (i.released_s != null) rows.push({ t: i.released_s, end: i.released_s + 2.4, cls: "event", html: "released: " + esc(i.reason) + (i.prevented ? " (prevented)" : "") });
      });
      rows.sort(function (a, b) { return a.t - b.t; });
      rows.forEach(function (r) {
        var li = document.createElement("li"); li.className = r.cls; li.innerHTML = r.html; li.dataset.t = r.t; li.dataset.end = r.end;
        li.addEventListener("click", function () { video.currentTime = r.t; video.play(); }); tr.appendChild(li);
      });
      (d.actions || []).forEach(function (a) {
        var li = document.createElement("li"); li.textContent = a.cmd; li.className = a.kind === "takeover" ? "takeover" : ""; if (a.status === "rejected") li.classList.add("rejected");
        li.dataset.t = a.start; li.dataset.end = a.end; li.addEventListener("click", function () { video.currentTime = a.start; video.play(); }); ac.appendChild(li);
      });
      (d.subgoals || []).forEach(function (s) {
        var li = document.createElement("li"); li.textContent = s.words; li.dataset.t = s.true_at_s == null ? "" : s.true_at_s; sg.appendChild(li);
        if (s.true_at_s != null) mark(s.true_at_s, "subgoal");
      });
      (d.injections || []).forEach(function (i) { mark(i.injected_s, "injected"); if (i.released_s != null) mark(i.released_s, "released"); });
      function mark(t, cls) { var m = document.createElement("div"); m.className = "pl-mark " + cls; m.style.left = (100 * t / dur) + "%"; m.title = cls + " at " + t.toFixed(1) + " s"; bar.appendChild(m); }
      bar.addEventListener("click", function (ev) { var r = bar.getBoundingClientRect(); video.currentTime = dur * (ev.clientX - r.left) / r.width; });
      function update() {
        var t = video.currentTime;
        prog.style.width = Math.min(100, 100 * t / dur) + "%";
        tickEl.textContent = "tick " + Math.floor(t / tickS);
        var lis = tr.querySelectorAll("li"), seen = null;
        lis.forEach(function (li) { var on = t >= +li.dataset.t && t < +li.dataset.end; li.classList.toggle("now", on); if (on) seen = li; });
        if (seen && seen.scrollIntoView) seen.scrollIntoView({ block: "nearest" });
        ac.querySelectorAll("li").forEach(function (li) { var s = +li.dataset.t, e = +li.dataset.end; li.classList.toggle("now", t >= s && t < e); li.classList.toggle("done", t >= e); });
        sg.querySelectorAll("li").forEach(function (li) { li.classList.toggle("done", li.dataset.t !== "" && t >= +li.dataset.t); });
      }
      video.addEventListener("timeupdate", update); video.addEventListener("seeked", update); update();
      root.dataset.ready = "1";
    });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  document.querySelectorAll(".eplayer").forEach(init);
})();
