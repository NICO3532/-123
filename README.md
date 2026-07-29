[Uploading data.js…]()
(function () {
  "use strict";
  const KEY = "xhs_video_workbench_v3";
  const S = window.SEED;
  // 每日自动化抓取的 hotspots.js 优先覆盖内置热点
  if (window.HOTSPOT_DATA && window.HOTSPOT_DATA.days && window.HOTSPOT_DATA.days[0] && window.HOTSPOT_DATA.days[0].items) {
    S.hotspots = window.HOTSPOT_DATA.days[0].items;
  }

  // 流水线 6 阶段（视频博主核心工作流）
  const IC = 'viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const STAGES = [
    { key: "pool", name: "灵感池", color: "#A0A0A8", icon: '<svg ' + IC + '><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.6 1 1.2 1 2.5h6c0-1.3.3-1.9 1-2.5A6 6 0 0 0 12 3Z"/></svg>' },
    { key: "script", name: "写脚本", color: "#E8A33D", icon: '<svg ' + IC + '><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>' },
    { key: "shoot", name: "拍摄", color: "#3A7AFE", icon: '<svg ' + IC + '><path d="M3 7h3l2-2h4l2 2h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="11.5" cy="13" r="3.2"/></svg>' },
    { key: "edit", name: "剪辑", color: "#8B5CF6", icon: '<svg ' + IC + '><circle cx="6" cy="6" r="2.4"/><circle cx="6" cy="18" r="2.4"/><path d="M8 7.5 20 18M8 16.5 20 6"/></svg>' },
    { key: "published", name: "已发布", color: "#1FA971", icon: '<svg ' + IC + '><path d="M4.5 16.5c-1.5 1.5-2 4-2 4s2.5-.5 4-2M9 15l8-8 2 2-8 8-3-3Z"/><path d="M14 6l2 2"/></svg>' },
    { key: "review", name: "复盘", color: "#FF2442", icon: '<svg ' + IC + '><path d="M4 20V4M4 20h16M8.5 16v-5M12.5 16V8M16.5 16v-9"/></svg>' }
  ];

  let state = defaultState();
  let liveHotspots = null;   // 云端 Gist 的每日热点；无 token / 离线时为 null，回退本地快照

  function defaultState() {
    return {
      ideas: clone(S.seedIdeas),
      reviews: [],
      deals: [],
      profile: clone(S.profile)
    };
  }
  function save() { Sync.save(state); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  // 热点来源：云端优先，无则回退内置/本地快照
  function getHotspots() {
    return (liveHotspots && liveHotspots.length) ? liveHotspots : (S.hotspots || []);
  }
  // 热点来源角标：云端实时 / 本地快照
  function updateHotSrc() {
    const el = $("#hot-src"); if (!el) return;
    if (liveHotspots && liveHotspots.length) {
      el.hidden = false;
      el.textContent = "● 云端实时";
      el.className = "hot-src live";
    } else {
      el.hidden = false;
      el.textContent = "○ 本地快照";
      el.className = "hot-src local";
    }
  }
  function $(s, r) { return (r || document).querySelector(s); }
  function uid() { return "id" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // ---------- 渲染：顶部数据条 ----------
  function renderStats() {
    const pub = state.ideas.filter(i => i.stage === "published" || i.stage === "review").length;
    const reviewed = state.reviews.length;
    const todo = Math.max(0, pub - reviewed);
    const fansNow = state.profile.startFans;
    const goal = state.profile.goalFans;
    const pct = Math.min(100, Math.round((fansNow / goal) * 100));
    $("#st-fans").innerHTML = '<b class="red">' + fansNow + '</b><span>粉丝 / 目标 ' + goal + '</span>';
    $("#st-week").innerHTML = '<b>' + pub + '</b><span>已发布视频</span>';
    $("#st-review").innerHTML = '<b style="color:' + (todo ? '#FF2442' : '#1FA971') + '">' + todo + '</b><span>待复盘</span>';
    $("#st-pipe").innerHTML = '<b>' + state.ideas.filter(i => ["script","shoot","edit"].includes(i.stage)).length + '</b><span>制作中</span>';
    const pgyOk = fansNow >= 1000;
    $("#st-biz").innerHTML = '<b class="' + (pgyOk ? "green" : "red") + '">' + (pgyOk ? "可接单" : "涨粉中") + '</b><span>蒲公英 ' + (pgyOk ? "已达标" : "差 " + (1000 - fansNow)) + "</span>";
    $("#fans-bar i").style.width = pct + "%";
    $("#kpi-fans").textContent = fansNow;
    $("#kpi-fans-sub").textContent = "已 " + pct + "% · 目标 " + goal + " 粉（开蒲公英接商单）";
  }

  // ---------- 渲染：今日聚焦 ----------
  function renderFocus() {
    const ul = $("#focus-list");
    const tips = [];
    const pool = state.ideas.filter(i => i.stage === "pool");
    const script = state.ideas.filter(i => i.stage === "script");
    const shoot = state.ideas.filter(i => i.stage === "shoot");
    const edit = state.ideas.filter(i => i.stage === "edit");
    const published = state.ideas.filter(i => i.stage === "published");
    const reviewedIds = state.reviews.map(r => r.ideaId);
    const needReview = published.filter(i => !reviewedIds.includes(i.id));

    if (script.length) tips.push("《" + script[0].title + "》脚本进行中，今天把它收尾");
    if (shoot.length) tips.push("《" + shoot[0].title + "》待拍摄，排一下今天机位/场景");
    if (edit.length) tips.push("《" + edit[0].title + "》剪辑中，先剪完前 3 秒钩子");
    if (pool.length) tips.push("灵感池有 " + pool.length + " 个，挑 1 个今天写脚本");
    needReview.forEach(i => tips.push("《" + i.title + "》已发布，记得复盘数据"));
    if (!tips.length) tips.push("流水线空了，去热点雷达捞一条二创选题吧");

    ul.innerHTML = tips.map(t => '<li><span class="ic">→</span><span>' + esc(t) + "</span></li>").join("");
  }

  // ---------- 渲染：看板 ----------
  let dragId = null;
  function renderBoard() {
    const board = $("#board");
    board.innerHTML = "";
    STAGES.forEach(st => {
      const items = state.ideas.filter(i => i.stage === st.key);
      const col = document.createElement("div");
      col.className = "col";
      col.dataset.stage = st.key;
      col.innerHTML =
        '<div class="col-head"><div class="name"><span class="stage-ic" style="color:' + st.color + '">' + st.icon + '</span>' + st.name + '</div><span class="count">' + items.length + "</span></div>";
      items.forEach((it, idx) => { const el = ticket(it); el.style.animationDelay = (idx * 0.045) + "s"; col.appendChild(el); });
      // 空列也能接收拖拽
      col.addEventListener("dragover", e => { e.preventDefault(); col.classList.add("drag-over"); });
      col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
      col.addEventListener("drop", e => {
        e.preventDefault(); col.classList.remove("drag-over");
        if (dragId) moveStage(dragId, st.key);
      });
      board.appendChild(col);
    });
  }

  function ticket(it) {
    const el = document.createElement("div");
    el.className = "ticket";
    el.draggable = true;
    el.dataset.id = it.id;
    const pfs = (it.platform || []).map(p =>
      '<span class="pf ' + p + '">' + (p === "xhs" ? "小红书" : "抖音") + "</span>").join("");
    const sc = it.script || {};
    const sblks = [it.hook, sc.pain, sc.steps, sc.end].filter(Boolean);
    const scriptChip = sblks.length === 4 ? '<span class="chip tag">脚本·终稿</span>'
      : sblks.length > 0 ? '<span class="chip">脚本·草稿</span>' : "";
    el.innerHTML =
      '<div class="tt">' + esc(it.title) + "</div>" +
      (it.hook ? '<div class="hook">⏱ ' + esc(it.hook) + "</div>" : "") +
      '<div class="meta"><span class="chip tag">' + esc(it.tag || "AI") + "</span>" + pfs +
      scriptChip + (it.due ? '<span class="due">' + esc(it.due.slice(5)) + "</span>" : "") + "</div>" +
      '<div class="acts"><button data-act="edit">编辑</button><button data-act="del">删除</button></div>';
    el.addEventListener("dragstart", () => { dragId = it.id; el.classList.add("dragging"); });
    el.addEventListener("dragend", () => { dragId = null; el.classList.remove("dragging"); });
    el.querySelector('[data-act="edit"]').onclick = e => { e.stopPropagation(); openModal(it.id); };
    el.querySelector('[data-act="del"]').onclick = e => {
      e.stopPropagation();
      if (confirm("删除《" + it.title + "》？")) { state.ideas = state.ideas.filter(x => x.id !== it.id); save(); refresh(); }
    };
    return el;
  }

  function moveStage(id, stage) {
    const it = state.ideas.find(x => x.id === id);
    if (it && it.stage !== stage) { it.stage = stage; save(); refresh(); }
  }

  // ---------- 热点 ----------
  function renderHotspots() {
    const HS = getHotspots();
    // 每日自动化热点可能无 id，补一个稳定 id
    HS.forEach((h, i) => { if (h.id == null) h.id = "auto" + i; });
    const wrap = $("#hot-grid");
    wrap.innerHTML = HS.map(h => {
      const hid = "hot_" + h.id;
      const added = state.hotAdded && state.hotAdded.includes(hid);
      return '<div class="hot">' +
        '<div class="htop"><span class="ptag">' + esc(h.platform) + '</span><span class="heat ' + h.heat + '">' + h.heat + "热度</span></div>" +
        "<h4>" + esc(h.title) + "</h4>" +
        '<div class="row"><b>为什么火：</b>' + esc(h.why) + "</div>" +
        '<div class="row"><b>你的二创角度：</b>' + esc(h.angle) + "</div>" +
        '<div class="tip">🛡 ' + esc(h.tip) + "</div>" +
        '<button class="btn" data-hot="' + h.id + '" ' + (added ? "disabled style='opacity:.5'" : "") + ">" + (added ? "已加入灵感池" : "+ 加入灵感池") + "</button>" +
        "</div>";
    }).join("");
    wrap.querySelectorAll("[data-hot]").forEach(b => {
      b.onclick = () => {
        const h = HS.find(x => String(x.id) === String(b.dataset.hot));
        if (!h) return;
        state.ideas.unshift({
          id: uid(), title: h.angle.split("》——")[0].replace("《", "") || h.title,
          hook: "", cover: "", platform: ["xhs"], tag: "AI实操", stage: "pool", due: "", note: "来自热点：" + h.title
        });
        state.hotAdded = state.hotAdded || [];
        state.hotAdded.push("hot_" + h.id);
        save(); refresh();
        b.textContent = "已加入灵感池"; b.disabled = true; b.style.opacity = ".5";
      };
    });
  }

  // ---------- 对标博主 ----------
  function renderRivals() {
    const wrap = $("#rival-grid");
    wrap.innerHTML = S.rivals.map(r =>
      '<div class="rival">' +
      '<div class="rname">' + esc(r.name) + ' <span class="rtag">' + esc(r.tag) + "</span></div>" +
      '<div class="rrow"><b>为什么火：</b>' + esc(r.why) + "</div>" +
      '<div class="rrow"><b>钩子：</b>' + esc(r.hook) + "</div>" +
      '<div class="rrow"><b>你该学：</b>' + esc(r.learn) + "</div>" +
      '<div class="links"><a href="' + r.xhs + '" target="_blank" rel="noopener">小红书 ↗</a><a href="' + r.dy + '" target="_blank" rel="noopener">抖音 ↗</a></div>' +
      "</div>"
    ).join("");
  }

  // ---------- 复盘 ----------
  function renderReviewForm() {
    const sel = $("#rv-idea");
    const pub = state.ideas.filter(i => i.stage === "published" || i.stage === "review");
    sel.innerHTML = '<option value="">选择已发布视频…</option>' +
      pub.map(i => '<option value="' + i.id + '">' + esc(i.title) + "</option>").join("");
  }

  function renderReviews() {
    const wrap = $("#review-list");
    if (!state.reviews.length) {
      wrap.innerHTML = '<div class="empty-note">还没有复盘记录。发布视频后，在左侧填入数据自动诊断。</div>';
      return;
    }
    wrap.innerHTML = state.reviews.slice().reverse().map(r => {
      const it = state.ideas.find(i => i.id === r.ideaId);
      const diags = diagnose(r);
      return '<div class="rv">' +
        '<div class="rvtop"><b>' + esc(it ? it.title : r.ideaId) + '</b><span class="dt">' + r.date + "</span></div>" +
        (r.scriptSnap && r.scriptSnap.hook ? '<div class="rv-snap">当时钩子：' + esc(r.scriptSnap.hook) + (r.scriptSnap.cover ? " · 封面：" + esc(r.scriptSnap.cover) : "") + "</div>" : "") +
        '<div class="metrics">' +
        metric("播放", r.play) + metric("2秒留存", r.ret2 + "%") + metric("完播", r.finish + "%") +
        metric("赞", r.like) + metric("藏", r.save) + metric("评", r.comment) + metric("涨粉", "+" + r.follow) +
        "</div>" +
        '<div class="diag">' + diags.map(d => '<div class="d ' + (d.good ? "good" : "warn") + '"><b>' + (d.good ? "✓ " : "⚠ ") + esc(d.t) + "：</b>" + esc(d.a) + "</div>").join("") + "</div>" +
        "</div>";
    }).join("");

    // 留存对比图
    const chart = $("#ret-chart");
    chart.innerHTML = '<div class="section-sub" style="margin:14px 0 4px">各视频留存对比（2秒 / 完播）</div><div class="chart">' +
      state.reviews.map(r => {
        const it = state.ideas.find(i => i.id === r.ideaId);
        const nm = it ? it.title : r.ideaId;
        return '<div class="cr"><span class="cl">' + esc(nm.slice(0, 10)) + '</span>' +
          '<span class="ct"><i style="width:' + r.ret2 + '%"></i></span><span class="cv">' + r.ret2 + "%</span></div>" +
          '<div class="cr"><span class="cl" style="color:var(--ink-3)">└ 完播</span>' +
          '<span class="ct"><i style="width:' + r.finish + '%;background:var(--red)"></i></span><span class="cv">' + r.finish + "%</span></div>";
      }).join("") + "</div>";
  }

  function metric(l, v) { return '<div class="metric"><b>' + (v == null ? "-" : v) + "</b><span>" + l + "</span></div>"; }

  function diagnose(r) {
    const play = Number(r.play) || 1;
    const ret2 = Number(r.ret2) || 0;
    const finish = Number(r.finish) || 0;
    const likeRate = (Number(r.like) + Number(r.save)) / play;
    const followRate = (Number(r.follow) || 0) / play * 100;
    const out = [];
    if (ret2 < 40) out.push({ t: "前3秒钩子弱", a: "2秒留存仅 " + ret2 + "%，开头没留住人。下次把最强反差/结果放第1秒，钩子前置。" });
    else out.push({ t: "钩子合格", a: "2秒留存 " + ret2 + "%，开头稳。", good: true });
    if (finish < 15) out.push({ t: "完播率偏低", a: "完播 " + finish + "%，中段可能拖沓。砍掉铺垫、每15秒给一个信息点。" });
    else out.push({ t: "节奏不错", a: "完播 " + finish + "%，内容密度在线。", good: true });
    if (likeRate < 0.05) out.push({ t: "内容价值感不足", a: "赞藏率仅 " + (likeRate * 100).toFixed(1) + "%。加可收藏的「清单/模板」，提升保存欲。" });
    if (followRate < 0.5) out.push({ t: "关注钩子弱", a: "转粉率 " + followRate.toFixed(2) + "%。结尾加「关注看下期实测」+ 人设锚点。" });
    else out.push({ t: "人设吸粉", a: "转粉率 " + followRate.toFixed(2) + "%，关注欲强。", good: true });
    return out;
  }

  function submitReview(e) {
    e.preventDefault();
    const ideaId = $("#rv-idea").value;
    if (!ideaId) { alert("请选择已发布视频"); return; }
    const r = {
      ideaId, date: new Date().toISOString().slice(0, 10),
      play: $("#rv-play").value, ret2: $("#rv-ret2").value, finish: $("#rv-finish").value,
      like: $("#rv-like").value, save: $("#rv-save").value, comment: $("#rv-comment").value, follow: $("#rv-follow").value
    };
    const it = state.ideas.find(i => i.id === ideaId);
    r.scriptSnap = it ? { hook: it.hook || "", cover: it.cover || "", script: it.script || {} } : null;
    state.reviews.push(r);
    if (it && it.stage !== "review") it.stage = "review";
    save(); renderReviews(); renderStats(); renderFocus(); renderCadence(); renderBiz(); renderReviewForm();
    e.target.reset();
    $("#rv-script").className = "script-recall"; $("#rv-script").innerHTML = "";
  }

  // ---------- 弹窗（新建 / 编辑） ----------
  function openModal(id) {
    const m = $("#modal");
    const isEdit = !!id;
    const it = isEdit ? state.ideas.find(i => i.id === id) : null;
    $("#m-title").value = it ? it.title : "";
    $("#m-hook").value = it ? (it.hook || "") : "";
    const sc = it && it.script ? it.script : {};
    $("#m-pain").value = sc.pain || "";
    $("#m-steps").value = sc.steps || "";
    $("#m-end").value = sc.end || "";
    $("#m-cover").value = it ? (it.cover || "") : "";
    updateCompliance();
    $("#m-tag").value = it ? (it.tag || "AI实操") : "AI实操";
    $("#m-due").value = it ? (it.due || "") : "";
    $("#m-stage").value = it ? it.stage : "pool";
    const pfs = it ? (it.platform || ["xhs"]) : ["xhs"];
    document.querySelectorAll("#m-pf input").forEach(c => { c.checked = pfs.includes(c.value); });
    $("#m-del").style.display = isEdit ? "inline-block" : "none";
    m.dataset.id = id || "";
    m.classList.add("open");
    $("#m-title").focus();
  }
  function closeModal() { $("#modal").classList.remove("open"); }

  function saveModal() {
    const id = $("#modal").dataset.id;
    const pfs = Array.from(document.querySelectorAll("#m-pf input:checked")).map(c => c.value);
    const data = {
      title: $("#m-title").value.trim() || "未命名选题",
      hook: $("#m-hook").value.trim(),
      cover: $("#m-cover").value.trim(),
      tag: $("#m-tag").value.trim() || "AI",
      due: $("#m-due").value,
      stage: $("#m-stage").value,
      platform: pfs.length ? pfs : ["xhs"],
      script: {
        pain: $("#m-pain").value.trim(),
        steps: $("#m-steps").value.trim(),
        end: $("#m-end").value.trim()
      }
    };
    if (id) {
      const it = state.ideas.find(i => i.id === id);
      Object.assign(it, data);
    } else {
      state.ideas.unshift(Object.assign({ id: uid(), note: "" }, data));
    }
    save(); closeModal(); refresh();
  }
  function delModal() {
    const id = $("#modal").dataset.id;
    if (id && confirm("确认删除？")) {
      state.ideas = state.ideas.filter(i => i.id !== id);
      save(); closeModal(); refresh();
    }
  }

  // ---------- 工具 ----------
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  // 合规预检：检测海外AI/社交平台敏感词，给替换建议
  const SENS = [
    { w: "GPT", r: "海外某对话AI" }, { w: "ChatGPT", r: "海外某对话AI" },
    { w: "Claude", r: "C记AI / 海外某对话AI" }, { w: "Anthropic", r: "海外某AI公司" },
    { w: "OpenAI", r: "海外某AI公司" }, { w: "Twitter", r: "海外某社交平台" },
    { w: "推特", r: "海外某社交平台" }, { w: "Midjourney", r: "海外某绘图AI" },
    { w: "Perplexity", r: "海外某搜索AI" }, { w: "Grok", r: "海外某AI" },
    { w: "Poe", r: "海外某AI助手" }, { w: "Gemini", r: "海外某AI" }
  ];
  function checkCompliance(t) {
    if (!t || !t.trim()) return [];
    const hit = {};
    SENS.forEach(s => { if (t.indexOf(s.w) >= 0) hit[s.w] = s.r; });
    if (/\bX\b/.test(t)) hit["X"] = "海外某社交平台";
    let res = Object.keys(hit).map(w => ({ w: w, r: hit[w] }));
    res = res.filter(a => !res.some(b => b.w !== a.w && b.w.indexOf(a.w) >= 0));
    return res;
  }
  function updateCompliance() {
    const el = $("#m-comp"); if (!el) return;
    const t = [$("#m-hook").value, $("#m-pain").value, $("#m-steps").value, $("#m-end").value].join("\n");
    if (!t.trim()) { el.className = "compliance"; el.innerHTML = ""; return; }
    const hits = checkCompliance(t);
    if (!hits.length) { el.className = "compliance show ok"; el.innerHTML = "✓ 未检测到敏感海外词，可放心发"; return; }
    const list = hits.map(h => "「" + h.w + "」→ " + h.r).join("；");
    el.className = "compliance show warn";
    el.innerHTML = "⚠ 建议替换：" + list;
  }

  // ---------- 发布节奏（周频次） ----------
  function fmtDate(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function startOfWeek(d) {
    const x = new Date(d); x.setHours(0, 0, 0, 0);
    const day = (x.getDay() + 6) % 7; // 周一=0
    x.setDate(x.getDate() - day);
    return x;
  }
  function renderCadence() {
    const today = new Date();
    const ws = startOfWeek(today);
    const goal = 3;
    const thisWeek = state.reviews.filter(r => { const d = new Date(r.date); return d >= ws; }).length;
    $("#kpi-week").innerHTML = thisWeek + '<span class="sub-num"> / ' + goal + ' 条</span>';
    const days = ["一", "二", "三", "四", "五", "六", "日"];
    const todayStr = fmtDate(today);
    let bars = "";
    for (let i = 0; i < 7; i++) {
      const d = new Date(ws); d.setDate(d.getDate() + i);
      const cnt = state.reviews.filter(r => r.date === fmtDate(d)).length;
      const h = cnt ? Math.min(100, 18 + cnt * 30) : 4;
      const isToday = fmtDate(d) === todayStr;
      bars += '<span class="wb' + (isToday ? " today" : "") + '"><i style="height:' + h + '%"></i><b>' + days[i] + "</b></span>";
    }
    $("#week-bars").innerHTML = bars;
  }

  // ---------- 商单变现 ----------
  function renderBiz() {
    const fans = Number(state.profile.startFans) || 0;
    const goal = state.profile.goalFans;
    const pct = Math.min(100, Math.round(fans / goal * 100));
    $("#biz-fans-now").textContent = fans;
    $("#biz-prog-i").style.width = pct + "%";
    const pgyOk = fans >= 1000;
    $("#biz-pgy").innerHTML = pgyOk
      ? '✓ 已达蒲公英入驻门槛（≥1000），可开始接商单'
      : '距蒲公英入驻还差 <b>' + (1000 - fans) + "</b> 粉（门槛 1000）";

    const pub = state.reviews.length;
    const avgFinish = pub ? state.reviews.reduce((a, r) => a + (Number(r.finish) || 0), 0) / pub : 0;
    const checks = [
      { t: "粉丝 ≥ 1000（蒲公英门槛）", ok: fans >= 1000 },
      { t: "已发布 ≥ 10 篇作品", ok: pub >= 10 },
      { t: "平均完播率 ≥ 15%", ok: avgFinish >= 15 },
      { t: "人设清晰（陪跑 / 信息差）", ok: true },
      { t: "蒲公英已入驻", ok: fans >= 1000 && state.deals.length > 0 }
    ];
    $("#biz-ready").innerHTML = checks.map(c =>
      '<li class="' + (c.ok ? "ok" : "no") + '"><span class="mk">' + (c.ok ? "✓" : "○") + "</span>" + esc(c.t) + "</li>").join("");

    const top = state.reviews.map(r => {
      const it = state.ideas.find(i => i.id === r.ideaId);
      const fr = (Number(r.follow) || 0) / (Number(r.play) || 1) * 100;
      return { title: it ? it.title : r.ideaId, fr: fr, play: Number(r.play) || 0 };
    }).sort((a, b) => b.fr - a.fr).slice(0, 3);
    $("#biz-port").innerHTML = top.length
      ? top.map(p => '<div class="port"><div class="pt"><b>' + esc(p.title) + '</b></div><div class="pv">转粉 ' + p.fr.toFixed(2) + '% · 播放 ' + p.play.toLocaleString() + "</div></div>").join("")
      : '<div class="empty-note">发布并复盘后，自动捞出转粉率最高的作品集</div>';

    $("#biz-rate").innerHTML = '<tr><th>粉丝档</th><th>图文</th><th>视频</th></tr>' +
      S.bizRates.map(r => '<tr><td>' + esc(r.tier) + "</td><td>" + esc(r.post) + "</td><td>" + esc(r.video) + "</td></tr>").join("");

    renderDeals();
  }
  function renderDeals() {
    const wrap = $("#biz-deals");
    if (!state.deals.length) { wrap.innerHTML = '<div class="empty-note">暂无商单。达到门槛后在这里记录合作</div>'; return; }
    wrap.innerHTML = state.deals.map((d, i) =>
      '<div class="deal"><div class="dl"><b>' + esc(d.brand) + '</b><span>' + esc(d.amount) + " · " + esc(d.status) + '</span></div><button data-del-deal="' + i + '" title="删除">×</button></div>').join("");
    wrap.querySelectorAll("[data-del-deal]").forEach(b => {
      b.onclick = () => { state.deals.splice(Number(b.dataset.delDeal), 1); save(); renderBiz(); };
    });
  }

  // ---------- 闭环：复盘回显脚本 ----------
  function renderScriptRecall(id) {
    const el = $("#rv-script"); if (!el) return;
    if (!id) { el.className = "script-recall"; el.innerHTML = ""; return; }
    const it = state.ideas.find(i => i.id === id);
    if (!it) { el.className = "script-recall"; el.innerHTML = ""; return; }
    const sc = it.script || {};
    const rows = [];
    if (it.hook) rows.push(["钩子", it.hook]);
    if (sc.pain) rows.push(["痛点", sc.pain]);
    if (sc.steps) rows.push(["步骤", sc.steps]);
    if (sc.end) rows.push(["收尾", sc.end]);
    if (it.cover) rows.push(["封面", it.cover]);
    el.className = "script-recall show";
    el.innerHTML = '<div class="sr-h">📝 当时脚本回顾（对照数据找优化点）</div>' +
      (rows.length ? rows.map(r => '<div class="sr-row"><b>' + r[0] + "</b><span>" + esc(r[1]) + "</span></div>").join("")
        : '<div class="sr-row empty">该选题还没写脚本，先去补脚本再复盘</div>');
  }

  function refresh() {
    renderStats(); renderFocus(); renderBoard(); renderHotspots(); updateHotSrc(); renderRivals();
    renderReviewForm(); renderReviews(); renderCadence(); renderBiz();
  }

  // ---------- 云端同步 UI ----------
  function updateSyncUI() {
    const b = $("#btn-sync"); if (!b) return;
    const cfg = Sync.getCfg() || {};
    if (Sync.cloudEnabled()) {
      b.textContent = "☁ 已同步";
      b.classList.add("on");
      b.title = "云端同步：" + (cfg.type === "github" ? "GitHub Gist" : cfg.type === "supabase" ? "Supabase" : "自托管");
    } else {
      b.textContent = "☁ 本地";
      b.classList.remove("on");
      b.title = "云端同步设置";
    }
  }
  function updateSyncStatus(msg, ok) {
    const el = $("#sync-status");
    if (!el) return;
    el.textContent = "状态：" + msg;
    el.className = "sync-status " + (ok ? "ok" : "off");
  }
  function openSync() {
    const cfg = Sync.getCfg() || {};
    const isGh = !cfg.type || cfg.type === "github";
    $("#sync-token").value = isGh ? (cfg.token || "") : "";
    $("#sync-gist").value = (isGh && cfg.gistId) ? cfg.gistId : "";
    $("#gist-row").style.display = (isGh && cfg.gistId) ? "block" : "none";
    $("#sync-url").value = cfg.type === "supabase" ? (cfg.url || "") : "";
    $("#sync-key").value = cfg.type === "supabase" ? (cfg.key || "") : "";
    updateSyncStatus(Sync.cloudEnabled() ? "已连接云端" : "未连接（仅本地保存）", Sync.cloudEnabled());
    $("#sync-modal").classList.add("open");
  }
  function closeSync() { $("#sync-modal").classList.remove("open"); }
  function saveSync() {
    const token = $("#sync-token").value.trim();
    const url = $("#sync-url").value.trim();
    const key = $("#sync-key").value.trim();
    if (url && key) {   // 高级：Supabase 模式
      Sync.saveCfg({ type: "supabase", url: url, key: key });
      updateSyncStatus("已连接 Supabase，正在推送当前数据…", true);
      updateSyncUI();
      Sync.save(state);
      setTimeout(closeSync, 700);
      return;
    }
    if (!token) { alert("填一下 GitHub 令牌（或展开「高级」填 Supabase）"); return; }
    Sync.saveCfg({ type: "github", token: token, gistId: $("#sync-gist").value.trim() || undefined });
    updateSyncStatus("已连接，正在创建/查找 Gist 并推送…", true);
    updateSyncUI();
    Sync.save(state);             // 把现有数据推上云端（内部会自动创建/查找 Gist）
    Sync.getGistId().then(id => {
      if (id) { $("#sync-gist").value = id; $("#gist-row").style.display = "block"; }
    }).catch(e => console.warn(e));
    setTimeout(closeSync, 1000);
  }
  function pullCloud() {
    Sync.pull().then(d => {
      if (d) { state = d; updateSyncStatus("已从云端拉取最新数据", true); }
      else updateSyncStatus("拉取失败（检查网络 / 凭证）", false);
      // 顺带刷新云端热点
      Sync.loadHotspots().then(hs => { liveHotspots = hs; save(); refresh(); }).catch(() => { save(); refresh(); });
    });
  }
  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "xhs-workbench-backup.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function importJSON(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (d && d.ideas) { state = d; save(); refresh(); updateSyncStatus("已导入备份", true); }
        else alert("文件格式不对");
      } catch (e) { alert("文件解析失败"); }
    };
    r.readAsText(file);
  }

  // ---------- 事件绑定 ----------
  function bind() {
    document.querySelectorAll("nav button").forEach(b => {
      b.onclick = () => {
        document.querySelectorAll("nav button").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
        $("#view-" + b.dataset.view).classList.add("active");
      };
    });
    $("#btn-new").onclick = () => openModal();
    $("#m-save").onclick = saveModal;
    $("#m-cancel").onclick = closeModal;
    $("#m-del").onclick = delModal;
    $("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
    $("#rv-form").addEventListener("submit", submitReview);
    ["m-hook", "m-pain", "m-steps", "m-end"].forEach(id => { const e = $("#" + id); if (e) e.addEventListener("input", updateCompliance); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

    // 复盘：选视频时回显当时脚本（闭环）
    $("#rv-idea").addEventListener("change", e => renderScriptRecall(e.target.value));
    // 商单：更新粉丝数
    $("#biz-fans-save").onclick = () => {
      const v = Number($("#biz-fans-input").value);
      if (!isNaN(v) && v >= 0) { state.profile.startFans = v; save(); renderStats(); renderBiz(); }
    };
    // 商单：添加商单记录
    $("#biz-deal-add").onclick = () => {
      const brand = $("#biz-brand").value.trim();
      const amount = $("#biz-amount").value.trim();
      const status = $("#biz-status").value;
      if (!brand) { alert("填一下品牌名"); return; }
      state.deals.push({ brand, amount: amount || "—", status });
      save(); renderBiz();
      $("#biz-brand").value = ""; $("#biz-amount").value = "";
    };

    // ---------- 云端同步 ----------
    $("#btn-sync").onclick = openSync;
    $("#sync-cancel").onclick = closeSync;
    $("#sync-save").onclick = saveSync;
    $("#sync-pull").onclick = pullCloud;
    $("#sync-export").onclick = exportJSON;
    $("#sync-import-btn").onclick = () => $("#sync-import").click();
    $("#sync-import").onchange = e => { if (e.target.files[0]) importJSON(e.target.files[0]); };
    $("#sync-modal").addEventListener("click", e => { if (e.target.id === "sync-modal") closeSync(); });
  }

  // ---------- 启动（异步：先拉云端，再渲染） ----------
  async function bootstrap() {
    try {
      const res = await Sync.load();
      if (res.state && res.state.ideas) state = res.state;
    } catch (e) { console.warn("[Boot] load failed, use default", e); }
    // 云端热点（每日自动化写入），失败则回退本地快照
    try { liveHotspots = await Sync.loadHotspots(); } catch (e) { console.warn("[Boot] 热点加载失败：", e); }
    bind();
    refresh();
    updateSyncUI();
    try { Sync.save(state); } catch (e) { console.warn("[Boot] 初始推送失败（离线/未配置）：", e.message); }
  }
  bootstrap();
})();

// 工作台种子数据 —— 视频博主版
// 自动化任务每天会更新 hotspots；这里内置初始内容
window.SEED = {
  profile: {
    name: "宏的AI陪跑",
    platform: "小红书视频号",
    goalFans: 5000,      // 前期涨粉目标（开蒲公英门槛附近）
    startFans: 0
  },

  // 商单报价参考（AI / 科技赛道，仅供参考）
  bizRates: [
    { tier: "1k – 5k",  post: "300 – 800",   video: "800 – 2,000" },
    { tier: "5k – 10k", post: "800 – 2,000", video: "2,000 – 5,000" },
    { tier: "10k – 50k",post: "2,000 – 6,000",video: "5,000 – 15,000" },
    { tier: "50k+",     post: "6,000 – 20,000",video: "15,000 – 50,000" }
  ],

  // 今日可二创热点（每天 9 点自动刷新，这里为初始种子）
  hotspots: [
    {
      id: "h1",
      title: "小红书 RED Skill 上线：一句话让 AI 帮你做图 / 做 PPT",
      platform: "小红书",
      heat: "高",
      why: "WAIC 刚发布，平台级流量扶持，站内 AI 话题讨论量破 160 万",
      angle: "《海外博主早就在用的“一句话生成 PPT”玩法，现在小红书也能平替了》——把你在 X 上看到的 AI 做 PPT 工作流，翻译成 RED Skill 实操",
      tip: "提「RED Skill / 小红书」安全；别点名海外模型，说「海外博主」即可"
    },
    {
      id: "h2",
      title: "AI 做 PPT 教程爆了：保姆级拆解单篇 2.2 万赞 / 4 万藏",
      platform: "小红书",
      heat: "高",
      why: "打工人 / 学生刚需，收藏率极高，是涨粉黄金赛道",
      angle: "《我把海外最火的 AI PPT 工作流，拆成 3 步国内就能抄》——你的信息差价值在“玩法”，不是工具名",
      tip: "方法论具体化，工具名用「某 AI / 国产平替」模糊化"
    },
    {
      id: "h3",
      title: "提示词模板 / 咒语分享合集持续走热",
      platform: "抖音",
      heat: "中高",
      why: "小白最爱的“伸手党”内容，转发率高",
      angle: "《海外大佬私藏的 10 条提示词，我汉化后直接能用》——用你 X 上的收藏做选题",
      tip: "只发模板不提来源平台；「外网」一词也尽量换成「我整理」"
    },
    {
      id: "h4",
      title: "国产 AI 工具横向横评（借信息差：海外早这么玩）",
      platform: "小红书",
      heat: "中",
      why: "「测评」天然带信任感，适合立专业人设",
      angle: "《国外博主测评 AI 的思路，套到国产工具上，结论意想不到》",
      tip: "重点讲“测评维度 / 思路”，工具名一笔带过"
    },
    {
      id: "h5",
      title: "AI 小白第一条视频：从 0 到发出去的全过程记录",
      platform: "抖音",
      heat: "中",
      why: "「陪跑 / 真实记录」人设最吸粉，评论区互动爆炸",
      angle: "《和你一样的小白，用 AI 搞出了第一个作品》——你的人设锚点",
      tip: "真实感 > 精致感，别怕粗糙"
    }
  ],

  // 对标博主（站外无法直接内嵌，做成拆解卡 + 一键跳转）
  rivals: [
    {
      name: "歸藏",
      tag: "RED Skill 标杆",
      why: "一篇 PPT Skill 笔记 4700+ 人用过，场景填空式教学",
      hook: "「你离高效，只差装一个 Skill」",
      learn: "把复杂 AI 能力拆成「填空式」场景，小白秒懂；学他的产品化表达",
      xhs: "https://www.xiaohongshu.com/search_result?keyword=%E6%AD%B8%E8%97%8F",
      dy: "https://www.douyin.com/search/%E6%AD%B8%E8%97%8F"
    },
    {
      name: "栗氪聊AI",
      tag: "保姆级拆解王",
      why: "一篇教程 2.2 万赞 / 4 万收藏，抢首发 + 超详细步骤",
      hook: "「手把手教你，看完就能用」",
      learn: "学他的「步骤截图 + 红框标注」视频节奏；抢热点首发窗口",
      xhs: "https://www.xiaohongshu.com/search_result?keyword=%E6%A0%97%E6%B0%AA%E8%81%8AAI",
      dy: "https://www.douyin.com/search/%E6%A0%97%E6%B0%AA%E8%81%8AAI"
    },
    {
      name: "AI工具猎人",
      tag: "合集型打法",
      why: "周更「外网最火 AI 玩法国内平替版」，信息差定位清晰",
      hook: "「海外在疯传，国内还很少有人知道」",
      learn: "学他的「周更合集」栏目化；这正是你的海外信息差主战场",
      xhs: "https://www.xiaohongshu.com/search_result?keyword=AI%E5%B7%A5%E5%85%B7%E7%8C%8E%E4%BA%BA",
      dy: "https://www.douyin.com/search/AI%E5%B7%A5%E5%85%B7%E7%8C%8E%E4%BA%BA"
    }
  ],

  // 初始选题（视频卡片，带钩子 + 封面概念）
  seedIdeas: [
    {
      id: "i1",
      title: "我用一个 AI 把 3 小时 PPT 压到 3 分钟",
      hook: "「以前做 PPT 熬到凌晨，现在喝杯咖啡就搞定」",
      cover: "前后对比：熬夜黑眼圈 vs 咖啡+成品封面",
      platform: ["xhs", "dy"],
      tag: "AI实操",
      stage: "script",
      due: "2026-07-29",
      note: ""
    },
    {
      id: "i2",
      title: "海外博主私藏的 10 条提示词，我汉化后直接能用",
      hook: "「这 10 条，我愿称之为小白外挂」",
      cover: "手机截图铺满 10 条提示词 + 高亮一条",
      platform: ["xhs"],
      tag: "AI小白",
      stage: "pool",
      due: "2026-07-30",
      note: ""
    },
    {
      id: "i3",
      title: "和你一样的小白，用 AI 做出第一个作品（全程记录）",
      hook: "「别怕，我也是昨天才第一次用」",
      cover: "真实工位自拍 + 屏幕里半成品",
      platform: ["xhs", "dy"],
      tag: "陪跑",
      stage: "pool",
      due: "2026-07-31",
      note: ""
    }
  ]
};

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="#FF2442"/>
  <path d="M288 96 168 288h84l-20 128 132-208h-92z" fill="#fff"/>
</svg>

/* ============ 设计令牌：大厂软件级（Material/Fluent/HIG 融合） ============ */
:root{
  /* 冷中性灰底，靠 elevation 分层 —— 大厂后台标准做法 */
  --bg:#F4F5F7;
  --surface:#FFFFFF;
  --surface-2:#F7F8FA;
  --surface-3:#EEF0F3;

  --ink:#1B1B1F;
  --ink-2:#5C5F66;
  --ink-3:#9AA0A8;

  --line:#E4E6EA;
  --line-2:#EEF0F3;

  /* 品牌主色（小红书红，作克制 accent） */
  --primary:#FF2442;
  --primary-ink:#FFFFFF;
  --primary-soft:#FFF0F3;
  --primary-ring:rgba(255,36,66,.16);
  --primary-glow:rgba(255,36,66,.28);

  --green:#15A86B;
  --green-soft:#EAF7F1;
  --amber:#E08A1E;
  --amber-soft:#FDF3E5;
  --blue:#2D7BF6;
  --blue-soft:#EAF2FE;
  --violet:#7C5CF0;

  --radius-s:10px;
  --radius:14px;
  --radius-l:18px;
  --radius-xl:24px;

  /* 多层柔和阴影 = elevation 体系 */
  --e1:0 1px 2px rgba(16,16,22,.05),0 1px 3px rgba(16,16,22,.04);
  --e2:0 2px 4px rgba(16,16,22,.05),0 4px 12px rgba(16,16,22,.07);
  --e3:0 4px 10px rgba(16,16,22,.08),0 12px 32px rgba(16,16,22,.12);
  --e-press:0 1px 1px rgba(16,16,22,.05);

  --ease:cubic-bezier(.2,.8,.2,1);
  --font:"SF Pro Text",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",Helvetica,Arial,sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{
  font-family:var(--font);
  background:
    radial-gradient(1200px 600px at 80% -10%,rgba(255,36,66,.04),transparent 60%),
    radial-gradient(900px 500px at -10% 0%,rgba(45,123,246,.035),transparent 55%),
    var(--bg);
  background-attachment:fixed;
  color:var(--ink);
  font-size:14px;
  line-height:1.55;
  -webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
  letter-spacing:.1px;
}
button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
input,textarea,select{font-family:inherit;font-size:14px}
::selection{background:var(--primary-ring)}
::-webkit-scrollbar{height:9px;width:9px}
::-webkit-scrollbar-thumb{background:#D5D8DE;border-radius:8px;border:2px solid transparent;background-clip:content-box}
::-webkit-scrollbar-thumb:hover{background:#BFC3CB;background-clip:content-box}
::-webkit-scrollbar-track{background:transparent}

/* ============ Header ============ */
header{
  position:sticky;top:0;z-index:50;
  background:rgba(246,247,249,.74);
  backdrop-filter:saturate(180%) blur(22px);
  -webkit-backdrop-filter:saturate(180%) blur(22px);
  border-bottom:1px solid rgba(228,230,234,.9);
}
.bar{
  max-width:1280px;margin:0 auto;
  display:flex;align-items:center;gap:22px;
  padding:13px 24px;
}
.logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:16px;letter-spacing:.2px}
.logo .dot{
  width:11px;height:11px;border-radius:50%;background:var(--primary);
  box-shadow:0 0 0 4px var(--primary-ring),0 0 12px var(--primary-glow);
}
.logo small{font-weight:600;color:var(--ink-3);font-size:12px;letter-spacing:.4px}
nav{display:flex;gap:3px;margin-left:8px;background:rgba(238,240,243,.6);padding:3px;border-radius:12px}
nav button{
  padding:7px 15px;border-radius:9px;font-size:13.5px;color:var(--ink-2);font-weight:600;
  transition:all .18s var(--ease);
}
nav button:hover{color:var(--ink);background:rgba(255,255,255,.7)}
nav button.active{
  background:var(--primary);color:#fff;
  box-shadow:0 2px 8px var(--primary-glow);
}
.spacer{flex:1}
.stat-strip{display:flex;align-items:center;gap:6px}
.stat-strip .s{
  display:flex;flex-direction:column;line-height:1.1;padding:6px 13px;border-radius:11px;
  background:var(--surface);box-shadow:var(--e1);min-width:78px;
}
.stat-strip .s b{font-size:15px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.3px}
.stat-strip .s span{font-size:10px;color:var(--ink-3);letter-spacing:.2px;margin-top:1px}
.stat-strip .s b.red{color:var(--primary)}

/* ============ Layout ============ */
main{max-width:1280px;margin:0 auto;padding:26px 24px 80px}
.view{display:none;animation:viewIn .35s var(--ease)}
.view.active{display:block}
@keyframes viewIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

/* ============ Dashboard ============ */
.dash{display:grid;grid-template-columns:1.7fr 1fr 1fr;gap:16px;margin-bottom:24px}
.card{
  position:relative;background:var(--surface);border:1px solid var(--line);
  border-radius:var(--radius-l);box-shadow:var(--e1);overflow:hidden;
  transition:box-shadow .22s var(--ease),transform .22s var(--ease);
}
.card:hover{box-shadow:var(--e2);transform:translateY(-2px)}
.card::before{ /* 顶部微妙高光，玻璃质感 */
  content:"";position:absolute;inset:0 0 auto 0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.9),transparent);
}
.focus{padding:20px 22px}
.focus h3{font-size:11px;color:var(--ink-3);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:14px}
.focus ul{list-style:none;display:flex;flex-direction:column;gap:11px}
.focus li{display:flex;gap:11px;align-items:flex-start;font-size:13.5px;color:var(--ink);line-height:1.5}
.focus li .ic{
  flex:0 0 auto;width:20px;height:20px;border-radius:7px;background:var(--primary-soft);color:var(--primary);
  display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;margin-top:1px;
}
.focus li span{flex:1}
.focus .empty{color:var(--ink-3);font-size:13px}

.kpi{padding:18px 20px;display:flex;flex-direction:column;justify-content:center;gap:7px}
.kpi .lab{font-size:11px;color:var(--ink-3);letter-spacing:.5px;font-weight:600}
.kpi .num{font-size:32px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-1px;line-height:1}
.kpi .sub{font-size:11.5px;color:var(--ink-2);line-height:1.45}
.kpi .bar{height:7px;border-radius:7px;background:var(--surface-3);overflow:hidden;margin-top:3px;box-shadow:inset 0 1px 2px rgba(0,0,0,.04)}
.kpi .bar i{
  display:block;height:100%;border-radius:7px;
  background:linear-gradient(90deg,var(--primary),#FF5C75);
  box-shadow:0 0 10px var(--primary-glow);transition:width .6s var(--ease);
}

/* ============ Kanban ============ */
.board-head{display:flex;align-items:center;justify-content:space-between;margin:4px 0 16px}
.board-head h2{font-size:17px;font-weight:800;letter-spacing:-.3px}
.board-head .hint{font-size:12px;color:var(--ink-3);margin-left:4px}
.btn{
  background:var(--primary);color:var(--primary-ink);padding:9px 16px;border-radius:var(--radius-s);
  font-size:13px;font-weight:700;letter-spacing:.2px;
  box-shadow:var(--e2),0 2px 10px var(--primary-glow);
  transition:transform .14s var(--ease),box-shadow .2s var(--ease),filter .2s;
}
.btn:hover{transform:translateY(-1px);box-shadow:var(--e3),0 4px 16px var(--primary-glow);filter:brightness(1.03)}
.btn:active{transform:translateY(0) scale(.97);box-shadow:var(--e-press)}
.btn.ghost{background:var(--surface);color:var(--ink);border:1px solid var(--line);box-shadow:var(--e1)}
.btn.ghost:hover{background:var(--surface-2);transform:translateY(-1px);box-shadow:var(--e2)}

.board{display:flex;gap:14px;overflow-x:auto;padding-bottom:16px}
.col{
  flex:0 0 274px;background:linear-gradient(180deg,var(--surface-2),#F1F3F6);
  border:1px solid var(--line);border-radius:var(--radius-l);padding:12px;
  display:flex;flex-direction:column;gap:10px;min-height:220px;transition:box-shadow .2s,border-color .2s;
}
.col.drag-over{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-ring),var(--e2)}
.col-head{display:flex;align-items:center;justify-content:space-between;padding:4px 6px 10px;border-bottom:1px solid var(--line-2);margin-bottom:2px}
.col-head .name{font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px;color:var(--ink)}
.col-head .stage-ic{display:flex;color:var(--ink-2)}
.col-head .count{
  font-size:11px;font-weight:700;color:var(--ink-2);background:var(--surface);
  border:1px solid var(--line);border-radius:20px;padding:1px 9px;min-width:22px;text-align:center;
}
.dotstage{width:9px;height:9px;border-radius:50%;box-shadow:0 0 0 3px rgba(0,0,0,.04)}

.ticket{
  background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);
  padding:13px 14px;cursor:grab;box-shadow:var(--e1);
  transition:transform .16s var(--ease),box-shadow .2s var(--ease),border-color .2s;
  animation:rise .42s var(--ease) both;
}
@keyframes rise{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}
.ticket:hover{box-shadow:var(--e2);transform:translateY(-2px);border-color:#DDE0E5}
.ticket.dragging{opacity:.5;transform:scale(.97) rotate(-1deg);box-shadow:var(--e3);cursor:grabbing}
.ticket .tt{font-size:13.5px;font-weight:700;line-height:1.42;margin-bottom:8px;letter-spacing:-.1px}
.ticket .hook{
  font-size:11.5px;color:var(--ink-2);background:var(--primary-soft);
  border-radius:9px;padding:6px 9px;margin-bottom:8px;line-height:1.5;font-weight:500;
}
.ticket .meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.chip{font-size:10.5px;padding:2px 9px;border-radius:20px;background:var(--surface-3);color:var(--ink-2);font-weight:600}
.chip.tag{background:var(--blue-soft);color:var(--blue)}
.pf{font-size:10px;font-weight:700;padding:2px 7px;border-radius:7px}
.pf.xhs{background:var(--primary-soft);color:var(--primary)}
.pf.dy{background:var(--blue-soft);color:var(--blue)}
.ticket .due{font-size:10.5px;color:var(--ink-3);margin-left:auto;font-variant-numeric:tabular-nums}
.ticket .acts{display:flex;gap:10px;margin-top:9px;padding-top:9px;border-top:1px solid var(--line-2)}
.ticket .acts button{font-size:11px;color:var(--ink-3);font-weight:600;transition:color .15s}
.ticket .acts button:hover{color:var(--primary)}

/* ============ Generic sections ============ */
.section-title{font-size:18px;font-weight:800;letter-spacing:-.4px;margin:2px 0 6px}
.hot-src{font-size:12px;font-weight:600;letter-spacing:0;vertical-align:middle;margin-left:10px;padding:2px 9px;border-radius:999px;position:relative;top:-2px}
.hot-src.live{color:#1FA971;background:rgba(31,169,113,.12)}
.hot-src.local{color:#9aa0a6;background:rgba(154,160,166,.12)}
.section-sub{font-size:13px;color:var(--ink-3);margin-bottom:18px;line-height:1.6;max-width:720px}
.grid{display:grid;gap:16px}
.hot-grid{grid-template-columns:repeat(auto-fill,minmax(330px,1fr))}
.hot{
  background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-l);
  padding:18px 20px;box-shadow:var(--e1);display:flex;flex-direction:column;gap:10px;
  transition:transform .18s var(--ease),box-shadow .22s var(--ease);
}
.hot:hover{transform:translateY(-3px);box-shadow:var(--e2)}
.hot .htop{display:flex;align-items:center;justify-content:space-between;gap:8px}
.hot .ptag{font-size:11px;font-weight:700;color:var(--ink-2);letter-spacing:.3px}
.heat{font-size:10.5px;font-weight:800;padding:3px 9px;border-radius:20px;letter-spacing:.3px}
.heat.高{background:var(--primary);color:#fff;box-shadow:0 2px 8px var(--primary-glow)}
.heat.中高{background:var(--amber-soft);color:var(--amber)}
.heat.中{background:var(--surface-3);color:var(--ink-2)}
.hot h4{font-size:14.5px;font-weight:800;line-height:1.45;letter-spacing:-.2px}
.hot .row{font-size:12.5px;color:var(--ink-2);line-height:1.6}
.hot .row b{color:var(--ink);font-weight:700}
.hot .tip{font-size:12px;background:var(--green-soft);border-left:3px solid var(--green);border-radius:0 10px 10px 0;padding:8px 11px;color:#1E7A53;line-height:1.55;font-weight:500}
.hot .btn{margin-top:2px;align-self:flex-start}

.rival-grid{grid-template-columns:repeat(auto-fill,minmax(310px,1fr))}
.rival{
  background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-l);
  padding:18px 20px;box-shadow:var(--e1);display:flex;flex-direction:column;gap:9px;
  transition:transform .18s var(--ease),box-shadow .22s var(--ease);
}
.rival:hover{transform:translateY(-3px);box-shadow:var(--e2)}
.rival .rname{font-size:15.5px;font-weight:800;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.rival .rtag{font-size:11px;color:var(--primary);font-weight:700;background:var(--primary-soft);padding:2px 8px;border-radius:20px}
.rival .rrow{font-size:12.5px;color:var(--ink-2);line-height:1.6}
.rival .rrow b{color:var(--ink);font-weight:700}
.rival .links{display:flex;gap:9px;margin-top:5px}
.rival .links a{
  font-size:12px;font-weight:700;color:var(--ink);text-decoration:none;
  border:1px solid var(--line);border-radius:9px;padding:6px 13px;transition:all .16s var(--ease);
}
.rival .links a:hover{background:var(--surface-2);border-color:#D5D8DE;transform:translateY(-1px);box-shadow:var(--e1)}

/* ============ Review ============ */
.review-wrap{display:grid;grid-template-columns:370px 1fr;gap:20px;align-items:start}
.form{
  background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-l);
  padding:20px;box-shadow:var(--e1);display:flex;flex-direction:column;gap:13px;position:sticky;top:84px;
}
.form label{font-size:12px;color:var(--ink-2);font-weight:700;display:flex;flex-direction:column;gap:6px}
.form input,.form select,.form textarea{
  border:1px solid var(--line);border-radius:var(--radius-s);padding:10px 12px;
  background:var(--surface-2);color:var(--ink);width:100%;font-size:14px;
  transition:border-color .16s var(--ease),box-shadow .16s var(--ease),background .16s;
}
.form input:hover,.form select:hover,.form textarea:hover{background:#fff;border-color:#D5D8DE}
.form input:focus,.form select:focus,.form textarea:focus{outline:none;border-color:var(--primary);background:#fff;box-shadow:0 0 0 4px var(--primary-ring)}
.form textarea{resize:vertical;min-height:64px}
.review-list{display:flex;flex-direction:column;gap:14px}
.rv{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-l);padding:16px 18px;box-shadow:var(--e1);animation:rise .4s var(--ease) both}
.rv .rvtop{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.rv .rvtop b{font-size:14.5px;font-weight:800;letter-spacing:-.2px}
.rv .rvtop .dt{font-size:11px;color:var(--ink-3);font-variant-numeric:tabular-nums}
.metrics{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:13px;padding:12px 14px;background:var(--surface-2);border-radius:var(--radius-s)}
.metric{display:flex;flex-direction:column;gap:1px}
.metric b{font-size:18px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.4px}
.metric span{font-size:10px;color:var(--ink-3);letter-spacing:.2px}
.diag{display:flex;flex-direction:column;gap:8px}
.diag .d{font-size:12.5px;border-radius:var(--radius-s);padding:9px 12px;line-height:1.55;font-weight:500}
.diag .d.warn{background:var(--primary-soft);color:#9E1226}
.diag .d.good{background:var(--green-soft);color:#1E7A53}
.diag .d b{font-weight:800}
.empty-note{color:var(--ink-3);font-size:13px;text-align:center;padding:36px 0;background:var(--surface);border:1px dashed var(--line);border-radius:var(--radius-l)}

.chart{display:flex;flex-direction:column;gap:10px;margin-top:6px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-l);padding:16px 18px;box-shadow:var(--e1)}
.chart .cr{display:flex;align-items:center;gap:11px;font-size:12px}
.chart .cr .cl{width:130px;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}
.chart .cr .ct{flex:1;height:9px;background:var(--surface-3);border-radius:7px;overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,.04)}
.chart .cr .ct i{display:block;height:100%;background:linear-gradient(90deg,#3A3A42,#62626C);border-radius:7px;transition:width .6s var(--ease)}
.chart .cr .cv{width:44px;text-align:right;font-variant-numeric:tabular-nums;font-weight:800;letter-spacing:-.3px}

/* ============ Modal ============ */
.modal-bg{position:fixed;inset:0;background:rgba(20,20,26,.4);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:100;display:none;align-items:center;justify-content:center;padding:20px}
.modal-bg.open{display:flex}
.modal{
  background:var(--surface);border-radius:var(--radius-xl);width:100%;max-width:490px;max-height:90vh;overflow:auto;
  padding:24px;box-shadow:0 24px 70px rgba(0,0,0,.32);border:1px solid rgba(255,255,255,.6);
}
.modal-bg.open .modal{animation:pop .3s var(--ease)}
@keyframes pop{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
.modal h3{font-size:18px;font-weight:800;letter-spacing:-.3px;margin-bottom:18px}
.fld{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
.fld label{font-size:12px;color:var(--ink-2);font-weight:700}
.fld input,.fld textarea,.fld select{
  border:1px solid var(--line);border-radius:var(--radius-s);padding:10px 12px;
  background:var(--surface-2);color:var(--ink);width:100%;font-size:14px;transition:border-color .16s,box-shadow .16s,background .16s;
}
.fld input:hover,.fld textarea:hover,.fld select:hover{background:#fff;border-color:#D5D8DE}
.fld input:focus,.fld textarea:focus,.fld select:focus{outline:none;border-color:var(--primary);background:#fff;box-shadow:0 0 0 4px var(--primary-ring)}
.fld textarea{resize:vertical;min-height:56px}
.pf-pick{display:flex;gap:9px}
.pf-pick label{
  display:flex;align-items:center;gap:7px;font-weight:600;font-size:13px;color:var(--ink);
  border:1px solid var(--line);border-radius:var(--radius-s);padding:9px 13px;cursor:pointer;background:var(--surface-2);
  transition:all .16s var(--ease);
}
.pf-pick label:hover{background:#fff;border-color:#D5D8DE}
.pf-pick input{width:auto;accent-color:var(--primary)}
.pf-pick label:has(input:checked){border-color:var(--primary);background:var(--primary-soft);color:var(--primary)}
.modal-acts{display:flex;justify-content:space-between;gap:10px;margin-top:10px}
.modal-acts .right{display:flex;gap:9px;margin-left:auto}

/* 结构化脚本块 + 合规预检 */
.script-block{background:var(--surface-2);border:1px solid var(--line);border-radius:var(--radius);padding:14px 15px;margin:4px 0;display:flex;flex-direction:column;gap:12px}
.sb-head{display:flex;align-items:baseline;gap:8px}
.sb-head b{font-size:13px;font-weight:800;letter-spacing:.2px}
.sb-sub{font-size:11px;color:var(--ink-3)}
.script-block textarea{min-height:60px}
.compliance{font-size:12px;border-radius:var(--radius-s);padding:0;line-height:1.55;font-weight:500;margin-top:2px;display:none}
.compliance.show{padding:9px 11px;display:block}
.compliance.ok{background:var(--green-soft);color:#1E7A53}
.compliance.warn{background:var(--primary-soft);color:#9E1226}

/* ============ 节奏迷你柱状图 ============ */
.week-bars{display:flex;align-items:flex-end;gap:7px;height:46px;margin:11px 0 6px;padding:0 2px}
.week-bars .wb{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;height:100%;justify-content:flex-end}
.week-bars .wb i{width:100%;max-width:14px;border-radius:5px 5px 3px 3px;background:var(--surface-3);transition:height .5s var(--ease),background .25s var(--ease)}
.week-bars .wb.today i{background:linear-gradient(180deg,var(--primary),#FF5C75);box-shadow:0 0 10px var(--primary-glow)}
.week-bars .wb b{font-size:9.5px;color:var(--ink-3);font-weight:700}
.week-bars .wb.today b{color:var(--primary)}
.sub-num{font-size:14px;color:var(--ink-3);font-weight:600;letter-spacing:0}

/* ============ 复盘脚本回显（闭环） ============ */
.script-recall{display:none;border:1px dashed var(--line);border-radius:var(--radius-s);background:var(--surface-2);padding:12px 13px;margin-bottom:13px}
.script-recall.show{display:block;animation:rise .35s var(--ease) both}
.script-recall .sr-h{font-size:11px;font-weight:800;color:var(--primary);letter-spacing:.4px;margin-bottom:9px}
.sr-row{display:flex;gap:9px;font-size:12px;margin-bottom:6px;line-height:1.5}
.sr-row b{flex:0 0 auto;width:34px;color:var(--ink-2);font-weight:700}
.sr-row span{flex:1;color:var(--ink)}
.sr-row.empty{color:var(--ink-3)}
.rv-snap{font-size:11.5px;color:var(--ink-2);background:var(--primary-soft);border-radius:9px;padding:6px 10px;margin-bottom:11px;line-height:1.5}
.rv-snap b{color:var(--primary)}

/* ============ 商单模块 ============ */
.biz-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.biz-card{padding:20px 22px}
.biz-card.biz-deals{grid-column:1 / -1}
.biz-h{font-size:13px;font-weight:800;letter-spacing:.3px;margin-bottom:15px;display:flex;align-items:baseline;gap:7px}
.biz-h small{font-size:10.5px;color:var(--ink-3);font-weight:600}
.fans-row{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px}
.fans-now{display:flex;flex-direction:column}
.fans-now b{font-size:30px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-1px;line-height:1}
.fans-now span{font-size:11px;color:var(--ink-3);margin-top:2px}
.fans-edit{display:flex;gap:8px}
.fans-edit input{width:108px;border:1px solid var(--line);border-radius:var(--radius-s);padding:8px 10px;background:var(--surface-2);font-size:13px;transition:border-color .16s,box-shadow .16s,background .16s}
.fans-edit input:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 4px var(--primary-ring);background:#fff}
.fans-edit .btn.ghost{padding:8px 12px;font-size:12px}
.prog{height:9px;border-radius:9px;background:var(--surface-3);overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,.04)}
.prog i{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,var(--primary),#FF5C75);box-shadow:0 0 10px var(--primary-glow);transition:width .6s var(--ease)}
.biz-sub{font-size:11.5px;color:var(--ink-2);margin-top:10px;line-height:1.5}
.biz-sub b{color:var(--primary);font-weight:800}

.ready{list-style:none;display:flex;flex-direction:column;gap:11px}
.ready li{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--ink-2)}
.ready li .mk{flex:0 0 auto;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800}
.ready li.ok{color:var(--ink)}
.ready li.ok .mk{background:var(--green-soft);color:var(--green)}
.ready li.no .mk{background:var(--surface-3);color:var(--ink-3)}

.biz-port{display:flex;flex-direction:column;gap:10px}
.port{background:var(--surface-2);border:1px solid var(--line);border-radius:var(--radius-s);padding:11px 13px}
.port .pt b{font-size:13px;font-weight:700;display:block;margin-bottom:3px;line-height:1.4}
.port .pv{font-size:11.5px;color:var(--ink-2);font-variant-numeric:tabular-nums}

table.rate{width:100%;border-collapse:collapse;font-size:12.5px}
table.rate th{text-align:left;font-size:10.5px;color:var(--ink-3);font-weight:700;letter-spacing:.3px;padding:0 8px 9px;border-bottom:1px solid var(--line)}
table.rate td{padding:9px 8px;border-bottom:1px solid var(--line-2);font-variant-numeric:tabular-nums;color:var(--ink)}
table.rate tr:last-child td{border-bottom:none}
.biz-note{font-size:10.5px;color:var(--ink-3);margin-top:11px}

.deal-form{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:13px}
.deal-form input,.deal-form select{border:1px solid var(--line);border-radius:var(--radius-s);padding:9px 11px;background:var(--surface-2);font-size:13px;flex:1;min-width:90px;transition:border-color .16s,box-shadow .16s,background .16s}
.deal-form input:focus,.deal-form select:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 4px var(--primary-ring);background:#fff}
.deal-form .btn{padding:9px 16px;font-size:13px}
.deal{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--surface-2);border:1px solid var(--line);border-radius:var(--radius-s);padding:10px 13px;margin-bottom:9px}
.deal .dl{display:flex;flex-direction:column;gap:2px}
.deal .dl b{font-size:13px;font-weight:700}
.deal .dl span{font-size:11.5px;color:var(--ink-2)}
.deal button{flex:0 0 auto;width:26px;height:26px;border-radius:8px;background:var(--surface);border:1px solid var(--line);color:var(--ink-3);font-size:15px;line-height:1;transition:all .16s var(--ease)}
.deal button:hover{background:var(--primary-soft);color:var(--primary);border-color:#FFD2DA}

/* header 蒲公英状态色 */
.stat-strip .s b.green{color:var(--green)}
.stat-strip .s b.red{color:var(--primary)}

@media(max-width:880px){
  .dash{grid-template-columns:1fr 1fr}
  .review-wrap{grid-template-columns:1fr}
  .form{position:static}
  .stat-strip{display:none}
  .biz-grid{grid-template-columns:1fr}
  .fans-row{flex-direction:column;align-items:flex-start;gap:10px}
}

/* ============ 云端同步 ============ */
.sync-btn{
  display:flex;align-items:center;gap:7px;flex:0 0 auto;
  padding:8px 13px;border-radius:11px;font-size:13px;font-weight:700;
  background:var(--surface);box-shadow:var(--e1);color:var(--ink-2);
  border:1px solid var(--line);transition:all .18s var(--ease);white-space:nowrap;
}
.sync-btn:hover{transform:translateY(-1px);box-shadow:var(--e2);color:var(--ink)}
.sync-btn.on{color:var(--green);border-color:#CDEBDD;background:var(--green-soft)}
.sync-btn::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--ink-3);transition:background .2s}
.sync-btn.on::before{background:var(--green);box-shadow:0 0 0 3px rgba(21,168,107,.18)}

.modal.sync-modal{max-width:520px}
.sync-tip{font-size:12.5px;color:var(--ink-2);line-height:1.6;background:var(--blue-soft);border-radius:var(--radius-s);padding:11px 13px;margin-bottom:16px}
.sync-status{font-size:12px;font-weight:700;padding:9px 12px;border-radius:var(--radius-s);margin-bottom:14px}
.sync-status.ok{background:var(--green-soft);color:#1E7A53}
.sync-status.off{background:var(--surface-3);color:var(--ink-2)}
.modal-acts .left{display:flex;gap:8px}
.modal-acts .left .btn.ghost{padding:9px 13px;font-size:12.5px}

@media(max-width:880px){
  .sync-btn{padding:7px 10px;font-size:12px}
}

/*
 * sync.js — 同步层（真·永久方案）
 * 三种后端，按 cfg.type 切换：
 *  - github  (默认): GitHub Gist。永久免费、不依赖本机开机，电脑/iPhone/iPad 三端同步。只需一个带 gist 权限的 PAT。
 *  - supabase: 可选，适合不想用 GitHub 的用户。
 *  - self    : 自托管后端（WorkBuddy 隧道），兼容旧配置。
 * 单用户工作台：固定 ROW_ID。读取云端优先，失败/未配置回退 localStorage。
 * 凭证（PAT / Supabase key）只存本机浏览器，不发给任何第三方。
 */
window.Sync = (function () {
  const LS_KEY = "xhs_video_workbench_v3";
  const CFG_KEY = "xhs_sync_cfg";
  const ROW_ID = "macro-xhs-single";
  const GIST_DESC = "xhs-workbench-state (do not delete)";
  const GIST_FILE = "state.json";
  const HOT_FILE = "hotspots.json";   // 每日热点单独存一个文件，避免覆盖用户数据
  const API = "https://api.github.com";

  function loadCfg() { try { return JSON.parse(localStorage.getItem(CFG_KEY) || "null"); } catch (e) { return null; } }
  function saveCfg(c) { cfg = c || {}; try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} }
  function getCfg() { return cfg; }
  function cloudEnabled() {
    if (!cfg || !cfg.type || cfg.type === "github") return !!(cfg && cfg.token);
    return !!(cfg.url);
  }

  let cfg = loadCfg() || { type: "github" };

  async function api(method, url, body, token) {
    const headers = { "Content-Type": "application/json", "Accept": "application/vnd.github+json" };
    if (token) headers["Authorization"] = "Bearer " + token;
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) {
      let detail = "";
      try { detail = (await res.json()).message || ""; } catch (e) {}
      throw new Error("HTTP " + res.status + (detail ? " " + detail : ""));
    }
    if (res.status === 204) return {};
    return res.json();
  }

  // 找到（或创建）工作台专属 Gist，返回其 id
  async function ensureGist() {
    if (cfg.gistId) return cfg.gistId;
    // 已存在则按描述自动查找，其它设备无需手动抄 ID
    try {
      const list = await api("GET", API + "/gists?per_page=100", null, cfg.token);
      const found = (list || []).find(g => g.description === GIST_DESC);
      if (found) { cfg.gistId = found.id; saveCfg(cfg); return cfg.gistId; }
    } catch (e) { /* 忽略，走下面的创建 */ }
    const created = await api("POST", API + "/gists",
      { description: GIST_DESC, public: false, files: { [GIST_FILE]: { content: JSON.stringify({ data: null, updated_at: new Date().toISOString() }) } } },
      cfg.token);
    cfg.gistId = created.id; saveCfg(cfg);
    return cfg.gistId;
  }

  async function load() {
    if (cloudEnabled()) {
      try {
        if (cfg.type === "supabase") {
          if (!/supabase\.co$/i.test(cfg.url)) throw new Error("非 supabase 地址");
          const client = await ensureSupabase();
          if (client) {
            const { data, error } = await client.from("workbench_state").select("data").eq("id", ROW_ID).maybeSingle();
            if (!error && data && data.data) return { state: data.data, src: "cloud" };
          }
        } else if (cfg.type === "github") {
          const id = await ensureGist();
          const g = await api("GET", API + "/gists/" + id, null, cfg.token);
          const c = g.files && g.files[GIST_FILE] && g.files[GIST_FILE].content;
          if (c) { const p = JSON.parse(c); if (p.data) return { state: p.data, src: "cloud" }; }
        } else if (cfg.url) {
          const r = await fetch(cfg.url.replace(/\/$/, "") + "/sync?k=" + encodeURIComponent(ROW_ID));
          if (r.ok) { const j = await r.json(); if (j.data) return { state: j.data, src: "cloud" }; }
        }
      } catch (e) { console.warn("[Sync] 云端读取失败，回退本地：", e.message); }
    }
    let st = null;
    try { st = localStorage.getItem(LS_KEY) ? JSON.parse(localStorage.getItem(LS_KEY)) : null; } catch (e) {}
    return { state: st, src: "local" };
  }

  function save(state) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
    if (!cloudEnabled()) return;
    if (cfg.type === "supabase") {
      ensureSupabase().then(client => {
        if (!client) return;
        client.from("workbench_state").upsert({ id: ROW_ID, data: state, updated_at: new Date().toISOString() }, { onConflict: "id" })
          .then(({ error }) => { if (error) console.warn("[Sync] 云端推送失败：", error.message); });
      }).catch(e => console.warn("[Sync] 推送异常：", e));
    } else if (cfg.type === "github") {
      ensureGist().then(id => api("PATCH", API + "/gists/" + id,
        { files: { [GIST_FILE]: { content: JSON.stringify({ data: state, updated_at: new Date().toISOString() }) } } }, cfg.token))
        .catch(e => console.warn("[Sync] Gist 推送失败：", e.message));
    } else if (cfg.url) {
      fetch(cfg.url.replace(/\/$/, "") + "/sync?k=" + encodeURIComponent(ROW_ID),
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state) })
        .catch(e => console.warn("[Sync] 推送失败：", e));
    }
  }

  async function pull() {
    if (!cloudEnabled()) return null;
    try {
      if (cfg.type === "supabase") {
        const client = await ensureSupabase();
        if (client) {
          const { data, error } = await client.from("workbench_state").select("data").eq("id", ROW_ID).maybeSingle();
          if (!error && data && data.data) { try { localStorage.setItem(LS_KEY, JSON.stringify(data.data)); } catch (e) {} return data.data; }
        }
      } else if (cfg.type === "github") {
        const id = await ensureGist();
        const g = await api("GET", API + "/gists/" + id, null, cfg.token);
        const c = g.files && g.files[GIST_FILE] && g.files[GIST_FILE].content;
        if (c) { const p = JSON.parse(c); if (p.data) { try { localStorage.setItem(LS_KEY, JSON.stringify(p.data)); } catch (e) {} return p.data; } }
      } else if (cfg.url) {
        const r = await fetch(cfg.url.replace(/\/$/, "") + "/sync?k=" + encodeURIComponent(ROW_ID));
        if (r.ok) { const j = await r.json(); if (j.data) { try { localStorage.setItem(LS_KEY, JSON.stringify(j.data)); } catch (e) {} return j.data; } }
      }
    } catch (e) { console.warn("[Sync] 拉取失败：", e.message); }
    return null;
  }

  let sb = null;
  async function ensureSupabase() {
    if (sb) return sb;
    try {
      if (!window.supabase || !window.supabase.createClient) {
        const m = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
        window.supabase = { createClient: m.createClient };
      }
      sb = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: false, autoRefreshToken: false } });
      return sb;
    } catch (e) { console.warn("[Sync] supabase 加载失败：", e); return null; }
  }

  // 给 UI 用：返回当前已确保的 Gist id（其它设备可据此确认同一份数据）
  async function getGistId() {
    if (!cloudEnabled() || cfg.type !== "github") return null;
    return ensureGist();
  }

  // 读取每日热点（独立文件，不干扰用户数据）。无 token / 离线时返回 null，由调用方回退本地快照。
  async function loadHotspots() {
    if (!cloudEnabled() || cfg.type !== "github" || !cfg.token) return null;
    try {
      const id = await ensureGist();
      const g = await api("GET", API + "/gists/" + id, null, cfg.token);
      const c = g.files && g.files[HOT_FILE] && g.files[HOT_FILE].content;
      if (c) { const arr = JSON.parse(c); if (Array.isArray(arr)) return arr; }
    } catch (e) { console.warn("[Sync] 热点读取失败，回退本地：", e.message); }
    return null;
  }

  // 写入每日热点（只更新 hotspots.json 一个文件，不动 state.json）
  async function saveHotspots(arr) {
    if (!cloudEnabled() || cfg.type !== "github" || !cfg.token) return false;
    try {
      const id = await ensureGist();
      await api("PATCH", API + "/gists/" + id,
        { files: { [HOT_FILE]: { content: JSON.stringify(arr, null, 2) } } }, cfg.token);
      return true;
    } catch (e) { console.warn("[Sync] 热点写入失败：", e.message); return false; }
  }

  return { getCfg, saveCfg, cloudEnabled, load, save, pull, getGistId, loadHotspots, saveHotspots, GIST_DESC };
})();

// 每日热点数据 — 由 WorkBuddy 每日自动更新
// 格式: window.HOTSPOT_DATA = { updated: "YYYY-MM-DD", days: [{date, items:[{title, platform, heat, why, angle, tip}]}] }
window.HOTSPOT_DATA = {
  updated: "2026-07-28",
  days: [
    {
      date: "2026-07-28",
      items: [
        {
          title: "小红书 RED Skill 内测爆火：一个月冒出 7300+ 原创 AI 作品",
          platform: "小红书",
          heat: "高",
          why: "WAIC 刚结束，小红书官方力推 RED Skill + Vibe Coding，AI 内容有平台级流量扶持，站内 AI 开发者已超 16 万，讨论量破 160 万",
          angle: "「AI 小白也能玩 RED Skill？我用 10 分钟做了个 XX」——蹭官方流量池，用小白视角实测，别人讲功能你讲踩坑",
          tip: "官方产品可以直接点名，放心提。这是目前最安全又有扶持的选题线"
        },
        {
          title: "AI 生图接管生活任务：美甲预览 / Q版头像 / 房间爆改 / 手抄报",
          platform: "小红书",
          heat: "高",
          why: "爆款逻辑已从「工具介绍」变成「场景填空」：先抛生活麻烦，再用 AI 解决。标题不解释模型，只讲任务",
          angle: "用你熟悉的海外模型出图效果吊打，做「同一个需求，我试了 5 种 AI」横评，结论给国内可用的替代方案",
          tip: "海外模型截图打码或称「海外某绘图 AI」，正文重点给国内平替路径，如即梦/可灵/千问"
        },
        {
          title: "AI 做 PPT：博主@歸藏 的 PPT Skill 吸引 4700+ 人使用",
          platform: "小红书",
          heat: "高",
          why: "「职场牛马做汇报」是永恒痛点，工具+具体场景+一键体验的组合转化率极高",
          angle: "「AI 小白第一次用 AI 做 PPT，被同事追问用了什么」——过程记录+翻车+最终效果对比",
          tip: "对标账号先拆解：他压了十年设计经验进去，你压「小白试错经验」，人设差异化"
        },
        {
          title: "Vibe Coding 零基础做小工具，月发布量 4-5 万个",
          platform: "小红书",
          heat: "中高",
          why: "60% 开发者是 00 后，最小 12 岁——「不会代码也能做产品」的叙事极易引发小白共鸣",
          angle: "「不会一行代码，我用 AI 给自己做了个 XX 工具」系列，每周一个小工具，可长期做成栏目",
          tip: "你深度用 Claude 写代码的经验就是信息差，输出方法论时说「我用的 AI 编程助手」即可"
        },
        {
          title: "AI + 暑假刚需：志愿填报 / 手抄报 / 亲子作业辅助",
          platform: "抖音+小红书",
          heat: "中",
          why: "暑期季节性流量，家长焦虑+学生刚需，AI 作为解决方案切入点击率高",
          angle: "「家长别再花冤枉钱：AI 十分钟搞定 XX」，蹭季节流量但用你的提示词功底做深度",
          tip: "季节性选题，8 月中旬前有效，别投入太重"
        }
      ]
    }
  ]
};

<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="AI工作台">
<meta name="theme-color" content="#FF2442">
<title>宏的AI陪跑 · 视频工作台</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/svg+xml" href="assets/icon.svg">
<link rel="apple-touch-icon" href="assets/icon.svg">
<link rel="stylesheet" href="assets/styles.css">
</head>
<body>

<header>
  <div class="bar">
    <div class="logo"><span class="dot"></span>宏的AI陪跑 <small>视频工作台</small></div>
    <nav>
      <button data-view="board" class="active">工作台</button>
      <button data-view="hot">热点雷达</button>
      <button data-view="review">复盘</button>
      <button data-view="biz">商单</button>
      <button data-view="rivals">对标博主</button>
    </nav>
    <div class="spacer"></div>
    <div class="stat-strip">
      <div class="s" id="st-fans"></div>
      <div class="s" id="st-week"></div>
      <div class="s" id="st-review"></div>
      <div class="s" id="st-pipe"></div>
      <div class="s" id="st-biz"></div>
    </div>
    <button id="btn-sync" class="sync-btn" title="云端同步设置">☁ 本地</button>
  </div>
</header>

<main>
  <!-- ========== 工作台（主视图） ========== -->
  <section class="view active" id="view-board">
    <div class="dash">
      <div class="card focus">
        <h3>今日聚焦</h3>
        <ul id="focus-list"></ul>
      </div>
      <div class="card kpi">
        <div class="lab">粉丝进度（前期核心 KPI）</div>
        <div class="num" id="kpi-fans">0</div>
        <div class="bar" id="fans-bar"><i style="width:0%"></i></div>
        <div class="sub" id="kpi-fans-sub">目标 5000 粉 · 开蒲公英接商单</div>
      </div>
      <div class="card kpi">
        <div class="lab">本周发布节奏</div>
        <div class="num" id="kpi-week">0<span class="sub-num"> / 3 条</span></div>
        <div class="week-bars" id="week-bars"></div>
        <div class="sub" id="kpi-week-sub">近 7 天发布分布 · 目标每周 3 条稳定输出</div>
      </div>
    </div>

    <div class="board-head">
      <div>
        <h2 style="display:inline">视频生产流水线</h2>
        <span class="hint">　拖拽卡片推进阶段 · 点卡片编辑</span>
      </div>
      <button class="btn" id="btn-new">+ 新建选题</button>
    </div>
    <div class="board" id="board"></div>
  </section>

  <!-- ========== 热点雷达 ========== -->
  <section class="view" id="view-hot">
    <h2 class="section-title">热点雷达 <span id="hot-src" class="hot-src" hidden></span></h2>
    <p class="section-sub">每天 9:00 自动抓取抖音 / 小红书 AI 爆款 · 一键变成你的二创选题（品牌名模糊化，方法论留给你）。</p>
    <div class="grid hot-grid" id="hot-grid"></div>
  </section>

  <!-- ========== 复盘 ========== -->
  <section class="view" id="view-review">
    <h2 class="section-title">发帖复盘</h2>
    <p class="section-sub">视频博主看这 4 个数：2秒留存（钩子）、完播率（节奏）、赞藏（价值）、转粉率（人设）。</p>
    <div class="review-wrap">
      <form class="form" id="rv-form">
        <label>选择视频
          <select id="rv-idea"></select>
        </label>
        <div class="script-recall" id="rv-script"></div>
        <label>播放量<input id="rv-play" type="number" placeholder="如 12000" required></label>
        <div style="display:flex;gap:10px">
          <label style="flex:1">2秒留存率(%)<input id="rv-ret2" type="number" placeholder="如 45"></label>
          <label style="flex:1">完播率(%)<input id="rv-finish" type="number" placeholder="如 18"></label>
        </div>
        <div style="display:flex;gap:10px">
          <label style="flex:1">赞<input id="rv-like" type="number" placeholder="0"></label>
          <label style="flex:1">藏<input id="rv-save" type="number" placeholder="0"></label>
        </div>
        <div style="display:flex;gap:10px">
          <label style="flex:1">评<input id="rv-comment" type="number" placeholder="0"></label>
          <label style="flex:1">涨粉<input id="rv-follow" type="number" placeholder="0"></label>
        </div>
        <button class="btn" type="submit">保存并诊断</button>
      </form>
      <div>
        <div class="review-list" id="review-list"></div>
        <div id="ret-chart"></div>
      </div>
    </div>
  </section>

  <!-- ========== 商单变现 ========== -->
  <section class="view" id="view-biz">
    <h2 class="section-title">商单变现</h2>
    <p class="section-sub">前期涨粉的出口。追踪蒲公英门槛、接单准备度、最佳作品集与报价参考——把运营工具变成生意工具。</p>
    <div class="biz-grid">
      <div class="card biz-card biz-fans">
        <div class="biz-h">粉丝 &amp; 蒲公英门槛</div>
        <div class="fans-row">
          <div class="fans-now"><b id="biz-fans-now">0</b><span>当前粉丝</span></div>
          <div class="fans-edit">
            <input id="biz-fans-input" type="number" placeholder="更新粉丝数">
            <button class="btn ghost" id="biz-fans-save">更新</button>
          </div>
        </div>
        <div class="prog"><i id="biz-prog-i"></i></div>
        <div class="biz-sub" id="biz-pgy">蒲公英入驻门槛 1000 粉</div>
      </div>

      <div class="card biz-card biz-ready">
        <div class="biz-h">接单准备度</div>
        <ul class="ready" id="biz-ready"></ul>
      </div>

      <div class="card biz-card biz-port">
        <div class="biz-h">最佳作品集 <small>自动按转粉率排序</small></div>
        <div id="biz-port"></div>
      </div>

      <div class="card biz-card biz-rate">
        <div class="biz-h">AI 赛道报价参考</div>
        <table class="rate" id="biz-rate"></table>
        <div class="biz-note">AI / 科技赛道通常溢价 30–50%，仅供参考</div>
      </div>

      <div class="card biz-card biz-deals">
        <div class="biz-h">商单记录</div>
        <div class="deal-form">
          <input id="biz-brand" placeholder="品牌">
          <input id="biz-amount" placeholder="金额 ¥">
          <select id="biz-status"><option>洽谈中</option><option>已签约</option><option>已结款</option></select>
          <button class="btn" id="biz-deal-add">添加</button>
        </div>
        <div id="biz-deals"></div>
      </div>
    </div>
  </section>

  <!-- ========== 对标博主 ========== -->
  <section class="view" id="view-rivals">
    <h2 class="section-title">对标博主</h2>
    <p class="section-sub">站外视频无法直接内嵌，做成拆解卡 + 一键跳转。学他们的「钩子 / 节奏 / 栏目化」，不抄内容抄打法。</p>
    <div class="grid rival-grid" id="rival-grid"></div>
  </section>
</main>

<!-- ========== 新建 / 编辑 弹窗 ========== -->
<div class="modal-bg" id="modal">
  <div class="modal">
    <h3>视频选题</h3>
    <div class="fld"><label>标题（工作标题）</label><input id="m-title" placeholder="如：我用AI把3小时PPT压到3分钟"></div>
    <div class="fld"><label>前3秒钩子（视频命门 · 即开场）</label><input id="m-hook" placeholder="如：以前做PPT熬到凌晨，现在喝杯咖啡就搞定"></div>
    <div class="script-block">
      <div class="sb-head"><b>完整脚本</b><span class="sb-sub">开场钩子即上方，下面补 3 块 · 自动合规预检</span></div>
      <div class="fld"><label>痛点共鸣（为什么看下去）</label><textarea id="m-pain" placeholder="如：你是不是也每次做PPT都熬到半夜、改到崩溃……"></textarea></div>
      <div class="fld"><label>实操步骤（分点写，口播感）</label><textarea id="m-steps" placeholder="如：① 打开XX ② 输入这句提示词 ③ 一键出稿……"></textarea></div>
      <div class="fld"><label>收尾关注引导</label><textarea id="m-end" placeholder="如：关注我，下期拆解海外博主私藏的AI玩法"></textarea></div>
      <div class="compliance" id="m-comp"></div>
    </div>
    <div class="fld"><label>封面概念</label><input id="m-cover" placeholder="如：熬夜黑眼圈 vs 咖啡+成品"></div>
    <div style="display:flex;gap:10px">
      <div class="fld" style="flex:1"><label>标签</label><input id="m-tag" placeholder="AI实操 / AI小白 / 陪跑"></div>
      <div class="fld" style="flex:1"><label>预计发布</label><input id="m-due" type="date"></div>
    </div>
    <div class="fld"><label>阶段</label>
      <select id="m-stage">
        <option value="pool">灵感池</option>
        <option value="script">写脚本</option>
        <option value="shoot">拍摄</option>
        <option value="edit">剪辑</option>
        <option value="published">已发布</option>
        <option value="review">复盘</option>
      </select>
    </div>
    <div class="fld"><label>发布平台</label>
      <div class="pf-pick" id="m-pf">
        <label><input type="checkbox" value="xhs" checked>小红书</label>
        <label><input type="checkbox" value="dy">抖音</label>
      </div>
    </div>
    <div class="modal-acts">
      <button class="btn ghost" id="m-del" style="display:none;color:#FF2442;border-color:#FFD2DA">删除</button>
      <div class="right">
        <button class="btn ghost" id="m-cancel">取消</button>
        <button class="btn" id="m-save">保存</button>
      </div>
    </div>
  </div>
</div>

<!-- ========== 云端同步设置 弹窗 ========== -->
<div class="modal-bg" id="sync-modal">
  <div class="modal sync-modal">
    <h3>云端同步设置</h3>
    <p class="sync-tip">数据存到你的 <b>GitHub Gist</b>：永久免费、不依赖电脑开机、电脑 / iPhone / iPad 三端实时同步。只需一个带 <code>gist</code> 权限的 GitHub 个人访问令牌（PAT），10 秒建好。其它设备用同一个令牌会自动找到这份数据，不用抄 ID。</p>
    <div class="fld"><label>GitHub 令牌 (PAT)</label><input id="sync-token" type="password" placeholder="github_pat_xxx 或 ghp_xxx（需 gist 权限）" autocomplete="off"></div>
    <div class="fld" id="gist-row" style="display:none"><label>同步 ID（其它设备自动查找，一般无需手动填）</label><input id="sync-gist" readonly></div>
    <div class="sync-status off" id="sync-status">状态：未连接（仅本地保存）</div>
    <details class="sync-adv">
      <summary>高级：改用 Supabase</summary>
      <div class="fld"><label>Supabase Project URL</label><input id="sync-url" placeholder="https://xxxx.supabase.co"></div>
      <div class="fld"><label>Anon / Public Key</label><input id="sync-key" placeholder="eyJ...（以 eyJ 开头）"></div>
    </details>
    <div class="modal-acts">
      <div class="left">
        <button class="btn ghost" id="sync-export">导出备份</button>
        <button class="btn ghost" id="sync-import-btn">导入备份</button>
        <input type="file" id="sync-import" accept="application/json" style="display:none">
      </div>
      <div class="right">
        <button class="btn ghost" id="sync-pull">从云端拉取</button>
        <button class="btn ghost" id="sync-cancel">取消</button>
        <button class="btn" id="sync-save">保存并连接</button>
      </div>
    </div>
  </div>
</div>

<script src="assets/data.js"></script>
<script src="data/hotspots.js"></script>
<script src="assets/sync.js"></script>
<script src="assets/app.js"></script>
<script>if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(e=>console.warn('SW',e)));}</script>
</body>
</html>

{
  "name": "宏的AI视频工作台",
  "short_name": "AI工作台",
  "description": "小红书视频博主运营工作台：流水线、热点、脚本、复盘、商单",
  "start_url": ".",
  "scope": ".",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#F4F5F7",
  "theme_color": "#FF2442",
  "icons": [
    { "src": "assets/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" }
  ]
}
