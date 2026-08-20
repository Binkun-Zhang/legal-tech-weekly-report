(function () {
  var favoriteStorageKey = "legal-tech-weekly:favorites";
  var topicStorageKey = "legal-tech-weekly:topics";
  var favorites = [];
  var topics = [];
  var issues = [];
  var currentTopic = "";
  var latestIssue = null;

  var defaultTopics = [
    "合同审核",
    "法律文书起草",
    "法律 Agent",
    "MCP 与法律知识库",
    "法律 AI 合规与责任"
  ];

  function escapeHtml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch (error) { return fallback; }
  }
  function saveData() {
    localStorage.setItem(favoriteStorageKey, JSON.stringify(favorites));
    localStorage.setItem(topicStorageKey, JSON.stringify(topics));
  }
  function viewerHref(file) {
    return "view.html?issue=" + encodeURIComponent(file);
  }
  function issueForFavorite(favorite) {
    return issues.find(function (issue) { return issue.id === favorite.issueId; });
  }
  function ensureTopics() {
    var saved = readJson(topicStorageKey, []);
    topics = Array.from(new Set(defaultTopics.concat(saved)));
    if (!currentTopic || topics.indexOf(currentTopic) === -1) currentTopic = topics[0];
  }
  function favoriteButtonLabel(favorite) {
    return favorite.topic ? favorite.topic : "未分类";
  }
  function renderStats() {
    document.getElementById("favorite-count").textContent = favorites.length;
    document.getElementById("topic-count").textContent = topics.length;
    document.getElementById("note-count").textContent = favorites.filter(function (favorite) {
      return favorite.note && favorite.note.trim();
    }).length;
  }
  function favoriteHtml(favorite, allowTopic) {
    var issue = issueForFavorite(favorite);
    return '<article class="saved-item" data-key="' + escapeHtml(favorite.key) + '">' +
      '<div class="saved-item-meta"><span>' + escapeHtml(favorite.period || (issue && issue.period) || "未标日期") +
      '</span><span>' + escapeHtml(favorite.competitor || "未分类") + '</span></div>' +
      '<div class="saved-item-body">' +
        '<h3>' + escapeHtml(favorite.action || favorite.title || "未命名动态") + '</h3>' +
        '<p>' + escapeHtml(favorite.impact || "") + '</p>' +
        '<div class="saved-item-actions">' +
          (issue ? '<a class="text-link" href="' + viewerHref(issue.file) + '">查看原周报 ↗</a>' : "") +
          '<button class="small-action remove-favorite" type="button">移除收藏</button>' +
          (allowTopic ? '<label class="inline-topic">专题 <select class="topic-select">' +
            topics.map(function (topic) {
              return '<option value="' + escapeHtml(topic) + '"' +
                (topic === favorite.topic ? " selected" : "") + '>' + escapeHtml(topic) + '</option>';
            }).join("") + '</select></label>' : "") +
        '</div>' +
        '<label class="saved-note-label">我的备注<textarea class="saved-note" rows="2" placeholder="补充实测计划、问题或判断…">' +
          escapeHtml(favorite.note || "") + '</textarea></label>' +
        '<span class="item-status"></span>' +
      '</div>' +
    '</article>';
  }
  function renderFavorites() {
    var list = document.getElementById("favorites-list");
    list.innerHTML = favorites.map(function (favorite) {
      return favoriteHtml(favorite, true);
    }).join("");
    document.getElementById("favorites-empty").hidden = favorites.length !== 0;
  }
  function renderWeekly() {
    var list = document.getElementById("weekly-list");
    if (!latestIssue) return;
    document.getElementById("weekly-period").textContent = latestIssue.period;
    list.innerHTML = (latestIssue.highlights || []).map(function (item) {
      var key = latestIssue.id + "::" + item.competitor + "::" + item.action;
      var saved = favorites.some(function (favorite) { return favorite.key === key; });
      return '<article class="saved-item weekly-item">' +
        '<div class="saved-item-meta"><span>' + escapeHtml(item.competitor) + '</span><span>' +
          escapeHtml(item.evidence || "来源待补") + '</span></div>' +
        '<div class="saved-item-body"><h3>' + escapeHtml(item.action) + '</h3><p>' +
          escapeHtml(item.impact) + '</p><div class="saved-item-actions">' +
          '<a class="text-link" href="' + viewerHref(latestIssue.file) + '">查看本期原文 ↗</a>' +
          '<button class="small-action weekly-favorite" type="button" data-weekly-key="' + escapeHtml(key) +
          '" data-weekly-competitor="' + escapeHtml(item.competitor) +
          '" data-weekly-action="' + escapeHtml(item.action) +
          '" data-weekly-impact="' + escapeHtml(item.impact) + '">' +
          (saved ? "已收藏" : "收藏动态") + '</button></div></div></article>';
    }).join("");
  }
  function renderTopicSwitcher() {
    var switcher = document.getElementById("topic-switcher");
    switcher.innerHTML = topics.map(function (topic) {
      return '<button class="topic-pill' + (topic === currentTopic ? " is-selected" : "") +
        '" type="button" data-topic="' + escapeHtml(topic) + '">' + escapeHtml(topic) + '</button>';
    }).join("");
  }
  function renderTopic() {
    var selected = favorites.filter(function (favorite) { return favorite.topic === currentTopic; });
    document.getElementById("topic-summary").textContent =
      currentTopic + " · " + selected.length + " 条收藏 · 可导出为 Markdown 或 HTML";
    document.getElementById("topic-list").innerHTML = selected.length
      ? selected.map(function (favorite) { return favoriteHtml(favorite, false); }).join("")
      : '<div class="workspace-empty"><strong>这个专题还没有内容</strong><p>在收藏列表中为动态选择“' +
        escapeHtml(currentTopic) + '”。</p></div>';
  }
  function renderAll() {
    ensureTopics();
    renderStats();
    renderFavorites();
    renderWeekly();
    renderTopicSwitcher();
    renderTopic();
  }
  function makeMarkdown(list, title) {
    var lines = ["# " + title, "", "导出时间：" + new Date().toLocaleString("zh-CN"), ""];
    list.forEach(function (favorite) {
      lines.push("## " + (favorite.action || "未命名动态"));
      lines.push("- 竞品：" + (favorite.competitor || "未分类"));
      lines.push("- 期次：" + (favorite.period || ""));
      lines.push("- 影响判断：" + (favorite.impact || ""));
      lines.push("- 我的备注：" + (favorite.note || "无"));
      lines.push("- 原文：" + (window.location.origin + "/" + viewerHref(favorite.issueFile || "")));
      lines.push("");
    });
    return lines.join("\n");
  }
  function downloadFile(filename, content, type) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
  function exportMarkdown(list, title) {
    downloadFile(title.replace(/\s+/g, "-") + ".md", makeMarkdown(list, title), "text/markdown;charset=utf-8");
  }
  function exportHtml(list, title) {
    var body = list.map(function (favorite) {
      return "<article><h2>" + escapeHtml(favorite.action || "") + "</h2>" +
        "<p><b>竞品：</b>" + escapeHtml(favorite.competitor || "") + "</p>" +
        "<p><b>期次：</b>" + escapeHtml(favorite.period || "") + "</p>" +
        "<p><b>影响判断：</b>" + escapeHtml(favorite.impact || "") + "</p>" +
        "<p><b>我的备注：</b>" + escapeHtml(favorite.note || "无") + "</p></article>";
    }).join("");
    downloadFile(title.replace(/\s+/g, "-") + ".html",
      "<!doctype html><meta charset='utf-8'><title>" + escapeHtml(title) +
      "</title><style>body{font-family:Arial;max-width:800px;margin:40px auto;line-height:1.7}article{border-bottom:1px solid #ddd;padding:12px 0}</style><h1>" +
      escapeHtml(title) + "</h1>" + body, "text/html;charset=utf-8");
  }
  document.addEventListener("click", function (event) {
    var tab = event.target.closest("[data-tab]");
    if (tab) {
      document.querySelectorAll(".workspace-tab").forEach(function (item) {
        item.classList.toggle("is-active", item === tab);
      });
      document.querySelectorAll(".workspace-tab-panel").forEach(function (panel) {
        panel.classList.toggle("is-active", panel.dataset.panel === tab.dataset.tab);
      });
      return;
    }
    var topic = event.target.closest("[data-topic]");
    if (topic) {
      currentTopic = topic.dataset.topic;
      renderTopicSwitcher();
      renderTopic();
      return;
    }
    var remove = event.target.closest(".remove-favorite");
    if (remove) {
      var card = remove.closest("[data-key]");
      favorites = favorites.filter(function (favorite) { return favorite.key !== card.dataset.key; });
      saveData();
      renderAll();
      return;
    }
    var weekly = event.target.closest(".weekly-favorite");
    if (weekly) {
      var key = weekly.dataset.weeklyKey;
      var existing = favorites.find(function (favorite) { return favorite.key === key; });
      if (existing) {
        favorites = favorites.filter(function (favorite) { return favorite.key !== key; });
      } else {
        favorites.push({
          key: key,
          issueId: latestIssue.id,
          issueFile: latestIssue.file,
          period: latestIssue.period,
          competitor: weekly.dataset.weeklyCompetitor,
          action: weekly.dataset.weeklyAction,
          impact: weekly.dataset.weeklyImpact,
          topic: "未分类",
          note: ""
        });
      }
      saveData();
      renderAll();
    }
  });
  document.addEventListener("change", function (event) {
    if (event.target.classList.contains("topic-select")) {
      var card = event.target.closest("[data-key]");
      var favorite = favorites.find(function (item) { return item.key === card.dataset.key; });
      if (favorite) {
        favorite.topic = event.target.value;
        saveData();
        renderAll();
      }
    }
  });
  document.addEventListener("input", function (event) {
    if (!event.target.classList.contains("saved-note")) return;
    var card = event.target.closest("[data-key]");
    var favorite = favorites.find(function (item) { return item.key === card.dataset.key; });
    if (!favorite) return;
    favorite.note = event.target.value;
    saveData();
    var status = card.querySelector(".item-status");
    status.textContent = "已保存到本机";
    window.clearTimeout(status._timer);
    status._timer = window.setTimeout(function () { status.textContent = ""; }, 1200);
    renderStats();
  });
  document.getElementById("create-topic").addEventListener("click", function () {
    var input = document.getElementById("new-topic");
    var value = input.value.trim();
    if (!value || topics.indexOf(value) !== -1) return;
    topics.push(value);
    localStorage.setItem(topicStorageKey, JSON.stringify(topics.filter(function (item) {
      return defaultTopics.indexOf(item) === -1;
    })));
    currentTopic = value;
    input.value = "";
    renderAll();
  });
  document.getElementById("export-all").addEventListener("click", function () {
    exportMarkdown(favorites, "我的法律科技竞品收藏");
  });
  document.getElementById("export-all-html").addEventListener("click", function () {
    exportHtml(favorites, "我的法律科技竞品收藏");
  });
  document.getElementById("export-topic").addEventListener("click", function () {
    var selected = favorites.filter(function (favorite) { return favorite.topic === currentTopic; });
    exportMarkdown(selected, currentTopic + "专题");
  });
  document.getElementById("export-topic-html").addEventListener("click", function () {
    var selected = favorites.filter(function (favorite) { return favorite.topic === currentTopic; });
    exportHtml(selected, currentTopic + "专题");
  });
  Promise.all([
    fetch("data/issues.json").then(function (response) { return response.json(); }),
    fetch("data/competitors.json").then(function (response) { return response.json(); })
  ]).then(function (result) {
    issues = result[0].sort(function (a, b) {
      return String(b.publishedAt).localeCompare(String(a.publishedAt));
    });
    latestIssue = issues[0];
    favorites = readJson(favoriteStorageKey, []);
    renderAll();
  }).catch(function () {
    document.getElementById("favorites-empty").hidden = false;
  });
})();
