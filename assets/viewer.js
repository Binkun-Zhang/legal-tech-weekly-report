(function () {
  var params = new URLSearchParams(window.location.search);
  var issueFile = params.get("issue") || "";
  var fromPage = params.get("from") || "";
  var fromCompetitor = params.get("name") || "";
  var frame = document.getElementById("issue-frame");
  var issueTitle = document.getElementById("issue-title");
  var issuePeriod = document.getElementById("issue-period");
  var publishedDate = document.getElementById("published-date");
  var viewCount = document.getElementById("view-count");
  var related = document.getElementById("related-issues");
  var config = null;
  var issues = [];
  var currentIssue = null;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function relativeViewer(file) {
    return "view.html?issue=" + encodeURIComponent(file);
  }

  function localViewKey(issue) {
    return "legal-tech-weekly:view:" + issue.id;
  }

  function updateLocalViewCount(issue) {
    if (config && config.views && config.views.provider === "vercount") {
      document.getElementById("analytics-note").textContent = "阅读统计：共享统计加载中";
      return 0;
    }
    var count = Number(localStorage.getItem(localViewKey(issue)) || "0") + 1;
    localStorage.setItem(localViewKey(issue), String(count));
    viewCount.textContent = count + " 次（本机）";
    return count;
  }

  function sendViewEvent(issue) {
    if (config && config.views && config.views.provider === "vercount") {
      window.setTimeout(function () {
        var pageCount = document.getElementById("vercount_value_page_pv");
        if (pageCount && pageCount.textContent && pageCount.textContent.indexOf("加载") === -1) {
          document.getElementById("analytics-note").textContent = "阅读统计：共享统计已接入";
        }
      }, 2200);
      return;
    }
    var apiUrl = config && config.views && config.views.apiUrl;
    if (!apiUrl) {
      document.getElementById("analytics-note").textContent = "阅读统计：当前显示本机次数";
      return;
    }
    var endpoint = apiUrl + (apiUrl.indexOf("?") === -1 ? "?" : "&") +
      "issue=" + encodeURIComponent(issue.id);
    fetch(endpoint, { method: "GET", mode: "cors" })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        if (data && typeof data.views === "number") {
          viewCount.textContent = data.views.toLocaleString() + " 次";
          document.getElementById("analytics-note").textContent = "阅读统计：已接入共享统计";
        }
      })
      .catch(function () {
        document.getElementById("analytics-note").textContent = "阅读统计：共享服务暂不可用，已保留本机次数";
      });
  }

  function renderRelated() {
    var names = (currentIssue.competitors || []).slice(0, 4);
    var candidates = issues.filter(function (issue) {
      return issue.id !== currentIssue.id &&
        names.some(function (name) {
          return (issue.competitors || []).indexOf(name) !== -1;
        });
    }).slice(0, 3);
    if (!candidates.length) {
      related.innerHTML = '<p class="muted-copy">新增周报后，这里会自动显示同一竞品的相关期次。</p>';
      return;
    }
    related.innerHTML = candidates.map(function (issue) {
      return '<a class="related-item" href="' + relativeViewer(issue.file) + '">' +
        '<span>' + escapeHtml(issue.period) + '</span>' +
        '<strong>' + escapeHtml(issue.title) + '</strong>' +
        '</a>';
    }).join("");
  }

  function loadGiscus() {
    var giscus = config && config.giscus;
    var target = document.getElementById("giscus-container");
    if (!giscus || !giscus.enabled || !giscus.repoId || !giscus.categoryId) {
      target.innerHTML =
        '<div class="integration-note">' +
          '<strong>评论区尚未启用</strong>' +
          '<p>当前可通过 GitHub Discussions 参与讨论。管理员配置 Giscus 后，评论会直接嵌入此处。</p>' +
        '</div>';
      return;
    }
    var script = document.createElement("script");
    script.src = giscus.src;
    script.async = true;
    script.crossOrigin = "anonymous";
    Object.keys(giscus).forEach(function (key) {
      if (key !== "enabled" && key !== "src") {
        script.setAttribute("data-" + key.replace(/[A-Z]/g, function (letter) {
          return "-" + letter.toLowerCase();
        }), giscus[key]);
      }
    });
    script.setAttribute("data-term", currentIssue.id);
    target.appendChild(script);
  }

  function init(issueData, siteConfig) {
    config = siteConfig || {};
    issues = issueData.sort(function (a, b) {
      return String(b.publishedAt).localeCompare(String(a.publishedAt));
    });
    currentIssue = issues.find(function (issue) {
      return issue.file === issueFile;
    }) || issues[0];
    if (!currentIssue) throw new Error("Issue not found");

    issueTitle.textContent = currentIssue.title;
    issuePeriod.textContent = currentIssue.period;
    publishedDate.textContent = currentIssue.publishedAt;
    document.title = currentIssue.title + "｜法律科技竞品监控周报";
    frame.src = currentIssue.file;
    if (fromPage === "competitor" && fromCompetitor) {
      var backButton = document.getElementById("back-home");
      backButton.href = "competitor.html?name=" + encodeURIComponent(fromCompetitor);
      backButton.textContent = "← 返回竞品档案";
      backButton.setAttribute("aria-label", "返回竞品档案");
    }
    document.getElementById("discussion-link").href = config.discussionUrl || "#";
    document.getElementById("report-button").href = config.reportUrl || "#";
    updateLocalViewCount(currentIssue);
    sendViewEvent(currentIssue);
    renderRelated();
    loadGiscus();
  }

  document.getElementById("back-home").addEventListener("click", function (event) {
    if (document.referrer && window.history.length > 1) {
      event.preventDefault();
      window.history.back();
    }
  });

  document.getElementById("share-button").addEventListener("click", function () {
    var shareData = { title: document.title, text: "法律科技竞品监控周报：" + (currentIssue ? currentIssue.period : ""), url: window.location.href };
    if (navigator.share) {
      navigator.share(shareData).catch(function () {});
      return;
    }
    navigator.clipboard.writeText(window.location.href).then(function () {
      this.textContent = "链接已复制";
      var button = this;
      window.setTimeout(function () { button.textContent = "分享本期"; }, 1600);
    }.bind(this)).catch(function () {});
  });

  Promise.all([
    fetch("data/issues.json").then(function (response) { return response.json(); }),
    fetch("data/site-config.json").then(function (response) { return response.json(); })
  ]).then(function (result) {
    init(result[0], result[1]);
  }).catch(function () {
    issueTitle.textContent = "周报加载失败";
    issuePeriod.textContent = "请从网站首页重新进入，或检查站点是否通过 HTTP 服务打开。";
  });
})();
