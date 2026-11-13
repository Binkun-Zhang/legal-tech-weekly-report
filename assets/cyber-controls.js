/* SIGNAL cyber controls v2 (2026-11-12).
   Decoration only: never intercept navigation, form submission, favorites or storage.
   1. Adds the shared control skin classes (cyber-button / cyber-field / cyber-segments).
   2. Gives every control a semantic neon icon (search = magnifier, favorite = star, subscribe = antenna...).
   3. Wraps trailing/leading arrow glyphs so they can be styled and animated.
   Icons are injected as <i class="cy-key"><svg class="cy-ico">…</svg></i>: no text is added, so
   textContent-based logic and label tests keep working; the icon ignores pointer events so
   handlers that read event.target still receive the button itself. */
(() => {
  'use strict';
  const candidates = 'button:not(#coreButton):not(#aboutButton):not(.device-shell):not(.entry-star):not(.source-thumb):not(.story):not([data-source-image]):not([data-album]):not([data-unfile]):not([data-news-index]),a.tool-button,a.primary-action,a.secondary-action,a.outline-button,a.read-button';
  const groupSelector = '.favorites-switch,.mode-switch,.view-tabs,.layout-picker';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let scheduled = false, frame = null;

  /* ---------- Icon library: 24×24 grid. p = primary stroke, a = accent stroke, af = accent fill,
     pf = primary fill, d = dim stroke, y = saved/yellow fill. Extra classes drive hover motion. ---------- */
  const STAR = 'M12 3.5 14.3 9.3 20.6 9.7 15.7 13.7 17.3 19.8 12 16.4 6.7 19.8 8.3 13.7 3.4 9.7 9.7 9.3Z';
  const FOLDER = 'M3 6.2h6.2l2 2.2H21V19H3z';
  const A_GLYPH = '<path class="p" d="M3.2 19.5 8.4 5.5h1.4l5.2 14"/><path class="p" d="M5.4 14.4h7.4"/>';
  const ICONS = {
    search: '<circle class="p" cx="10.5" cy="10.5" r="6.2"/><path class="p" d="M15.3 15.3 20.6 20.6" stroke-width="2.7"/><path class="a cy-scan" d="M7.3 10.5h6.4"/><path class="d" d="M8.3 7.6a3.4 3.4 0 0 1 2.4-1.1"/>',
    star: `<path class="p cy-pop" d="${STAR}"/><path class="a cy-twinkle" d="M20.4 2.4v3.2M18.8 4h3.2"/>`,
    'star-fill': `<path class="y cy-pop" d="${STAR}"/><path class="a cy-twinkle" d="M20.4 2.4v3.2M18.8 4h3.2"/><path class="a" d="M3.5 3.5l1.6 1.6"/>`,
    'star-off': `<path class="d" d="${STAR}"/><path class="a" d="M4 3.2 20.6 21"/>`,
    signal: '<circle class="pf" cx="12" cy="9.6" r="2"/><path class="p" d="M12 11.6V21M8.6 21h6.8"/><path class="p cy-w1" d="M8.6 6.2a4.8 4.8 0 0 0 0 6.8M15.4 6.2a4.8 4.8 0 0 1 0 6.8"/><path class="a cy-w2" d="M5.6 3.4a8.8 8.8 0 0 0 0 12.4M18.4 3.4a8.8 8.8 0 0 1 0 12.4"/>',
    'signal-on': '<circle class="af" cx="12" cy="9.6" r="2.3"/><path class="p" d="M12 11.6V21M8.6 21h6.8"/><path class="a cy-w1 cy-live" d="M8.6 6.2a4.8 4.8 0 0 0 0 6.8M15.4 6.2a4.8 4.8 0 0 1 0 6.8"/><path class="a cy-w2 cy-live" d="M5.6 3.4a8.8 8.8 0 0 0 0 12.4M18.4 3.4a8.8 8.8 0 0 1 0 12.4"/>',
    share: '<path class="p" d="M8.3 10.8 15.7 6.6M8.3 13.2l7.4 4.2"/><circle class="p cy-node" cx="18" cy="5.4" r="2.5"/><circle class="p cy-node" cx="18" cy="18.6" r="2.5"/><circle class="af" cx="6" cy="12" r="2.8"/>',
    print: '<path class="p" d="M7 9V3.5h10V9"/><path class="p" d="M7 17H4.5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h15a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H17"/><g class="cy-feed"><path class="p" d="M7 13.5h10v7H7z"/><path class="a" d="M9.5 16.3h5M9.5 18.4h3"/></g><circle class="af" cx="17.4" cy="11.6" r="1.1"/>',
    'font-down': A_GLYPH + '<path class="a" d="M16.4 8.6h5.2"/>',
    'font-up': A_GLYPH + '<path class="a" d="M19 6v5.2M16.4 8.6h5.2"/>',
    'font-reset': A_GLYPH + '<path class="a cy-spin" d="M21.2 9.4a3 3 0 1 1-.9-2.1"/><path class="a" d="M20.6 4.6v2.7h-2.7"/>',
    doc: '<path class="p" d="M6 3h8.5L19 7.5V21H6z"/><path class="p" d="M14.5 3v4.5H19"/><path class="a cy-line" d="M9 11.5h7"/><path class="d" d="M9 14.5h7M9 17.5h4.5"/>',
    manual: '<path class="p" d="M6 3h8.5L19 7.5V21H6z"/><path class="p" d="M14.5 3v4.5H19"/><path class="a" d="M10.6 11.6 8.6 13.8l2 2.2M13.4 11.6l2 2.2-2 2.2"/>',
    'list-fold': '<path class="a" d="M3.4 5.6 5.2 7.4 7 5.6M3.4 11.2 5.2 13 7 11.2"/><path class="p" d="M10 6.6h10.6M10 12.2h10.6M10 17.8h10.6"/><path class="d" d="M3.8 17.8h2.8"/>',
    columns: '<rect class="p" x="3" y="4.5" width="18" height="15" rx="1"/><path class="p" d="M12 4.5v15"/><path class="a" d="M5.6 8h4M14.4 8h4"/><path class="d" d="M5.6 11.2h4M5.6 14.4h4M14.4 11.2h4M14.4 14.4h4"/>',
    compare: '<rect class="p" x="2.5" y="5" width="7.4" height="14" rx=".8"/><rect class="p" x="14.1" y="5" width="7.4" height="14" rx=".8"/><path class="a" d="M10.9 9.6h2.4M12.2 8.3l1.3 1.3-1.3 1.3M13.1 14.4h-2.4M11.8 13.1l-1.3 1.3 1.3 1.3"/>',
    bolt: '<path class="p" d="M13.6 2.5 5 13.6h6.2L9.6 21.5l9-11.6h-6.2z"/><path class="a" d="M19.6 4.6 21.2 3M20.4 8h2"/>',
    'id-card': '<rect class="p" x="2.5" y="5" width="19" height="14" rx="1.2"/><circle class="a" cx="8" cy="10.8" r="2.2"/><path class="a" d="M4.8 16.2c.6-1.6 1.8-2.4 3.2-2.4s2.6.8 3.2 2.4"/><path class="p" d="M13.6 9.5h5M13.6 12.5h5M13.6 15.5h3"/>',
    grid: '<rect class="p" x="3.5" y="3.5" width="7" height="7"/><rect class="p" x="13.5" y="3.5" width="7" height="7"/><rect class="p" x="3.5" y="13.5" width="7" height="7"/><rect class="af cy-blink" x="13.5" y="13.5" width="7" height="7"/>',
    radar: '<circle class="p" cx="12" cy="12" r="8.6"/><circle class="d" cx="12" cy="12" r="4.6"/><path class="a cy-sweep" d="M12 12 18.1 5.9"/><circle class="af cy-blink" cx="15.6" cy="15.2" r="1.4"/>',
    gauge: '<path class="p" d="M3.5 16.5a8.5 8.5 0 0 1 17 0"/><path class="d" d="M5.6 11.3 7 12.3M12 7.6v1.7M18.4 11.3 17 12.3"/><path class="a cy-needle" d="M12 16.5 16 11"/><circle class="pf" cx="12" cy="16.5" r="1.7"/><path class="p" d="M5 20.2h14"/>',
    scales: '<path class="p" d="M12 4.6v14.9M7.6 20h8.8M4.8 7.2h14.4"/><circle class="af" cx="12" cy="4.2" r="1.5"/><g class="cy-tilt"><path class="p" d="M4.8 7.2 2.4 13.2h4.8zM19.2 7.2l-2.4 6h4.8z"/><path class="a" d="M2.4 13.2a2.4 2.4 0 0 0 4.8 0M16.8 13.2a2.4 2.4 0 0 0 4.8 0"/></g>',
    'chevron-left': '<path class="p cy-nudge-l" d="M14.6 5.4 8 12l6.6 6.6"/><path class="a" d="M19.4 12h-2.6"/>',
    'chevron-right': '<path class="p cy-nudge-r" d="M9.4 5.4 16 12l-6.6 6.6"/><path class="a" d="M4.6 12h2.6"/>',
    home: '<path class="p" d="M3.5 11.2 12 4l8.5 7.2"/><path class="p" d="M6 9.4V20h12V9.4"/><path class="a" d="M10 20v-5.2h4V20"/>',
    menu: '<path class="p" d="M4 6.5h16M4 17.5h16"/><path class="a" d="M4 12h11"/>',
    list: '<path class="a" d="M4 6.5h1.6M4 12h1.6M4 17.5h1.6"/><path class="p" d="M9 6.5h11M9 12h11M9 17.5h7"/>',
    close: '<path class="p cy-spin" d="M6.5 6.5l11 11M17.5 6.5l-11 11"/><path class="a" d="M3 7.5V3h4.5M21 16.5V21h-4.5"/>',
    'zoom-actual': '<path class="p" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><rect class="a" x="9" y="9" width="6" height="6"/>',
    'zoom-fit': '<path class="p" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/><rect class="a" x="10" y="10" width="4" height="4"/>',
    pause: '<rect class="pf" x="6" y="4.5" width="4" height="15" rx=".5"/><rect class="af" x="14" y="4.5" width="4" height="15" rx=".5"/>',
    play: '<path class="pf" d="M7 4.5v15l12.2-7.5z"/><path class="a" d="M3.4 8v8"/>',
    info: '<path class="p" d="M12 2.8 20 7.4v9.2L12 21.2 4 16.6V7.4z"/><path class="a" d="M12 11v6"/><circle class="af" cx="12" cy="7.9" r="1.3"/>',
    'book-open': '<path class="p" d="M12 6.4C9.8 4.8 6.6 4.3 3 4.8v13.6c3.6-.5 6.8 0 9 1.6 2.2-1.6 5.4-2.1 9-1.6V4.8c-3.6-.5-6.8 0-9 1.6z"/><path class="d" d="M12 6.4V20"/><path class="a cy-line" d="M5.6 8.7c1.8-.1 3.4.2 4.6.9M13.8 9.6c1.2-.7 2.8-1 4.6-.9"/>',
    resume: '<path class="a" d="M5 5v14"/><path class="p cy-nudge-r" d="M9 5.2v13.6L19.6 12z"/>',
    bookmark: '<path class="p" d="M6.5 3.5h11V21L12 17.2 6.5 21z"/><path class="a cy-draw" d="M9.2 10.2l2 2 3.6-3.8"/>',
    'filter-clear': '<path class="p" d="M3.5 4.5h17l-6.8 7.8v6.2l-3.4 2v-8.2z"/><path class="a cy-spin" d="M16.4 15.4l4.2 4.2M20.6 15.4l-4.2 4.2"/>',
    'folder-plus': `<path class="p" d="${FOLDER}"/><path class="a cy-spin" d="M12 11.2v5.2M9.4 13.8h5.2"/>`,
    'folder-in': `<path class="p" d="${FOLDER}"/><path class="a cy-drop" d="M12 10.4v5.8M9.5 13.8l2.5 2.5 2.5-2.5"/>`,
    'folder-out': `<path class="p" d="${FOLDER}"/><path class="a" d="M9.4 13.8h5.2"/>`,
    albums: '<path class="d" d="M6.5 3.5h11M4.8 6.2h14.4"/><rect class="p" x="3" y="9" width="18" height="11.5" rx="1"/><path class="a cy-pop" d="M12 11.5l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z"/>',
    pencil: '<path class="p" d="M4 20l1.2-4.6L15.6 5l3.4 3.4L8.6 18.8z"/><path class="a" d="M13.4 7.2l3.4 3.4"/><path class="d" d="M13 20.2h7"/>',
    trash: '<g class="cy-lid"><path class="p" d="M3.8 6.6h16.4M9.4 6.6V4h5.2v2.6"/></g><path class="p" d="M6 6.6l1 14h10l1-14"/><path class="a" d="M10 10.5v6.5M14 10.5v6.5"/>',
    'check-double': '<path class="p" d="M2.5 12.8l4 4 8.2-9"/><path class="a cy-draw" d="M11.5 15.6l1.2 1.2 8.8-9.3"/>',
    unread: '<circle class="p" cx="12" cy="12" r="8.5"/><circle class="af cy-blink" cx="12" cy="12" r="3.2"/>',
    'x-circle': '<circle class="p" cx="12" cy="12" r="8.5"/><path class="a cy-spin" d="M9 9l6 6M15 9l-6 6"/>',
    check: '<path class="d" d="M3.5 7V3.5H7M20.5 17v3.5H17"/><path class="a cy-draw" d="M5 12.6l4.6 4.6L19.4 7.2"/>',
    refresh: '<g class="cy-spin"><path class="p" d="M19.4 9A8 8 0 0 0 5 7.2M4.6 15A8 8 0 0 0 19 16.8"/><path class="a" d="M5 3v4.4h4.4M19 21v-4.4h-4.4"/></g>',
    sliders: '<path class="p" d="M4 7h8.4M17.6 7H20M4 17h2.4M11.6 17H20"/><circle class="a cy-knob" cx="15" cy="7" r="2.4"/><circle class="a" cx="9" cy="17" r="2.4"/>',
    tag: '<path class="p" d="M3.5 12.6V3.5h9.1l8.4 8.4-9.1 9.1z"/><circle class="af" cx="8" cy="8" r="1.7"/>',
    burst: '<path class="a cy-rays" d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.3 5.3l2.8 2.8M15.9 15.9l2.8 2.8M5.3 18.7l2.8-2.8M15.9 8.1l2.8-2.8"/><circle class="pf" cx="12" cy="12" r="2.6"/>',
    orbit: '<ellipse class="p" cx="12" cy="12" rx="9.6" ry="4.2" transform="rotate(-25 12 12)"/><circle class="pf" cx="12" cy="12" r="2.8"/><g class="cy-orbit"><circle class="af" cx="20.2" cy="8.2" r="1.6"/></g>',
    matrix: '<path class="pf" d="M4 4h3v3H4zM10.5 4h3v3h-3zM17 4h3v3h-3zM4 10.5h3v3H4zM17 10.5h3v3h-3zM4 17h3v3H4zM10.5 17h3v3h-3z"/><path class="af cy-blink" d="M10.5 10.5h3v3h-3zM17 17h3v3h-3z"/>',
    warning: '<path class="p" d="M12 3.2 21.6 20H2.4z"/><path class="a" d="M12 9.5v5"/><circle class="af cy-blink" cx="12" cy="17.2" r="1.2"/>',
    chat: '<path class="p" d="M4 5h16v10.6h-9.5L6 19.6v-4H4z"/><circle class="af cy-dot1" cx="8.5" cy="10.3" r="1.15"/><circle class="af cy-dot2" cx="12" cy="10.3" r="1.15"/><circle class="af cy-dot3" cx="15.5" cy="10.3" r="1.15"/>',
    'arrow-up': '<path class="p" d="M12 20.5V5"/><path class="a cy-nudge-u" d="M6 11l6-6 6 6"/>',
    'arrow-left': '<path class="p" d="M20 12H5"/><path class="a cy-nudge-l" d="M11 6l-6 6 6 6"/>',
    external: '<path class="p" d="M18 13.5V20H4V6h6.5"/><path class="a cy-nudge-ne" d="M14 4h6v6M20 4l-8.5 8.5"/>',
    crosshair: '<circle class="p" cx="12" cy="12" r="6.8"/><path class="p" d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/><circle class="af cy-blink" cx="12" cy="12" r="1.9"/>',
    archive: '<path class="p" d="M3 4h18v4.5H3z"/><path class="p" d="M5 8.5V20h14V8.5"/><path class="a" d="M9.5 12.5h5"/>',
    terminal: '<rect class="p" x="3" y="4" width="18" height="13" rx="1"/><path class="p" d="M8.5 21h7M12 17v4"/><path class="a" d="M7 8.4l2.6 2.2L7 12.8"/><path class="a cy-blink" d="M11.6 13h4.4"/>',
    globe: '<circle class="p" cx="12" cy="12" r="8.5"/><path class="p" d="M3.5 12h17"/><path class="a" d="M12 3.5c2.6 2.4 3.9 5.2 3.9 8.5s-1.3 6.1-3.9 8.5c-2.6-2.4-3.9-5.2-3.9-8.5S9.4 5.9 12 3.5z"/>',
    save: '<path class="p" d="M4 3.5h12.6l3.9 3.9v13.1H4z"/><path class="p" d="M7.5 3.5v5h8v-5"/><path class="a" d="M7.5 20.5v-6h9v6"/><path class="af" d="M12.6 4.8h1.7v2.4h-1.7z"/>',
    link: '<path class="p" d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2"/><path class="a" d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2"/>',
    prompt: '<path class="a" d="M5 7l5 5-5 5"/><path class="p cy-blink" d="M12.5 17.5H19"/>'
  };

  /* ---------- Semantic mapping for buttons. First match wins. ---------- */
  const SKIP_ICON = '#coreButton,.device-shell,.album-tag button';
  const pressed = el => el.getAttribute('aria-pressed') === 'true' || el.classList.contains('is-saved');
  const label = el => (el.textContent || '').replace(/\s+/g, '');
  const BUTTON_RULES = [
    ['#motionToggle', el => el.getAttribute('aria-pressed') === 'false' ? 'play' : 'pause'],
    ['#previousIssue,#retrieval-prev', 'chevron-left'],
    ['#nextIssue,#retrieval-next', 'chevron-right'],
    ['[data-filter="全部"]', 'grid'], ['[data-filter="竞品动态"]', 'radar'], ['[data-filter="评测文章"]', 'gauge'], ['[data-filter="法律科技文章"]', 'scales'],
    ['#readReport,#latest-action', 'book-open'],
    ['[data-favorite-issue-id],#site-favorite,#latest-favorite', el => pressed(el) || /^已收藏/.test(label(el)) ? 'star-fill' : 'star'],
    ['[data-follow]', el => pressed(el) ? 'signal-on' : 'signal'],
    ['[data-layout="burst"]', 'burst'], ['[data-layout="orbit"]', 'orbit'], ['[data-layout="matrix"]', 'matrix'],
    ['#dialogClose,.toc-close,[data-close]', 'close'],
    ['#appNavToggle', 'menu'], ['#tocToggle', 'list'],
    ['#retrieval-form [type=submit]', 'search'],
    ['#retrieval-clear,[data-clear-personal]', 'filter-clear'],
    ['#retrieval-retry,#refresh-subscriptions', 'refresh'],
    ['[data-workspace-tab="favorites"],[data-favorites-view="items"]', 'star'],
    ['[data-workspace-tab="subscriptions"]', 'signal'],
    ['[data-favorites-view="albums"]', 'albums'],
    ['#subscription-form [type=submit],.subscription-form-actions button', 'sliders'],
    ['#rename-album', 'pencil'], ['#delete-album', 'trash'],
    ['#cancel-rename,#close-album-picker', 'x-circle'],
    ['#open-album-picker,#confirm-album-picker,[data-bulk="album"]', 'folder-in'],
    ['#bulk-unfile,[data-bulk="unfile"]', 'folder-out'],
    ['[data-bulk="read"]', 'check-double'],
    ['#bulk-remove,[data-bulk="remove"],[data-remove-issue]', 'star-off'],
    ['[data-toggle-read]', el => /未读/.test(label(el)) ? 'unread' : 'check-double'],
    ['[data-save-view]', 'bookmark'],
    ['.term-button', 'tag'],
    ['#save-competitor-note', 'save'],
    ['#fontDown', 'font-down'], ['#fontUp', 'font-up'], ['#fontReset', 'font-reset'],
    ['#printReport', 'print'],
    ['#site-share', 'share'],
    ['[data-reading-mode="table"]', 'doc'], ['[data-reading-mode="quick"]', 'list-fold'],
    ['[data-reading-mode="split"]', 'columns'], ['[data-reading-mode="compare"]', 'compare'],
    ['[data-view="actions"]', 'bolt'], ['[data-view="competitors"]', 'id-card'],
    ['[data-zoom]', el => /适应/.test(label(el)) ? 'zoom-fit' : 'zoom-actual'],
    ['#resume-reading', 'resume'],
    ['a.tool-button[href*="index"]', 'home'],
    ['a.secondary-action[href*="%E6%9B%B4%E6%96%B0"],a.secondary-action[href*="更新"]', 'manual']
  ];
  /* Icon-only keys keep their aria-label as accessible name and get a tooltip. */
  const ICON_ONLY = '#fontDown,#fontUp,#fontReset,#previousIssue,#nextIssue,.toc-close,#dialogClose';
  /* Text fallbacks for buttons rendered later or added in future issues. */
  const TEXT_RULES = [
    [/新建/, 'folder-plus'], [/保存名称|确认|完成/, 'check'], [/重命名/, 'pencil'], [/删除/, 'trash'],
    [/取消收藏|移除/, 'star-off'], [/取消|关闭/, 'x-circle'], [/已收藏/, 'star-fill'], [/收藏/, 'star'],
    [/已订阅/, 'signal-on'], [/订阅/, 'signal'], [/检索|搜索/, 'search'], [/筛选/, 'filter-clear'],
    [/分享|复制/, 'share'], [/打印|PDF/i, 'print'], [/保存|记住/, 'save'], [/专辑/, 'folder-in'],
    [/已读/, 'check-double'], [/未读/, 'unread'], [/检查|更新|刷新|重新/, 'refresh'], [/继续/, 'resume'],
    [/阅读|周报/, 'book-open'], [/上一/, 'chevron-left'], [/下一/, 'chevron-right'], [/返回/, 'arrow-left'],
    [/原始大小/, 'zoom-actual'], [/导航|目录/, 'menu']
  ];

  /* Navigation and inline action links get a small icon (no key socket).
     #aboutButton opens a dialog but sits in the header nav, so it is dressed exactly like its sibling links. */
  const LINK_SELECTOR = '#aboutButton,.text-link,.back-link,.archive-open,.back-top,.site-reader-links a,.app-nav a,.header-nav a,.sidebar-note a,.profile-card-link,.personal-overview-head a,.personal-overview-links a,.issue-follow-controls a,.site-issue-tools a,.section-header a,.panel-copy a,.saved-item-actions a,.timeline-actions a,.profile-section a';
  const LINK_RULES = [
    [/^←|返回监控首页|返回SIGNAL首页|返回首页/, el => el.matches('.text-link') ? 'home' : 'arrow-left'],
    [/返回报告顶部|顶部/, 'arrow-up'], [/未读/, 'unread'], [/订阅/, 'signal'], [/监控首页|^首页/, 'home'], [/工作台/, 'terminal'],
    [/检索|搜索/, 'search'], [/竞品档案/, 'id-card'], [/往期/, 'archive'], [/更新说明|维护说明/, 'manual'],
    [/讨论/, 'chat'], [/来源索引/, 'link'], [/报告错误|反馈/, 'warning'], [/定位/, 'crosshair'],
    [/官方网站|官网/, 'globe'], [/继续上次阅读/, 'resume'], [/阅读|周报/, 'book-open'],
    [/收藏/, 'star'], [/关于/, 'info']
  ];
  const ARROWS = { '→': 'e', '↗': 'ne', '←': 'w', '↑': 'n', '↓': 's' };
  const ARROW_SELECTOR = LINK_SELECTOR + ',.cyber-button';

  function iconForButton(el) {
    if (el.matches(SKIP_ICON)) return null;
    for (const [sel, icon] of BUTTON_RULES) if (el.matches(sel)) return typeof icon === 'function' ? icon(el) : icon;
    const text = label(el);
    if (!text) return null;
    for (const [re, icon] of TEXT_RULES) if (re.test(text)) return icon;
    return 'prompt';
  }
  function iconForLink(el) {
    const text = label(el);
    for (const [re, icon] of LINK_RULES) if (re.test(text)) return typeof icon === 'function' ? icon(el) : icon;
    return null;
  }
  function setIcon(el, name, inline) {
    let key = el.querySelector(':scope > .cy-key');
    if (!name || !ICONS[name]) {
      if (key) key.remove();
      if (el.classList.contains('cy-has-icon')) el.classList.remove('cy-has-icon');
      return;
    }
    if (!key) {
      key = document.createElement('i');
      key.className = inline ? 'cy-key cy-inline' : 'cy-key';
      key.setAttribute('aria-hidden', 'true');
      el.prepend(key);
    } else if (el.firstElementChild !== key || el.firstChild !== key) {
      el.prepend(key);
    }
    if (key.dataset.i !== name) {
      key.dataset.i = name;
      key.innerHTML = `<svg class="cy-ico" viewBox="0 0 24 24" focusable="false" aria-hidden="true">${ICONS[name]}</svg>`;
    }
    if (!el.classList.contains('cy-has-icon')) el.classList.add('cy-has-icon');
    if (el.dataset.cyIcon !== name) el.dataset.cyIcon = name;
  }
  function wrapArrows(el) {
    for (const span of el.querySelectorAll(':scope > span:not(.cy-arrow)')) {
      const t = span.textContent.trim();
      if (ARROWS[t]) { span.classList.add('cy-arrow'); span.dataset.dir = ARROWS[t]; }
    }
    for (const node of [...el.childNodes]) {
      if (node.nodeType !== 3) continue;
      const data = node.data;
      const tail = data.match(/([→↗←↑↓])\s*$/);
      const head = data.match(/^\s*([→↗←↑↓])/);
      const m = tail || head;
      if (!m) continue;
      const at = tail ? data.lastIndexOf(m[1]) : data.indexOf(m[1]);
      const arrow = at > 0 ? node.splitText(at) : node;
      if (arrow.data.length > 1) arrow.splitText(1);
      const span = document.createElement('span');
      span.className = 'cy-arrow';
      span.dataset.dir = ARROWS[m[1]];
      span.setAttribute('aria-hidden', 'true');
      arrow.replaceWith(span);
      span.append(arrow);
    }
  }
  function indicator(group, initial = false) {
    let mark = group.querySelector(':scope > .cyber-indicator');
    if (!mark) { mark = document.createElement('span'); mark.className = 'cyber-indicator'; mark.setAttribute('aria-hidden', 'true'); group.prepend(mark); initial = true; }
    const active = [...group.querySelectorAll(':scope > button')].find(b => b.getAttribute('aria-pressed') === 'true' || b.classList.contains('is-active'));
    if (!active) { group.style.setProperty('--indicator-ready', '0'); return; }
    const root = group.getBoundingClientRect(), r = active.getBoundingClientRect();
    if (!r.width || !r.height) return;
    if (initial) mark.style.transition = 'none';
    for (const [key, value] of Object.entries({ x: r.left - root.left - group.clientLeft + group.scrollLeft, y: r.top - root.top - group.clientTop + group.scrollTop, w: r.width, h: r.height })) group.style.setProperty('--indicator-' + key, value + 'px');
    group.style.setProperty('--indicator-ready', '1');
    if (initial) requestAnimationFrame(() => mark.style.removeProperty('transition'));
  }
  function decorate() {
    scheduled = false;
    if (!window.document?.documentElement) return;
    document.querySelectorAll(candidates).forEach(el => {
      if (el.closest('.album-tag')) return;
      if (!el.classList.contains('cyber-button')) {
        el.classList.add('cyber-button');
        if (el.matches('.primary-action,.read-button,#retrieval-form [type=submit],#subscription-form [type=submit]')) el.classList.add('cyber-primary');
        if (el.matches('[data-delete-sub],#delete-album,#bulk-remove,[data-remove-issue]')) el.classList.add('cyber-danger');
        if (el.matches('[data-save-view],[data-clear-personal]')) el.classList.add('cyber-quiet');
        if (el.matches('.header-nav>button')) el.classList.add('cyber-link');
      }
      if (el.matches(ICON_ONLY)) {
        if (!el.classList.contains('cy-icon-only')) el.classList.add('cy-icon-only');
        if (!el.title && el.getAttribute('aria-label')) el.title = el.getAttribute('aria-label');
      }
      setIcon(el, iconForButton(el), el.classList.contains('cyber-link'));
    });
    document.querySelectorAll(LINK_SELECTOR).forEach(el => {
      if (el.classList.contains('cyber-button')) return;
      if (!el.classList.contains('cy-link')) el.classList.add('cy-link');
      setIcon(el, iconForLink(el), true);
    });
    document.querySelectorAll(ARROW_SELECTOR).forEach(wrapArrows);
    document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]),select,textarea').forEach(el => { if (!el.classList.contains('cyber-field')) el.classList.add('cyber-field'); });
    document.querySelectorAll(groupSelector).forEach(group => { const initial = !group.classList.contains('cyber-segments'); if (initial) group.classList.add('cyber-segments'); indicator(group, initial); });
  }
  function schedule() { if (!window.document?.documentElement) return; if (!scheduled) { scheduled = true; frame = requestAnimationFrame(decorate); } }
  const watch = { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-pressed', 'aria-current', 'class'] };
  const observer = new MutationObserver(records => {
    if (records.some(r => r.type === 'childList' || r.type === 'characterData' || ['aria-pressed', 'aria-current'].includes(r.attributeName) || (r.attributeName === 'class' && !r.target.classList?.contains('cyber-pulse')))) schedule();
  });
  observer.observe(document.body, watch);
  addEventListener('pagehide', () => { observer.disconnect(); if (frame) cancelAnimationFrame(frame); scheduled = false; });
  addEventListener('pageshow', e => { if (e.persisted) { observer.observe(document.body, watch); schedule(); } });
  document.addEventListener('click', e => {
    const el = e.target.closest('.cyber-button');
    if (!el || el.disabled || reduced.matches) return;
    el.classList.remove('cyber-pulse');
    // Do not force layout on each press; animation starts on the next frame.
    requestAnimationFrame(() => { if (!el.isConnected) return; el.classList.add('cyber-pulse'); setTimeout(() => el.classList.remove('cyber-pulse'), 420); });
  }, { capture: true });
  addEventListener('resize', () => document.querySelectorAll(groupSelector).forEach(g => indicator(g, true)));
  document.fonts?.ready.then(() => document.querySelectorAll(groupSelector).forEach(g => indicator(g, true)));
  window.SIGNAL_CYBER_ICONS = Object.freeze(Object.keys(ICONS));
  decorate();
})();
