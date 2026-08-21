(function () {
  var list = document.getElementById("archive-list");
  var empty = document.getElementById("empty-state");
  var search = document.getElementById("archive-search");
  var dateFrom = document.getElementById("date-from");
  var dateTo = document.getElementById("date-to");
  var competitorFilters = document.getElementById("competitor-filters");
  var topicFilters = document.getElementById("topic-filters");
  var profileCardGrid = document.getElementById("profile-card-grid");
  var filterSummary = document.getElementById("filter-summary");
  var selectedCompetitor = "";
  var selectedTopic = "";
  var allIssues = [];
  var favoriteStorageKey = "legal-tech-weekly:issue-favorites";

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function readFavorites() {
    try {
      var favorites = JSON.parse(localStorage.getItem(favoriteStorageKey) || "[]");
      return Array.isArray(favorites) ? favorites : [];
    } catch (error) {
      return [];
    }
  }

  function saveFavorites(favorites) {
    localStorage.setItem(favoriteStorageKey, JSON.stringify(favorites));
  }

  function issueFavoriteKey(issue) {
    return "issue::" + issue.id;
  }

  function isFavorite(issue) {
    var key = issueFavoriteKey(issue);
    return readFavorites().some(function (item) { return item.key === key; });
  }

  function toggleIssueFavorite(issue) {
    var favorites = readFavorites();
    var key = issueFavoriteKey(issue);
    var index = favorites.findIndex(function (item) { return item.key === key; });
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
    saveFavorites(favorites);
    return index === -1;
  }

  function updateFavoriteButton(button, issue) {
    var saved = isFavorite(issue);
    button.textContent = saved ? "已收藏本期" : "收藏本期";
    button.classList.toggle("is-saved", saved);
    button.setAttribute("aria-pressed", String(saved));
  }

  function viewerHref(issue) {
    return "view.html?issue=" + encodeURIComponent(issue.file);
  }

  function competitorHref(name) {
    return "competitor.html?name=" + encodeURIComponent(name);
  }

  function getQueryState() {
    var params = new URLSearchParams(window.location.search);
    return {
      keyword: params.get("q") || "",
      from: params.get("from") || "",
      to: params.get("to") || "",
      competitor: params.get("competitor") || "",
      topic: params.get("topic") || ""
    };
  }

  function syncQueryState() {
    var params = new URLSearchParams();
    if (search.value.trim()) params.set("q", search.value.trim());
    if (dateFrom.value) params.set("from", dateFrom.value);
    if (dateTo.value) params.set("to", dateTo.value);
    if (selectedCompetitor) params.set("competitor", selectedCompetitor);
    if (selectedTopic) params.set("topic", selectedTopic);
    var query = params.toString();
    window.history.replaceState({}, "", query ? "?" + query : window.location.pathname);
  }

  function matchesFilters(issue) {
    var keyword = search.value.trim().toLowerCase();
    var haystack = [
      issue.title,
      issue.period,
      issue.publishedAt,
      issue.summary,
      (issue.tags || []).join(" "),
      (issue.competitors || []).join(" "),
      (issue.highlights || []).map(function (item) {
        return [item.competitor, item.action, item.impact].join(" ");
      }).join(" ")
    ].join(" ").toLowerCase();
    var date = issue.publishedAt || issue.periodEnd;
    var dateMatch = (!dateFrom.value || date >= dateFrom.value) &&
      (!dateTo.value || date <= dateTo.value);
    var competitorMatch = !selectedCompetitor ||
      (issue.competitors || []).indexOf(selectedCompetitor) !== -1;
    var topicMatch = !selectedTopic ||
      (issue.tags || []).indexOf(selectedTopic) !== -1;
    return (!keyword || haystack.indexOf(keyword) !== -1) &&
      dateMatch && competitorMatch && topicMatch;
  }

  function renderChips(container, values, selected, type) {
    container.innerHTML = values.map(function (value) {
      var active = value === selected;
      return '<button class="filter-chip' + (active ? ' is-selected' : '') +
        '" type="button" data-filter-type="' + type + '" data-filter-value="' +
        escapeHtml(value) + '" aria-pressed="' + String(active) + '">' +
        escapeHtml(value) + '</button>';
    }).join("");
  }

  function renderArchive(issues) {
    list.innerHTML = issues.map(function (issue) {
      var tags = (issue.tags || []).slice(0, 4).map(function (tag) {
        return '<span class="mini-chip">' + escapeHtml(tag) + '</span>';
      }).join("");
      return [
        '<article class="archive-item">',
          '<div class="archive-date">' + escapeHtml(issue.period) + '</div>',
          '<div class="archive-copy">',
            '<a class="archive-main-link" href="' + viewerHref(issue) + '">',
              '<h3>' + escapeHtml(issue.title) + '</h3>',
              '<p>' + escapeHtml(issue.summary) + '</p>',
              '<div class="mini-chip-list">' + tags + '</div>',
            '</a>',
          '</div>',
          '<div class="archive-actions">',
            '<a class="archive-open" href="' + viewerHref(issue) + '">查看周报 <span aria-hidden="true">↗</span></a>',
            '<button class="small-action issue-favorite-button' + (isFavorite(issue) ? " is-saved" : "") +
              '" type="button" data-favorite-issue-id="' + escapeHtml(issue.id) +
              '" aria-pressed="' + String(isFavorite(issue)) + '">' +
              (isFavorite(issue) ? "已收藏本期" : "收藏本期") + '</button>',
          '</div>',
        '</article>'
      ].join("");
    }).join("");
    empty.hidden = issues.length !== 0;
  }

  function renderProfiles(profiles) {
    profileCardGrid.innerHTML = profiles.map(function (profile) {
      var count = allIssues.reduce(function (total, issue) {
        return total + (issue.highlights || []).filter(function (item) {
          return item.competitor === profile.name;
        }).length;
      }, 0);
      return '<a class="profile-card" href="' + competitorHref(profile.name) + '">' +
        '<div class="profile-card-top"><span class="profile-card-mark">' +
          escapeHtml(profile.name.slice(0, 1)) + '</span><span class="profile-card-count">' +
          count + ' 条动态</span></div>' +
        '<h3>' + escapeHtml(profile.name) + '</h3>' +
        '<p>' + escapeHtml(profile.positioning) + '</p>' +
        '<div class="mini-chip-list">' + profile.capabilities.slice(0, 4).map(function (capability) {
          return '<span class="mini-chip">' + escapeHtml(capability) + '</span>';
        }).join("") + '</div>' +
        '<span class="profile-card-link">查看竞品档案 ↗</span>' +
      '</a>';
    }).join("");
  }

  function applyFilters() {
    var filtered = allIssues.filter(matchesFilters);
    renderArchive(filtered);
    var parts = ["显示 " + filtered.length + " / " + allIssues.length + " 期"];
    if (selectedCompetitor) parts.push(selectedCompetitor);
    if (selectedTopic) parts.push(selectedTopic);
    filterSummary.textContent = parts.join(" · ");
    syncQueryState();
  }

  function populateFilterValues(issues) {
    var competitors = [];
    var topics = [];
    issues.forEach(function (issue) {
      (issue.competitors || []).forEach(function (item) {
        if (competitors.indexOf(item) === -1) competitors.push(item);
      });
      (issue.tags || []).forEach(function (item) {
        if (topics.indexOf(item) === -1) topics.push(item);
      });
    });
    competitors.sort();
    topics.sort();
    renderChips(competitorFilters, competitors, selectedCompetitor, "competitor");
    renderChips(topicFilters, topics, selectedTopic, "topic");
    document.getElementById("competitor-count").textContent = competitors.length;
  }

  function restoreState() {
    var state = getQueryState();
    search.value = state.keyword;
    dateFrom.value = state.from;
    dateTo.value = state.to;
    selectedCompetitor = state.competitor;
    selectedTopic = state.topic;
  }

  function setupEvents() {
    [search, dateFrom, dateTo].forEach(function (element) {
      element.addEventListener("input", applyFilters);
      element.addEventListener("change", applyFilters);
    });
    document.addEventListener("click", function (event) {
      var filterButton = event.target.closest("[data-filter-type]");
      if (filterButton) {
        var type = filterButton.getAttribute("data-filter-type");
        var value = filterButton.getAttribute("data-filter-value");
        if (type === "competitor") selectedCompetitor = selectedCompetitor === value ? "" : value;
        if (type === "topic") selectedTopic = selectedTopic === value ? "" : value;
        populateFilterValues(allIssues);
        applyFilters();
        return;
      }
      var favoriteButton = event.target.closest("[data-favorite-issue-id]");
      if (favoriteButton) {
        event.preventDefault();
        var issue = allIssues.find(function (item) {
          return item.id === favoriteButton.dataset.favoriteIssueId;
        });
        if (issue) {
          toggleIssueFavorite(issue);
          updateFavoriteButton(favoriteButton, issue);
        }
      }
    });
    document.getElementById("clear-filters").addEventListener("click", function () {
      search.value = "";
      dateFrom.value = "";
      dateTo.value = "";
      selectedCompetitor = "";
      selectedTopic = "";
      populateFilterValues(allIssues);
      applyFilters();
    });
  }

  Promise.all([
    fetch("data/issues.json").then(function (response) {
      if (!response.ok) throw new Error("issues.json unavailable");
      return response.json();
    }),
    fetch("data/site-config.json").then(function (response) {
      return response.ok ? response.json() : {};
    }),
    fetch("data/competitors.json").then(function (response) {
      return response.ok ? response.json() : [];
    })
  ]).then(function (result) {
    allIssues = result[0].sort(function (a, b) {
      return String(b.publishedAt).localeCompare(String(a.publishedAt));
    });
    if (!allIssues.length) throw new Error("No issues");
    restoreState();
    populateFilterValues(allIssues);
    setupEvents();
    renderProfiles(result[2]);

    var latest = allIssues[0];
    document.getElementById("issue-count").textContent = allIssues.length;
    document.getElementById("latest-date").textContent = latest.publishedAt;
    document.getElementById("latest-period").textContent = latest.period;
    document.getElementById("latest-title").textContent = latest.title;
    document.getElementById("latest-summary").textContent = latest.summary;
    document.getElementById("latest-open-link").href = viewerHref(latest);
    document.getElementById("latest-action").href = viewerHref(latest);
    var latestFavorite = document.getElementById("latest-favorite");
    latestFavorite.dataset.favoriteIssueId = latest.id;
    updateFavoriteButton(latestFavorite, latest);
    applyFilters();
  }).catch(function () {
    list.innerHTML = '<div class="empty-state">周报目录暂时无法加载，请确认网站通过 HTTP 服务打开。</div>';
    filterSummary.textContent = "目录加载失败";
  });
})();
