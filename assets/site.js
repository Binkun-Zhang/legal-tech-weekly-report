(function () {
  var list = document.getElementById('archive-list'), empty = document.getElementById('empty-state');
  var focusList = document.getElementById('focus-list'), profileCardGrid = document.getElementById('profile-card-grid');
  var allIssues = [], trackedCompetitors = ['Alpha AI','幂律智能','北大法宝','威科先行','WorkBuddy'];
  var favoriteStorageKey = 'legal-tech-weekly:issue-favorites', favoriteChannel = null;
  try {favoriteChannel = new BroadcastChannel('legal-tech-weekly:favorites');} catch {}
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

  function competitorHref(name) {
    return "competitor.html?name=" + encodeURIComponent(name);
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
      return '<article class="profile-card"><a class="profile-card-main" href="' + competitorHref(profile.name) + '">' +
        '<div class="profile-card-top"><span class="profile-card-mark">' +
          escapeHtml(profile.name.slice(0, 1)) + '</span><span class="profile-card-count">' +
          count + ' 条动态</span></div>' +
        '<h3>' + escapeHtml(profile.name) + '</h3>' +
        '<p>' + escapeHtml(profile.positioning) + '</p>' +
        '<div class="mini-chip-list">' + profile.capabilities.slice(0, 4).map(function (capability) {
          return '<span class="mini-chip">' + escapeHtml(capability) + '</span>';
        }).join("") + '</div>' +
        '<span class="profile-card-link">查看竞品档案 ↗</span>' +
      '</a><div class="profile-subscribe"><button type="button" data-follow="' + ({'Alpha AI':'alpha','幂律智能':'powerlaw','北大法宝':'pkulaw','威科先行':'wk','WorkBuddy':'workbuddy'}[profile.name]) + '" aria-pressed="false">订阅动态</button></div></article>';
    }).join("");
    window.dispatchEvent(new Event("ltw:profiles-ready"));
  }
  document.addEventListener('click', function(event) {
    var button = event.target.closest('[data-favorite-issue-id]');
    if (!button) return;
    event.preventDefault();
    var issue = allIssues.find(function(i) {return i.id === button.dataset.favoriteIssueId;});
    if (issue) try {toggleIssueFavorite(issue); updateFavoriteButton(button, issue);} catch(error) {window.LTW?.reportError(error);}
  });
  function refreshFavorites() {document.querySelectorAll('[data-favorite-issue-id]').forEach(function(b){var i=allIssues.find(function(i){return i.id===b.dataset.favoriteIssueId;});if(i)updateFavoriteButton(b,i);});}
  favoriteChannel?.addEventListener('message',refreshFavorites);
  addEventListener('storage',refreshFavorites);
  Promise.all([fetch('data/issues.json', {cache: 'no-store'}).then(r=>{if(!r.ok)throw new Error('目录加载失败');return r.json();}),fetch('data/competitors.json').then(r=>r.json())]).then(function(data) {
    allIssues = data[0].sort((a,b)=>String(b.publishedAt).localeCompare(String(a.publishedAt)));
    if (!allIssues.length) throw new Error('暂无周报');
    renderArchive(allIssues);renderProfiles(data[1]);
    var latest=allIssues[0];
    document.getElementById('issue-count').textContent=allIssues.length;
    document.getElementById('competitor-count').textContent=trackedCompetitors.length;
    document.getElementById('latest-date').textContent=latest.publishedAt;
    document.getElementById('latest-period').textContent=latest.period;
    document.getElementById('latest-title').textContent=latest.title;
    document.getElementById('latest-summary').textContent=latest.summary;
    document.getElementById('latest-open-link').href=viewerHref(latest);
    document.getElementById('latest-action').href=viewerHref(latest);
    var favorite=document.getElementById('latest-favorite');favorite.dataset.favoriteIssueId=latest.id;updateFavoriteButton(favorite,latest);
    renderDashboard(latest);
  }).catch(function(){list.innerHTML='<div class="empty-state">周报目录暂时无法加载，请刷新重试。</div>';});
})();
