/* 真实传输实验回放：读取 window.REAL_TRANSPORT_EVIDENCE（由 real-evidence.js 提供）。
   纯原生 JS，无框架、无打包、无网络请求；在 file:// 与 GitHub Pages 均可运行。 */
(function () {
  "use strict";

  var evidence = window.REAL_TRANSPORT_EVIDENCE;
  var labEl = document.getElementById("lab");
  var noEvidenceEl = document.getElementById("no-evidence");
  var panelEl = document.getElementById("evidence-panel");

  var LABELS = {
    environment: "运行环境",
    scope: "范围说明",
    run_start: "运行开始",
    run_end: "运行结束",
    run_error: "运行错误",
    udp_bind: "UDP 绑定端点",
    udp_send: "UDP 发送数据报",
    udp_recv: "UDP 接收数据报",
    udp_reply: "UDP 回送长度",
    udp_reply_recv: "UDP 收到回送",
    tcp_state_transition: "TCP 状态阶段（socket API 观察）",
    tcp_connect: "TCP connect 完成",
    tcp_accept: "TCP accept 返回",
    tcp_send: "TCP sendall 写入",
    tcp_shutdown_wr: "TCP 关闭写入方向",
    tcp_recv: "TCP recv 读取块",
    tcp_decoded_message: "重建应用消息",
    tcp_eof: "TCP 流结束（EOF）",
    assertion: "自检",
    observation: "观察结论"
  };
  var META = { mode: 1, host: 1, transport: 1, seq: 1, ts_utc: 1, t_rel_ms: 1, event: 1 };
  var EVIDENCE_BASE = "../network-labs/evidence/";

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function label(name) {
    return LABELS[name] || name;
  }

  function isEndpoint(value) {
    return Array.isArray(value) && value.length === 2 &&
      typeof value[0] === "string" && value[0].indexOf(".") >= 0 &&
      typeof value[1] === "number";
  }

  function one(value) {
    if (value === null || value === undefined) return "—";
    if (isEndpoint(value)) return value[0] + ":" + value[1];
    if (Array.isArray(value)) return value.map(one).join(" · ");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  function valueHtml(key, value) {
    if (key === "notes" && Array.isArray(value)) {
      return '<ul class="note-list">' + value.map(function (n) {
        return "<li>" + esc(n) + "</li>";
      }).join("") + "</ul>";
    }
    if (Array.isArray(value) && value.length && Array.isArray(value[0])) {
      return '<ul class="note-list">' + value.map(function (item) {
        return "<li>" + esc(one(item)) + "</li>";
      }).join("") + "</ul>";
    }
    return '<span class="field-value">' + esc(one(value)) + "</span>";
  }

  function rowsHtml(obj) {
    return Object.keys(obj).sort().map(function (key) {
      return '<div class="field-row"><dt>' + esc(key) + "</dt><dd>" +
        valueHtml(key, obj[key]) + "</dd></div>";
    }).join("");
  }

  // ---- graceful handling of missing / failed evidence --------------------
  if (!evidence || evidence.mode !== "real" || !evidence.udp || !evidence.tcp ||
      !evidence.udp.events || !evidence.tcp.events) {
    labEl.hidden = true;
    panelEl.hidden = true;
    noEvidenceEl.hidden = false;
    return;
  }

  var mode = "udp";
  var current = 0;
  var timer = null;

  var listEl = document.getElementById("event-list");
  var detailEl = document.getElementById("event-detail");
  var countEl = document.getElementById("event-count");
  var summaryEl = document.getElementById("mode-summary");
  var playBtn = document.getElementById("play");
  var speedEl = document.getElementById("speed");

  function events() {
    return evidence[mode].events;
  }

  function detailHtml(ev) {
    var head = '<div class="detail-head"><span class="eyebrow">STEP ' + esc(ev.seq) +
      " / " + events().length + '</span><h3>' + esc(label(ev.event)) +
      '</h3><div class="detail-times"><span>' + esc(ev.ts_utc) +
      "</span><span>+" + esc(ev.t_rel_ms) + " ms</span></div></div>";
    var rest = {};
    Object.keys(ev).forEach(function (key) {
      if (!META[key]) rest[key] = ev[key];
    });
    var rows = rowsHtml(rest);
    return head + '<dl class="field-list">' +
      (rows || '<p class="empty">（无额外字段）</p>') + "</dl>";
  }

  function renderList() {
    var list = events();
    listEl.innerHTML = list.map(function (ev, index) {
      var time = String(ev.ts_utc || "").slice(11, 23);
      return '<li><button type="button" class="event-chip' +
        (index === current ? " current" : "") + '" data-index="' + index + '">' +
        '<span class="chip-seq">' + esc(ev.seq) + "</span>" +
        '<span class="chip-label">' + esc(label(ev.event)) + "</span>" +
        '<span class="chip-ts">' + esc(time) + "</span></button></li>";
    }).join("");
    var active = listEl.querySelector(".event-chip.current");
    if (active && active.scrollIntoView) active.scrollIntoView({ block: "nearest" });
  }

  function renderSummary() {
    var summary = evidence[mode].summary || {};
    summaryEl.innerHTML = "<h3>本次 " + mode.toUpperCase() + " 运行结论（真实实测）</h3>" +
      '<dl class="field-list">' + rowsHtml(summary) + "</dl>";
  }

  function renderStep() {
    var list = events();
    if (current < 0) current = 0;
    if (current > list.length - 1) current = list.length - 1;
    detailEl.innerHTML = detailHtml(list[current]);
    countEl.textContent = (list.length ? current + 1 : 0) + " / " + list.length;
    renderList();
    document.getElementById("back").disabled = current === 0;
    document.getElementById("next").disabled = current === list.length - 1;
  }

  function stopPlay() {
    if (timer) { clearInterval(timer); timer = null; }
    playBtn.textContent = "播放";
  }

  function setStep(index) {
    current = index;
    renderStep();
  }

  function stepNext() {
    if (current < events().length - 1) {
      setStep(current + 1);
      return true;
    }
    return false;
  }

  function togglePlay() {
    if (timer) { stopPlay(); return; }
    playBtn.textContent = "暂停";
    timer = setInterval(function () {
      if (!stepNext()) stopPlay();
    }, Number(speedEl.value) || 550);
  }

  function switchMode(next) {
    stopPlay();
    mode = next;
    current = 0;
    document.querySelectorAll(".mode-switch button").forEach(function (button) {
      button.setAttribute("aria-selected", button.getAttribute("data-mode") === next ? "true" : "false");
    });
    renderSummary();
    renderStep();
  }

  // ---- build environment / evidence panel --------------------------------
  var env = evidence.environment || {};
  var envFields = [
    ["结果 result", evidence.result],
    ["脚本 script", (env.script || "") + " v" + (env.script_version || "")],
    ["Python", (env.python_version || "") + " (" + (env.python_implementation || "") + ")"],
    ["操作系统 platform", env.platform],
    ["UTC 运行时间", env.utc_started],
    ["地址族 socket_family", env.socket_family],
    ["套接字类型", (env.socket_types || []).join(" / ")],
    ["仅标准库", String(env.stdlib_only)],
    ["网络范围", env.network],
    ["精确 CLI（argv）", env.cli_string],
    ["数据性质", env.data]
  ];
  document.getElementById("env-fields").innerHTML = envFields.map(function (pair) {
    return '<div class="field-row"><dt>' + esc(pair[0]) + "</dt><dd>" +
      '<span class="field-value">' + esc(one(pair[1])) + "</span></dd></div>";
  }).join("");

  var links = [
    ["environment.json", EVIDENCE_BASE + "environment.json"],
    ["udp-real.jsonl", EVIDENCE_BASE + "udp-real.jsonl"],
    ["tcp-real.jsonl", EVIDENCE_BASE + "tcp-real.jsonl"],
    ["real-transport.json", EVIDENCE_BASE + "real-transport.json"],
    ["证据 README.md", EVIDENCE_BASE + "README.md"],
    ["real-transport-lab.py", "../network-labs/real-transport-lab.py"]
  ];
  document.getElementById("evidence-links").innerHTML = links.map(function (pair) {
    return '<a href="' + esc(pair[1]) + '">' + esc(pair[0]) + "</a>";
  }).join("");

  var cli = env.cli_string || "python3 public/network-labs/real-transport-lab.py all --chunk 7 --output-dir public/network-labs/evidence";
  document.getElementById("repro-commands").textContent =
    "# 本次合并证据（同一进程，生成四个文件）\n" + cli + "\n\n" +
    "# 单独验证两种真实模式（另一次运行，端口不同）\n" +
    "python3 public/network-labs/real-transport-lab.py udp\n" +
    "python3 public/network-labs/real-transport-lab.py tcp\n\n" +
    "# 在仓库根目录执行；JS 包装由同一 real-transport.json 生成，见证据 README。";

  var notes = evidence.scope || [];
  document.getElementById("scope-notes").innerHTML =
    "<h3>范围与真实性说明（来自证据 scope）</h3>" +
    '<ul class="note-list">' + notes.map(function (note) {
      return "<li>" + esc(note) + "</li>";
    }).join("") + "</ul>" +
    "<p>权威参考：<a href=\"https://www.rfc-editor.org/rfc/rfc768.html\">UDP RFC 768</a>、<a href=\"https://www.rfc-editor.org/rfc/rfc9293.html\">TCP RFC 9293</a>。</p>";

  // ---- honest banner when a run did not pass -----------------------------
  if (evidence.result !== "PASS") {
    var warning = document.createElement("p");
    warning.className = "scope-warning";
    warning.textContent = "注意：该次真实运行的 result 不是 PASS（" +
      String(evidence.result) + "）。以下事件是当时记录到的真实过程，未做成功化改写。";
    labEl.insertBefore(warning, labEl.firstChild);
  }

  // ---- wire up controls --------------------------------------------------
  labEl.hidden = false;
  document.querySelectorAll(".mode-switch button").forEach(function (button) {
    button.addEventListener("click", function () {
      switchMode(button.getAttribute("data-mode"));
    });
  });
  document.getElementById("back").addEventListener("click", function () {
    stopPlay(); setStep(current - 1);
  });
  document.getElementById("next").addEventListener("click", function () {
    stopPlay(); stepNext();
  });
  document.getElementById("end").addEventListener("click", function () {
    stopPlay(); setStep(events().length - 1);
  });
  playBtn.addEventListener("click", togglePlay);
  speedEl.addEventListener("change", function () {
    if (timer) { stopPlay(); togglePlay(); }
  });
  listEl.addEventListener("click", function (event) {
    var chip = event.target.closest(".event-chip");
    if (chip) { stopPlay(); setStep(Number(chip.getAttribute("data-index"))); }
  });

  renderSummary();
  renderStep();
})();
