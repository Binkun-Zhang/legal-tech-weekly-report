(function () {
  var favoriteStorageKey = "legal-tech-weekly:issue-favorites";
  var topicStorageKey = "legal-tech-weekly:topics";
  var favorites = [];
  var topics = [];
  var issues = [];
  var currentTopic = "";
  var latestIssue = null;

  var defaultTopics = [
    "未分类",
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
    try {
      var value = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
      return value;
    } catch (error) {
      return fallback;
    }
  }

  function saveData() {
    localStorage.setItem(favoriteStorageKey, JSON.stringify(favorites));
    localStorage.setItem(topicStorageKey, JSON.stringify(topics.filter(function (item) {
      return defaultTopics.indexOf(item) === -1;
    })));
  }

  function viewerHref(file) {
    return "view.html?issue=" + encodeURIComponent(file);
  }

  function issueForFavorite(favorite) {
    return issues.find(function (issue) { return issue.id === favorite.issueId; }) || null;
  }

  function issueFavoriteKey(issue) {
    return "issue::" + issue.id;
  }

  function ensureTopics() {
    var saved = readJson(topicStorageKey, []);
    topics = Array.from(new Set(defaultTopics.concat(Array.isArray(saved) ? saved : [])));
    if (!currentTopic || topics.indexOf(currentTopic) === -1) currentTopic = topics[0];
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
    var file = (issue && issue.file) || favorite.issueFile;
    var period = (issue && issue.period) || favorite.period || "未标日期";
    var title = (issue && issue.title) || favorite.title || "未命名周报";
    var summary = (issue && issue.summary) || favorite.summary || "";
    return '<article class="saved-item" data-key="' + escapeHtml(favorite.key) + '">' +
      '<div class="saved-item-meta"><span>' + escapeHtml(period) +
      '</span><span>完整周报</span></div>' +
      '<div class="saved-item-body">' +
        '<h3>' + escapeHtml(title) + '</h3>' +
        '<p>' + escapeHtml(summary) + '</p>' +
        '<div class="saved-item-actions">' +
          (file ? '<a class="text-link" href="' + viewerHref(file) + '">查看原周报 ↗</a>' : "") +
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
    var saved = favorites.some(function (favorite) {
      return favorite.key === issueFavoriteKey(latestIssue);
    });
    document.getElementById("weekly-period").textContent = latestIssue.period;
    list.innerHTML =
      '<article class="saved-item weekly-item">' +
        '<div class="saved-item-meta"><span>' + escapeHtml(latestIssue.period) +
        '</span><span>最新一期</span></div>' +
        '<div class="saved-item-body"><h3>' + escapeHtml(latestIssue.title) + '</h3><p>' +
          escapeHtml(latestIssue.summary) + '</p><div class="saved-item-actions">' +
          '<a class="text-link" href="' + viewerHref(latestIssue.file) + '">查看本期原文 ↗</a>' +
          '<button class="small-action weekly-favorite' + (saved ? " is-saved" : "") +
            '" type="button" data-weekly-issue-id="' + escapeHtml(latestIssue.id) +
            '" aria-pressed="' + String(saved) + '">' +
            (saved ? "已收藏本期" : "收藏本期") + '</button>' +
        '</div></div>' +
      '</article>';
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
      currentTopic + " · " + selected.length + " 期周报";
    document.getElementById("topic-list").innerHTML = selected.length
      ? selected.map(function (favorite) { return favoriteHtml(favorite, false); }).join("")
      : '<div class="workspace-empty"><strong>这个专题还没有内容</strong><p>在收藏列表中为周报选择“' +
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

  function toggleIssueFavorite(issue) {
    var key = issueFavoriteKey(issue);
    var index = favorites.findIndex(function (favorite) { return favorite.key === key; });
    if (index === -1) {
      favorites.push({
        key: key,
        issueId: issue.id,
        issueFile: issue.file,
        period: issue.period,
        title: issue.title,
        summary: issue.summary,
        topic: "未分类",
        note: ""
      });
    } else {
      favorites.splice(index, 1);
    }
    saveData();
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
      var issue = issues.find(function (item) { return item.id === weekly.dataset.weeklyIssueId; });
      if (!issue) return;
      toggleIssueFavorite(issue);
      renderAll();
    }
  });

  document.addEventListener("change", function (event) {
    if (!event.target.classList.contains("topic-select")) return;
    var card = event.target.closest("[data-key]");
    var favorite = favorites.find(function (item) { return item.key === card.dataset.key; });
    if (favorite) {
      favorite.topic = event.target.value;
      saveData();
      renderAll();
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
    currentTopic = value;
    input.value = "";
    saveData();
    renderAll();
  });

  Promise.all([
    fetch("data/issues.json").then(function (response) { return response.json(); })
  ]).then(function (result) {
    issues = result[0].sort(function (a, b) {
      return String(b.publishedAt).localeCompare(String(a.publishedAt));
    });
    latestIssue = issues[0];
    favorites = readJson(favoriteStorageKey, []).filter(function (favorite) {
      return favorite && favorite.issueId && favorite.issueFile && !favorite.competitor && !favorite.action;
    });
    renderAll();
  }).catch(function () {
    document.getElementById("favorites-empty").hidden = false;
  });
})();
