(() => {
  'use strict';
  const api = window.LTW;
  if (!api) return;
  const esc = api.escape;
  let entries = new Map(), undoAction = null;
  const toast = document.createElement('div');
  toast.className = 'personal-notice';
  toast.hidden = true;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.append(toast);
  window.ltwNotice = (message, undo = null) => {
    undoAction = undo;
    toast.replaceChildren();
    const span = document.createElement('span'); span.textContent = message; toast.append(span);
    if (undo) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = '撤销';
      button.onclick = () => {try {undoAction?.(); window.ltwNotice('已撤销');} catch (e) {api.reportError(e);}};
      toast.append(button);
    }
    const close = document.createElement('button'); close.type = 'button'; close.textContent = '关闭';
    close.setAttribute('aria-label', '关闭提示'); close.onclick = () => toast.hidden = true; toast.append(close);
    toast.hidden = false;
  };
  addEventListener('ltw:error', e => window.ltwNotice('未能保存：' + e.detail));
  api.controls = entry => {
    const on = !!api.state()[entry.id]?.favorite;
    return `<button class="entry-star" type="button" data-personal-controls="${esc(entry.id)}" data-entry-action="favorite" data-entry-id="${esc(entry.id)}" aria-pressed="${on}" aria-label="${on ? '取消收藏：' : '收藏：'}${esc(entry.title)}" title="${on ? '取消收藏' : '收藏'}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 3 2.78 5.63 6.22.9-4.5 4.39 1.06 6.19L12 17.19l-5.56 2.92L7.5 13.92 3 9.53l6.22-.9Z"/></svg></button>`;
  };
  function refreshButtons() {
    const state = api.state();
    document.querySelectorAll('[data-entry-action="favorite"]').forEach(b => {
      const on = !!state[b.dataset.entryId]?.favorite, entry = entries.get(b.dataset.entryId) || state[b.dataset.entryId]?.snapshot;
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', (on ? '取消收藏：' : '收藏：') + (entry?.title || '本条资讯'));
      b.title = on ? '取消收藏' : '收藏';
    });
    updateSummary();
  }
  function updateSummary() {
    const slot = document.getElementById('personal-overview');
    if (!slot) return;
    const state = api.state(), subs = api.subscriptions().filter(s => s.enabled), unread = api.feed().filter(e => !state[e.id]?.read).length;
    slot.querySelector('[data-personal-saved]').textContent = Object.values(state).filter(s => s.favorite).length + api.issues().length;
    slot.querySelector('[data-personal-unread]').textContent = unread;
    slot.querySelector('[data-personal-subcount]').textContent = subs.length;
    slot.querySelector('[data-personal-status]').textContent = subs.length ? '仅展示已发布周报中的订阅记录' : '选择你想跟进的竞品，下次访问时查看相关更新';
  }
  function mountReport() {
    if (!document.getElementById('reportContent')) return;
    document.querySelectorAll('#reportContent tr[data-personal-entry]').forEach(row => {
      const entry = entries.get(row.dataset.personalEntry);
      if (!entry || row.querySelector('.entry-star')) return;
      const cells = [...row.cells];
      let cell = cells.find(c => /本周具体动作|推文摘要|主要功能|政策或|标题|文章\s*\/|核心 Skill|项目\s*\//.test(c.dataset.label || ''));
      if (!cell) cell = entry.sectionId === 'industry' && !cells[0].querySelector('strong') ? cells[1] : cells[0];
      cell?.insertAdjacentHTML('afterbegin', api.controls(entry));
    });
    const sidebar = document.querySelector('.site-reader-links');
    if (sidebar && !sidebar.querySelector('[data-personal-nav]')) sidebar.insertAdjacentHTML('beforeend', `<a data-personal-nav href="${esc(api.url('workspace.html#subscriptions'))}">我的竞品订阅</a>`);
    window.dispatchEvent(new Event('ltw:controls-ready'));
  }
  function refreshFollows() {
    const subs = api.subscriptions();
    document.querySelectorAll('[data-follow]').forEach(b => {
      const c = api.catalogue?.competitors.find(c => c.id === b.dataset.follow);
      const on = subs.some(s => s.competitor === b.dataset.follow && s.enabled);
      b.setAttribute('aria-pressed', String(on));
      b.textContent = on ? '已订阅动态' : '订阅动态';
      b.setAttribute('aria-label', (on ? '取消订阅 ' : '订阅 ') + (c?.name || b.dataset.follow));
    });
  }
  function mountDialog() {
    const body = document.getElementById('dialogBody');
    if (!body || body.querySelector('[data-personal-controls]')) return;
    const links = [...body.querySelectorAll('a[href]')].map(a => a.href);
    const entry = [...entries.values()].find(e => links.includes(api.url(e.href)));
    if (entry) body.insertAdjacentHTML('afterbegin', api.controls(entry));
  }
  function mountCompetitor() {
    if (!document.body.classList.contains('competitor-page')) return;
    if (document.querySelector('[data-profile-subscription]')) return;
    const value = (document.getElementById('competitor-name')?.textContent || new URLSearchParams(location.search).get('name') || '').toLowerCase();
    const competitor = api.catalogue.competitors.find(c => [c.name, ...c.aliases].some(n => n.toLowerCase() === value));
    if (!competitor) return;
    const slot = document.createElement('div'); slot.className = 'issue-follow-controls'; slot.dataset.profileSubscription = 'true';
    slot.innerHTML = `<button type="button" data-follow="${esc(competitor.id)}">订阅 ${esc(competitor.name)}</button><a href="${esc(api.url('workspace.html#subscriptions'))}">管理竞品订阅 →</a>`;
    document.querySelector('.profile-meta').after(slot);refreshFollows();
  }
  function readingContinuity() {
    const data = document.getElementById('issue-data');
    if (!data) {
      const saved = api.read(api.keys.reading, {}), last = saved[saved._latest];
      const overview = document.querySelector('.personal-overview-links');
      if (last && overview) {
        const link = document.createElement('a');
        link.href = api.url('issues/' + saved._latest + '.html?resume=1');
        link.textContent = '继续上次阅读 →'; overview.append(link);
      }
      return;
    }
    const issue = JSON.parse(data.textContent), saved = api.read(api.keys.reading, {})[issue.id];
    let resuming = false, timer = null, failed = false;
    const selectedMode = () => document.querySelector('[data-reading-mode][aria-pressed="true"]')?.dataset.readingMode || 'table';
    function restore() {
      if (!saved) return;
      resuming = true;
      const search = document.getElementById('report-search');
      if (search.value) {search.value = '';search.dispatchEvent(new Event('input'));}
      document.querySelector(`[data-reading-mode="${saved.mode || 'table'}"]`)?.click();
      requestAnimationFrame(() => {
        const target = saved.mode === 'table' ? document.getElementById(saved.anchor) : null;
        const panel = target?.closest('[data-view-panel]');
        if (panel) document.querySelector(`[data-view="${panel.dataset.viewPanel}"]`)?.click();
        if (target) {target.scrollIntoView({block: 'start'});target.classList.add('entry-focus');}
        else scrollTo({top: saved.y || 0, behavior: 'instant'});
        setTimeout(() => resuming = false, 200);
      });
    }
    if (saved && saved.y > 150) {
      const button = document.createElement('button');button.type = 'button';button.id = 'resume-reading';
      button.textContent = `继续上次阅读${saved.progress ? '（' + saved.progress + '%）' : ''}`;
      button.onclick = restore; document.querySelector('.site-issue-tools>div:last-child').prepend(button);
      if (new URLSearchParams(location.search).get('resume') === '1') setTimeout(restore, 150);
    }
    function remember() {
      if (resuming || failed || scrollY < 150) return;
      let anchor = '';
      if (selectedMode() === 'table') {
        for (const row of document.querySelectorAll('#reportContent tr[data-personal-entry]')) {
          if (!row.getClientRects().length) continue;
          if (row.getBoundingClientRect().top <= 180) anchor = row.id;
        }
      }
      const max = document.documentElement.scrollHeight - innerHeight;
      try {api.rememberReading(issue.id, {anchor, y: scrollY, mode: selectedMode(), progress: max > 0 ? Math.min(100, Math.round(scrollY / max * 100)) : 0, savedAt: new Date().toISOString()});}
      catch (error) {failed = true;api.reportError(error);}
    }
    addEventListener('scroll', () => {clearTimeout(timer);timer = setTimeout(remember, 600);}, {passive: true});
    addEventListener('pagehide', remember);
  }
  api.onChange(() => {refreshButtons(); refreshFollows();});
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-entry-action]');
    if (b) {
      const entry = entries.get(b.dataset.entryId) || api.state()[b.dataset.entryId]?.snapshot;
      e.preventDefault(); e.stopPropagation();
      if (!entry) return;
      try {
        const field = b.dataset.entryAction, before = api.state()[entry.id]?.[field] || false;
        const on = api.toggle(entry, field);
        window.ltwNotice(on ? '已加入我的收藏' : '已取消收藏', () => api.updateEntry(entry, {[field]: before}));
      } catch (error) {api.reportError(error);}
    }
    const follow = e.target.closest('[data-follow]');
    if (follow) {
      const id = follow.dataset.follow, current = api.subscriptions().find(s => s.competitor === id);
      e.preventDefault();
      if (current?.enabled) {try {const undo = api.removeSubscription(current.id);window.ltwNotice('已取消订阅', undo);} catch (error) {api.reportError(error);}return;}
      try {
        const since = new Date(api.catalogue.latestIssueDate + 'T00:00:00Z'); since.setUTCDate(since.getUTCDate() - 30);
        api.saveSubscription({...current, competitor: id, enabled: true, scope: current?.scope || 'moves', since: current?.since ?? since.toISOString().slice(0, 10), keywords: current?.keywords || ''});
        window.ltwNotice('已订阅该竞品动态；可在工作台调整起始日期和关键词');
      } catch (error) {api.reportError(error);}
    }
  });
  addEventListener('ltw:profiles-ready', refreshFollows);
  addEventListener('ltw:competitor-ready', () => {if (api.catalogue) mountCompetitor();});
  window.ltwReady = api.load().then(data => {
    entries = new Map(data.entries.map(e => [e.id, e]));
    mountReport();mountCompetitor();readingContinuity();refreshButtons();refreshFollows();
    const dialog = document.getElementById('dialogBody');
    if (dialog) {new MutationObserver(mountDialog).observe(dialog, {childList: true});mountDialog();}
    return data;
  }).catch(error => {
    const slot = document.getElementById('personal-overview');
    if (slot) {
      slot.querySelector('[data-personal-status]').textContent = '订阅记录加载失败，请到工作台重试；本机收藏仍然保留';
      slot.querySelector('[data-personal-unread]').textContent = '—';
    } else if (document.getElementById('reportContent')) {
      const region = document.createElement('p'); region.className = 'reading-note';
      region.textContent = '个人收藏功能暂时未能加载，';
      const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = '重试';
      retry.onclick = async () => {try {const d = await api.load(true); entries = new Map(d.entries.map(e => [e.id, e]));mountReport();region.remove();} catch (e) {window.ltwNotice(e.message);}};
      region.append(retry); document.querySelector('.reader-controls').after(region);
    }
    return null;
  });
})();
