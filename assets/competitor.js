(function () {
  var name = new URLSearchParams(window.location.search).get("name") || "";
  var profileName = document.getElementById("competitor-name");
  var timeline = document.getElementById("timeline");
  var note = document.getElementById("competitor-note");
  var status = document.getElementById("competitor-note-status");
  var currentProfile;
  var issues = [];
  var glossary = [];

  function escapeHtml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function viewerHref(file) {
    return "view.html?issue=" + encodeURIComponent(file);
  }

  function noteKey() {
    return "legal-tech-weekly:competitor-note:" + currentProfile.slug;
  }

  function renderTerms() {
    var terms = currentProfile.glossary || [];
    document.getElementById("glossary-terms").innerHTML = terms.map(function (term) {
      return '<button class="term-button" type="button" data-term="' + escapeHtml(term) + '">' +
        escapeHtml(term) + '</button>';
    }).join("");
  }

  function renderTimeline() {
    var rows = [];
    issues.forEach(function (issue) {
      (issue.highlights || []).filter(function (item) {
        return item.competitor === currentProfile.name;
      }).forEach(function (item) {
        rows.push({ issue: issue, item: item });
      });
    });
    rows.sort(function (a, b) {
      return String(b.issue.publishedAt).localeCompare(String(a.issue.publishedAt));
    });
    timeline.innerHTML = rows.map(function (row) {
      return '<article class="timeline-item">' +
        '<div class="timeline-date">' + escapeHtml(row.issue.period) + '</div>' +
        '<div class="timeline-marker" aria-hidden="true"></div>' +
        '<div class="timeline-content">' +
          '<div class="timeline-label">' + escapeHtml(row.item.evidence || "来源待补") + '</div>' +
          '<h3>' + escapeHtml(row.item.action) + '</h3>' +
          '<p>' + escapeHtml(row.item.impact) + '</p>' +
          '<div class="timeline-actions">' +
            '<a class="text-link" href="' + viewerHref(row.issue.file) + '&from=competitor&name=' +
              encodeURIComponent(currentProfile.name) + '">查看原周报并定位 ↗</a>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join("");
    document.getElementById("timeline-empty").hidden = rows.length !== 0;
    document.getElementById("competitor-signal-count").textContent = rows.length;
  }

  function loadData() {
    return Promise.all([
      fetch("data/competitors.json").then(function (r) { return r.json(); }),
      fetch("data/issues.json").then(function (r) { return r.json(); }),
      fetch("data/glossary.json").then(function (r) { return r.json(); })
    ]).then(function (data) {
      var profiles = data[0];
      issues = data[1];
      glossary = data[2];
      currentProfile = profiles.find(function (profile) {
        return profile.name === name || profile.slug === name;
      }) || profiles[0];
      profileName.textContent = currentProfile.name;
      document.getElementById("competitor-positioning").textContent = currentProfile.positioning;
      document.getElementById("competitor-audience").textContent = currentProfile.audience;
      document.getElementById("competitor-intro").textContent = currentProfile.intro || "暂无竞品介绍。";
      var source = document.getElementById("competitor-source");
      source.href = currentProfile.sourceUrl || "#";
      source.textContent = "查看 " + (currentProfile.sourceLabel || "来源") + " ↗";
      document.getElementById("capabilities").innerHTML = currentProfile.capabilities.map(function (capability) {
        return '<span class="capability-chip">' + escapeHtml(capability) + '</span>';
      }).join("");
      document.getElementById("advantage").textContent = currentProfile.advantage;
      document.getElementById("weakness").textContent = currentProfile.weakness;
      document.getElementById("threat").textContent = currentProfile.threat;
      document.getElementById("watch").textContent = currentProfile.watch;
      document.title = currentProfile.name + "竞品档案｜法律科技竞品监控周报";
      note.value = localStorage.getItem(noteKey()) || "";
      renderTerms();
      renderTimeline();
    });
  }

  document.addEventListener("click", function (event) {
    var termButton = event.target.closest("[data-term]");
    if (!termButton) return;
    var entry = glossary.find(function (item) { return item.term === termButton.dataset.term; });
    document.getElementById("glossary-box").textContent = entry ? entry.definition : "暂无解释";
  });

  document.getElementById("save-competitor-note").addEventListener("click", function () {
    if (!currentProfile) return;
    localStorage.setItem(noteKey(), note.value);
    status.textContent = "已保存到本机";
    window.setTimeout(function () { status.textContent = ""; }, 1800);
  });

  loadData().catch(function () {
    profileName.textContent = "竞品档案加载失败";
  });
})();
