/* Shared, browser-local research state. No account or private data is sent to a server. */
(() => {
  'use strict';
  const keys = {
    entries: 'legal-tech-weekly:entry-state:v1',
    subscriptions: 'legal-tech-weekly:subscriptions:v1',
    topics: 'legal-tech-weekly:topics',
    issues: 'legal-tech-weekly:issue-favorites',
    checked: 'legal-tech-weekly:subscription-check:v1',
    reading: 'legal-tech-weekly:reading:v1',
    views: 'legal-tech-weekly:workspace-views:v1',
    albums: 'legal-tech-weekly:albums:v1'
  };
  const script = document.currentScript;
  const base = new URL('../', script.src);
  const defaults = ['未分类', '合同审核', '法律文书起草', '法律 Agent', 'MCP 与法律知识库', '法律 AI 合规与责任'];
  let catalogue = null, pending = null, channel = null, legacyFavorites = null;
  const listeners = new Set();
  function read(key, fallback) {
    const raw = localStorage.getItem(key);
    if (!raw) return structuredClone(fallback);
    const value = JSON.parse(raw);
    if (Array.isArray(fallback) ? !Array.isArray(value) : !value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('本机数据格式异常，已停止覆盖。');
    }
    return value;
  }
  function safeRead(key, fallback) {
    try { return read(key, fallback); }
    catch (e) { reportError(e); return structuredClone(fallback); }
  }
  function reportError(error) {
    window.dispatchEvent(new CustomEvent('ltw:error', {detail: error.message || '浏览器未允许保存，请检查网站存储权限。'}));
  }
  function notify(key, broadcast = true) {
    for (const callback of listeners) callback(key);
    window.dispatchEvent(new CustomEvent('ltw:change', {detail: key}));
    if (broadcast) channel?.postMessage({key});
    if (broadcast && key === keys.issues) legacyFavorites?.postMessage({type: 'favorites-updated'});
  }
  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    notify(key);
  }
  function mutate(key, fallback, callback) {
    const data = read(key, fallback); // Do not replace unreadable or corrupted existing data.
    const result = callback(data);
    write(key, data);
    return result;
  }
  try {
    channel = new BroadcastChannel('legal-tech-weekly:personalization');
    channel.addEventListener('message', e => notify(e.data.key, false));
  } catch {}
  try {
    legacyFavorites = new BroadcastChannel('legal-tech-weekly:favorites');
    legacyFavorites.addEventListener('message', () => notify(keys.issues, false));
  } catch {}
  addEventListener('storage', e => { if (Object.values(keys).includes(e.key) || e.key === null) notify(e.key, false); });
  function snapshot(entry) {
    const {id, title, summary, section, sectionId, competitors, period, issueId, issueDate, issueFile, anchor, href, sources} = entry;
    return {id, title, summary, section, sectionId, competitors, period, issueId, issueDate, issueFile, anchor, href, sources};
  }
  function updateEntry(entryOrId, patch) {
    const entry = typeof entryOrId === 'string' ? catalogue?.entries.find(e => e.id === entryOrId) : entryOrId;
    const id = typeof entryOrId === 'string' ? entryOrId : entryOrId.id;
    return mutate(keys.entries, {}, data => {
      const current = data[id] || {topic: '未分类', note: ''};
      data[id] = {...current, ...patch, ...(entry ? {snapshot: snapshot(entry)} : {})};
      return data[id];
    });
  }
  function batchEntries(list, patch) {
    mutate(keys.entries, {}, data => {
      for (const entry of list) {
        data[entry.id] = {...(data[entry.id] || {topic: '未分类', note: ''}), ...patch, snapshot: snapshot(entry)};
      }
    });
  }
  function toggle(entry, field) {
    let on;
    mutate(keys.entries, {}, data => {
      const current = data[entry.id] || {topic: '未分类', note: ''};
      on = !current[field];
      data[entry.id] = {...current, [field]: on, snapshot: snapshot(entry)};
      if (on && field === 'favorite') data[entry.id].savedAt = new Date().toISOString();
      if (on && field === 'queue') data[entry.id].queuedAt = new Date().toISOString();
    });
    return on;
  }
  function topicList() { return [...new Set([...defaults, ...safeRead(keys.topics, [])])]; }
  function addTopic(name) {
    name = name.trim().slice(0, 40);
    if (!name) throw new Error('请填写专题名称。');
    mutate(keys.topics, [], topics => { if (!topics.includes(name) && !defaults.includes(name)) topics.push(name); });
  }
  function removeTopic(name) {
    if (defaults.includes(name)) throw new Error('默认专题不能删除。');
    const entries = read(keys.entries, {});
    const issues = read(keys.issues, []);
    if (Object.values(entries).some(x => x.topic === name && (x.favorite || x.queue)) || issues.some(x => x.topic === name)) throw new Error('请先将该专题的收藏或稍后读记录移到其他专题。');
    // Detached historical metadata is retained, but should not prevent deleting an empty topic.
    for (const item of Object.values(entries)) if (item.topic === name) item.topic = '未分类';
    write(keys.entries, entries);
    const topics = read(keys.topics, []).filter(x => x !== name);
    write(keys.topics, topics);
  }
  async function load(force = false) {
    if (!force && catalogue) return catalogue;
    if (pending) return pending;
    pending = (async () => {
      const response = await fetch(new URL('data/entries.json', base), {cache: 'no-store'});
      if (!response.ok) throw new Error('资讯索引加载失败，请重试。');
      const value = await response.json();
      if (value.schemaVersion !== 1 || !Array.isArray(value.entries) || !Array.isArray(value.competitors)) throw new Error('资讯索引格式异常。');
      catalogue = value;
      // A failed storage write must not hide successfully loaded public articles.
      try { write(keys.checked, {at: new Date().toISOString(), version: value.version, latestIssueDate: value.latestIssueDate}); } catch (e) { reportError(e); }
      return value;
    })().finally(() => { pending = null; });
    return pending;
  }
  function subscriptionMatches(entry, subscription) {
    if (!subscription.enabled || !(entry.competitors || []).includes(subscription.competitor)) return false;
    if (subscription.scope === 'moves' && entry.sectionId !== 'moves') return false;
    if (subscription.since && entry.issueDate < subscription.since) return false;
    const words = (subscription.keywords || '').split(/[,，、\n]/).map(x => x.trim().toLowerCase()).filter(Boolean);
    return !words.length || words.some(x => (entry.title + ' ' + entry.summary).toLowerCase().includes(x));
  }
  function feed() {
    const subscriptions = safeRead(keys.subscriptions, []);
    return (catalogue?.entries || []).filter(e => subscriptions.some(s => subscriptionMatches(e, s)));
  }
  function saveSubscription(value) {
    mutate(keys.subscriptions, [], data => {
      const i = data.findIndex(x => x.competitor === value.competitor);
      const current = i >= 0 ? data[i] : {id: value.competitor, createdAt: new Date().toISOString()};
      const updated = {...current, ...value};
      if (i < 0) data.push(updated); else data[i] = updated;
    });
  }
  function removeSubscription(id) {
    const values = read(keys.subscriptions, []);
    const existing = values.find(x => x.id === id);
    write(keys.subscriptions, values.filter(x => x.id !== id));
    return () => { if (existing) mutate(keys.subscriptions, [], list => { if (!list.some(x => x.id === id)) list.push(existing); }); };
  }
  function issueUpdate(key, patch) {
    mutate(keys.issues, [], list => {
      const i = list.findIndex(x => x.key === key);
      if (i >= 0) Object.assign(list[i], patch);
    });
  }
  function removeItems(items, field) {
    // Keep notes, classification, read state and queue/favorite state independent.
    const previous = read(keys.entries, {});
    const before = items.map(e => ({id: e.id, value: previous[e.id]?.[field] || false}));
    batchEntries(items, {[field]: false});
    return () => mutate(keys.entries, {}, data => { for (const item of before) {
      if (!data[item.id]?.[field]) data[item.id] = {...data[item.id], [field]: item.value};
    } });
  }
  function albumName(value) {
    const name = String(value || '').trim().slice(0, 40);
    if (!name) throw new Error('请填写专辑名称。');
    return name;
  }
  function saveAlbum(name, id = null) {
    name = albumName(name);
    return mutate(keys.albums, [], list => {
      if (list.some(a => a.id !== id && a.name.toLowerCase() === name.toLowerCase())) throw new Error('已有同名专辑。');
      if (id) {
        const album = list.find(a => a.id === id);
        if (!album) throw new Error('该专辑已删除，请重新选择。');
        album.name = name;
        return id;
      }
      id = 'album-' + (crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2));
      list.push({id, name, itemKeys: [], createdAt: new Date().toISOString()});
      return id;
    });
  }
  function albumItems(id, itemKeys, remove = false) {
    mutate(keys.albums, [], list => {
      const album = list.find(a => a.id === id);
      if (!album) throw new Error('该专辑已删除，请重新选择。');
      const set = new Set(album.itemKeys || []);
      for (const key of itemKeys) remove ? set.delete(key) : set.add(key);
      album.itemKeys = [...set];
    });
  }
  function deleteAlbum(id) {
    const existing = read(keys.albums, []).find(a => a.id === id);
    mutate(keys.albums, [], list => {const i = list.findIndex(a => a.id === id); if (i >= 0) list.splice(i, 1);});
    return () => {if (existing) mutate(keys.albums, [], list => {if (!list.some(a => a.id === id)) list.push(existing);});};
  }
  window.LTW = {
    base, keys, defaults, read: safeRead, load, get catalogue() {return catalogue;},
    state: () => safeRead(keys.entries, {}), subscriptions: () => safeRead(keys.subscriptions, []),
    topics: topicList, addTopic, removeTopic, updateEntry, batchEntries, toggle,
    albums: () => safeRead(keys.albums, []), saveAlbum, albumItems, deleteAlbum,
    feed, subscriptionMatches, saveSubscription, removeSubscription, removeItems,
    issues: () => safeRead(keys.issues, []), issueUpdate,
    removeIssue(key) {
      let saved;
      mutate(keys.issues, [], list => {const i = list.findIndex(x => x.key === key); if (i >= 0) saved = list.splice(i, 1)[0];});
      return () => {if (saved) mutate(keys.issues, [], list => {if (!list.some(x => x.key === key)) list.push(saved);});};
    },
    onChange(callback) {listeners.add(callback); return () => listeners.delete(callback);},
    rememberReading(issueId, value) {
      const all = read(keys.reading, {}); all[issueId] = value; all._latest = issueId;
      localStorage.setItem(keys.reading, JSON.stringify(all));
    },
    saveView(panel, value) {
      const all = read(keys.views, {}); all[panel] = value;
      localStorage.setItem(keys.views, JSON.stringify(all));
    },
    reportError, url: path => new URL(path, base).href,
    escape: s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]))
  };
})();
