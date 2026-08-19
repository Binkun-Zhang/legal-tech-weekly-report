(function () {
  var list = document.getElementById("archive-list");
  var empty = document.getElementById("empty-state");
  var search = document.getElementById("archive-search");

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderArchive(issues, keyword) {
    var filtered = issues.filter(function (issue) {
      var haystack = [
        issue.title,
        issue.period,
        issue.publishedAt,
        (issue.tags || []).join(" ")
      ].join(" ").toLowerCase();
      return haystack.indexOf(keyword.toLowerCase()) !== -1;
    });

    list.innerHTML = filtered.map(function (issue) {
      return [
        '<a class="archive-item" href="' + escapeHtml(issue.file) + '">',
          '<div class="archive-date">' + escapeHtml(issue.period) + '</div>',
          '<div>',
            '<h3>' + escapeHtml(issue.title) + '</h3>',
            '<p>' + escapeHtml(issue.summary) + '</p>',
          '</div>',
          '<div class="archive-open">查看周报 <span aria-hidden="true">↗</span></div>',
        '</a>'
      ].join("");
    }).join("");
    empty.hidden = filtered.length !== 0;
  }

  fetch("data/issues.json")
    .then(function (response) {
      if (!response.ok) throw new Error("issues.json unavailable");
      return response.json();
    })
    .then(function (issues) {
      if (!Array.isArray(issues) || issues.length === 0) throw new Error("No issues");
      issues.sort(function (a, b) {
        return String(b.publishedAt).localeCompare(String(a.publishedAt));
      });
      var latest = issues[0];

      document.getElementById("issue-count").textContent = issues.length;
      document.getElementById("latest-date").textContent = latest.publishedAt;
      document.getElementById("latest-period").textContent = latest.period;
      document.getElementById("latest-title").textContent = latest.title;
      document.getElementById("latest-summary").textContent = latest.summary;
      document.getElementById("latest-open-link").href = latest.file;
      document.getElementById("latest-action").href = latest.file;
      renderArchive(issues, "");

      search.addEventListener("input", function () {
        renderArchive(issues, search.value.trim());
      });
    })
    .catch(function () {
      list.innerHTML = '<div class="empty-state">周报目录暂时无法加载，请确认网站通过 HTTP 服务打开。</div>';
    });
})();
