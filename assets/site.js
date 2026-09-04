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
  var focusList = document.getElementById("focus-list");
  var archiveSection = document.getElementById("archive");
  var searchForm = document.getElementById("archive-search-form");
  var searchResultsPanel = document.getElementById("search-results-panel");
  var searchResultList = document.getElementById("search-result-list");
  var searchEmpty = document.getElementById("search-empty-state");
  var searchResultSummary = document.getElementById("search-result-summary");
  var searchResultHint = document.getElementById("search-result-hint");
  var selectedCompetitor = "";
  var selectedTopic = "";
  var allIssues = [];
  var trackedCompetitors = ["Alpha AI", "幂律智能", "北大法宝", "威科先行", "WorkBuddy"];
  var searchSubmitted = false;
  var favoriteStorageKey = "legal-tech-weekly:issue-favorites";
  var favoriteChannel = null;
  try {
    favoriteChannel = window.BroadcastChannel ? new BroadcastChannel("legal-tech-weekly:favorites") : null;
  } catch (error) {
    favoriteChannel = null;
  }

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
      return Array.isArray(favorites) ? favorites.filter(function (item) {
        return item && item.issueId && item.issueFile &&
          (!item.type || item.type === "issue");
      }) : [];
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
        type: "issue",
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
    if (favoriteChannel) favoriteChannel.postMessage({ type: "favorites-updated" });
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

  function viewerCompetitorHref(issue, competitor) {
    return viewerHref(issue) + "&from=competitor&name=" + encodeURIComponent(competitor);
  }

  function viewerSignalHref(issue, competitor, action) {
    return viewerCompetitorHref(issue, competitor) + "&action=" + encodeURIComponent(action || "");
  }

  function normalizeSearchText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function searchQueryParts(value) {
    var query = normalizeSearchText(value)
      .replace(/([a-z])([\u4e00-\u9fff])/gi, "$1 $2")
      .replace(/([\u4e00-\u9fff])([a-z])/gi, "$1 $2");
    var phrases = [];
    query = query.replace(/"([^"]+)"/g, function (_, phrase) {
      var normalizedPhrase = normalizeSearchText(phrase);
      if (normalizedPhrase) phrases.push(normalizedPhrase);
      return " ";
    });
    return {
      phrases: phrases,
      tokens: query.split(/[\s,，。；;、|/]+/).map(normalizeSearchText).filter(Boolean)
    };
  }

  function compactSearchText(value) {
    return normalizeSearchText(value).replace(/[\s\-_]+/g, "");
  }

  function searchVariants(term) {
    var compact = compactSearchText(term);
    var groups = [
      { label: "Alpha AI", terms: ["alpha", "alphai", "alphagpt", "alphaclaw", "icourt"] },
      { label: "幂律智能", terms: ["幂律", "幂律智能", "meflow", "mework", "吾律ai"] },
      { label: "北大法宝", terms: ["北大法宝", "pkulaw"] },
      { label: "威科先行", terms: ["威科先行", "小威ai", "小威ai+", "wolterskluwer"] },
      { label: "WorkBuddy", terms: ["workbuddy", "湾擎"] }
    ];
    var group = groups.find(function (item) {
      return item.terms.some(function (variant) {
        return compact === compactSearchText(variant) ||
          compactSearchText(variant).indexOf(compact) === 0 && compact.length >= 3;
      });
    });
    return group ? { label: group.label, terms: group.terms } : { label: term, terms: [term] };
  }

  function issueSearchFields(issue) {
    return [
      { label: "标题", weight: 9, text: [issue.title, issue.period].join(" ") },
      { label: "摘要", weight: 6, text: issue.summary },
      { label: "竞品", weight: 8, text: (issue.competitors || []).join(" ") },
      { label: "主题", weight: 5, text: (issue.tags || []).join(" ") },
      { label: "动态", weight: 7, text: (issue.highlights || []).map(function (item) {
        return [item.competitor, item.action, item.impact, item.evidence].join(" ");
      }).join(" ") }
    ].map(function (field) {
      return {
        label: field.label,
        weight: field.weight,
        text: normalizeSearchText(field.text),
        compact: compactSearchText(field.text)
      };
    });
  }

  function scoreIssueSearch(issue, value) {
    var parts = searchQueryParts(value);
    var groups = parts.phrases.map(function (phrase) {
      return { value: phrase, exact: true, label: "“" + phrase + "”" };
    }).concat(parts.tokens.map(function (token) {
      var variants = searchVariants(token);
      return { value: token, exact: false, label: variants.label, variants: variants.terms };
    }));
    if (!groups.length) return null;
    var fields = issueSearchFields(issue);
    var score = 0;
    var matched = [];
    var matchedFields = [];
    var valid = groups.every(function (group) {
      var variants = group.exact ? [group.value] : group.variants;
      var best = null;
      variants.forEach(function (variant) {
        var normalized = normalizeSearchText(variant);
        var compact = compactSearchText(variant);
        fields.forEach(function (field) {
          var exactPhrase = field.text.indexOf(normalized) !== -1;
          var compactHit = compact && field.compact.indexOf(compact) !== -1;
          if (!exactPhrase && !compactHit) return;
          var candidateScore = field.weight + (exactPhrase ? 5 : 2);
          if (normalized === normalizeSearchText(group.value)) candidateScore += 3;
          if (!best || candidateScore > best.score) {
            best = { score: candidateScore, field: field.label, variant: variant };
          }
        });
      });
      if (!best) return false;
      score += best.score;
      matched.push(group.label);
      if (matchedFields.indexOf(best.field) === -1) matchedFields.push(best.field);
      return true;
    });
    if (!valid) return null;
    if (normalizeSearchText(issue.title).indexOf(normalizeSearchText(value)) !== -1) score += 12;
    score += Math.max(0, 5 - Math.floor((Date.now() - new Date(issue.publishedAt).getTime()) / 86400000));
    return { score: score, matched: matched, fields: matchedFields };
  }

  function matchesBrowseFilters(issue) {
    var date = issue.publishedAt || issue.periodEnd;
    return (!dateFrom.value || date >= dateFrom.value) &&
      (!dateTo.value || date <= dateTo.value) &&
      (!selectedCompetitor || (issue.competitors || []).indexOf(selectedCompetitor) !== -1) &&
      (!selectedTopic || (issue.tags || []).indexOf(selectedTopic) !== -1);
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
    if (searchSubmitted && search.value.trim()) params.set("q", search.value.trim());
    if (dateFrom.value) params.set("from", dateFrom.value);
    if (dateTo.value) params.set("to", dateTo.value);
    if (selectedCompetitor) params.set("competitor", selectedCompetitor);
    if (selectedTopic) params.set("topic", selectedTopic);
    var query = params.toString();
    window.history.replaceState({}, "", query ? "?" + query : window.location.pathname);
  }

  function matchesFilters(issue) {
    return matchesBrowseFilters(issue) &&
      (!searchSubmitted || !search.value.trim() || scoreIssueSearch(issue, search.value));
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

  function searchSignalMatches(issue, value) {
    var parts = searchQueryParts(value);
    var groups = parts.phrases.map(function (phrase) {
      return { value: phrase, exact: true };
    }).concat(parts.tokens.map(function (token) {
      var variants = searchVariants(token);
      return { value: token, exact: false, variants: variants.terms };
    }));
    if (!groups.length) return [];
    return (issue.highlights || []).map(function (item, index) {
      var text = normalizeSearchText([
        item.competitor,
        item.action,
        item.impact,
        item.evidence
      ].join(" "));
      var compact = compactSearchText(text);
      var matched = groups.filter(function (group) {
        var variants = group.exact ? [group.value] : group.variants;
        return variants.some(function (variant) {
          return text.indexOf(normalizeSearchText(variant)) !== -1 ||
            compact.indexOf(compactSearchText(variant)) !== -1;
        });
      });
      return matched.length ? { item: item, index: index, count: matched.length } : null;
    }).filter(Boolean).sort(function (a, b) {
      return b.count - a.count || a.index - b.index;
    }).slice(0, 3);
  }

  function renderSearchResults() {
    if (!searchSubmitted) {
      searchResultsPanel.hidden = true;
      searchResultList.innerHTML = "";
      searchEmpty.hidden = true;
      searchResultSummary.textContent = "—";
      return;
    }

    var keyword = search.value.trim();
    searchResultsPanel.hidden = false;
    if (!keyword) {
      searchResultHint.textContent = "请输入关键词后点击搜索，支持竞品别名、多个词组合和带引号的完整短语。";
      searchResultList.innerHTML = "";
      searchEmpty.hidden = false;
      searchEmpty.textContent = "请输入关键词后再开始检索。";
      searchResultSummary.textContent = "等待关键词";
      return;
    }

    var results = allIssues.map(function (issue) {
      var score = scoreIssueSearch(issue, keyword);
      return score ? {
        issue: issue,
        score: score,
        signals: searchSignalMatches(issue, keyword)
      } : null;
    }).filter(function (result) {
      return result && matchesBrowseFilters(result.issue);
    }).sort(function (a, b) {
      return b.score.score - a.score.score ||
        String(b.issue.publishedAt).localeCompare(String(a.issue.publishedAt));
    });

    searchResultHint.textContent = "已按相关度排序。支持 Alpha / AlphaGPT / AlphaClaw、幂律 / MeWork / MeFlow、PKULaw、小威 AI、WorkBuddy 等别名。";
    searchResultSummary.textContent = "找到 " + results.length + " 期";
    searchEmpty.hidden = results.length !== 0;
    searchEmpty.textContent = "没有找到匹配的周报，请换一个关键词试试。";
    searchResultList.innerHTML = results.map(function (result) {
      var issue = result.issue;
      var score = result.score;
      var signalLinks = result.signals.map(function (match) {
        var item = match.item;
        return '<a class="search-result-signal" href="' +
          viewerSignalHref(issue, item.competitor, item.action) + '">' +
          escapeHtml(item.competitor + " · " + item.action) + ' ↗</a>';
      }).join("");
      var signals = signalLinks
        ? '<div class="search-result-signals"><span>相关动态</span>' + signalLinks + '</div>'
        : "";
      return [
        '<article class="search-result-item">',
          '<div class="search-result-meta">',
            '<span>' + escapeHtml(issue.period) + '</span>',
            '<span>相关度 ' + escapeHtml(score.score) + '</span>',
          '</div>',
          '<div class="search-result-content">',
            '<h4>' + escapeHtml(issue.title) + '</h4>',
            '<p>' + escapeHtml(issue.summary) + '</p>',
            '<div class="search-result-match">命中：' +
              escapeHtml(score.matched.join("、")) +
              ' · ' + escapeHtml(score.fields.join("、")) + '</div>',
            signals,
            '<a class="search-result-open" href="' + viewerHref(issue) + '">打开本期周报 <span aria-hidden="true">↗</span></a>',
          '</div>',
        '</article>'
      ].join("");
    }).join("");
  }

  function signalPriority(signal) {
    if (signal.highlight.priority) return signal.highlight.priority;
    return signal.index < 2 ? "P0" : "P1";
  }

  function renderDashboard(latest) {
    var highlights = (latest && latest.highlights) || [];
    var priorityCount = highlights.filter(function (item, index) {
      return signalPriority({ highlight: item, index: index }) === "P0";
    }).length;
    var reviewCount = highlights.filter(function (item) {
      return String(item.evidence || "").indexOf("待") !== -1 ||
        String(item.impact || "").indexOf("待") !== -1;
    }).length;
    var competitors = (latest && latest.competitors) || [];
    var dashboardPeriod = document.getElementById("dashboard-period");
    if (dashboardPeriod) dashboardPeriod.textContent = latest ? latest.period : "—";
    document.getElementById("metric-signal-count").textContent = highlights.length;
    document.getElementById("metric-priority-count").textContent = priorityCount;
    document.getElementById("metric-competitor-count").textContent = competitors.length;
    document.getElementById("metric-review-count").textContent = reviewCount;

    if (focusList) {
      focusList.innerHTML = highlights.slice(0, 5).map(function (item, index) {
        var priority = signalPriority({ highlight: item, index: index });
        return '<a class="focus-item" href="' + viewerSignalHref(latest, item.competitor, item.action) + '">' +
          '<span class="priority-badge priority-' + escapeHtml(priority.toLowerCase()) + '">' + escapeHtml(priority) + '</span>' +
          '<span class="focus-copy"><strong>' + escapeHtml(item.competitor) + ' · ' + escapeHtml(item.action) + '</strong>' +
          '<small>' + escapeHtml(item.impact) + '</small></span><span class="focus-arrow" aria-hidden="true">→</span>' +
        '</a>';
      }).join("");
    }
    var defaultFocus = latest && latest.decisionSummary;
    document.getElementById("dashboard-focus").textContent =
      (defaultFocus && defaultFocus.focus) || (highlights[0] ? highlights[0].impact : "本期暂无摘要。");
    document.getElementById("dashboard-risk").textContent =
      (defaultFocus && defaultFocus.risk) || "优先核验重点动态的原始来源与发布日期。";
    document.getElementById("dashboard-action").textContent =
      (defaultFocus && defaultFocus.action) || "进入竞品档案，沿时间线继续观察同一竞品。";
  }

  function renderProfiles(profiles) {
    profileCardGrid.innerHTML = profiles.filter(function (profile) {
      return trackedCompetitors.indexOf(profile.name) !== -1;
    }).map(function (profile) {
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
    renderSearchResults();
    archiveSection.hidden = searchSubmitted && Boolean(search.value.trim());
    var parts = ["显示 " + filtered.length + " / " + allIssues.length + " 期"];
    if (searchSubmitted && search.value.trim()) parts.push("已提交搜索");
    if (selectedCompetitor) parts.push(selectedCompetitor);
    if (selectedTopic) parts.push(selectedTopic);
    filterSummary.textContent = parts.join(" · ");
    syncQueryState();
  }

  function populateFilterValues(issues) {
    var competitors = trackedCompetitors.slice();
    var topics = [];
    issues.forEach(function (issue) {
      (issue.tags || []).forEach(function (item) {
        if (topics.indexOf(item) === -1) topics.push(item);
      });
    });
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
    selectedCompetitor = trackedCompetitors.indexOf(state.competitor) !== -1
      ? state.competitor
      : "";
    selectedTopic = state.topic;
    searchSubmitted = Boolean(state.keyword.trim());
  }

  function setupEvents() {
    searchForm.addEventListener("submit", function (event) {
      event.preventDefault();
      searchSubmitted = true;
      applyFilters();
    });
    search.addEventListener("input", function () {
      searchSubmitted = false;
      applyFilters();
    });
    [dateFrom, dateTo].forEach(function (element) {
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
      searchSubmitted = false;
      populateFilterValues(allIssues);
      applyFilters();
    });
  }

  Promise.all([
    fetch("data/issues.json?v=20260904-1").then(function (response) {
      if (!response.ok) throw new Error("issues.json unavailable");
      return response.json();
    }),
    fetch("data/site-config.json").then(function (response) {
      return response.ok ? response.json() : {};
    }),
    fetch("data/competitors.json?v=20260828-8").then(function (response) {
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
    renderDashboard(latest);
    applyFilters();
  }).catch(function () {
    list.innerHTML = '<div class="empty-state">周报目录暂时无法加载，请确认网站通过 HTTP 服务打开。</div>';
    filterSummary.textContent = "目录加载失败";
  });
})();
