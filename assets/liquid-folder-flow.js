/* Scroll-led route, scene windows, and the shared layout-composer output. */
(() => {
  'use strict';

  const journey = document.getElementById('signalJourney');
  if (!journey) return;

  const root = document.documentElement;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const shell = journey.querySelector('.journey-shell');
  const phone = document.querySelector('.device-wrap');
  const base = journey.querySelector('.journey-route-base');
  const route = journey.querySelector('.journey-route-highlight');
  const sheen = journey.querySelector('.journey-route-sheen');
  const folders = [...journey.querySelectorAll('[data-folder-target]')];
  const panels = [...document.querySelectorAll('.folder-panel[data-folder-panel]')];
  const cats = [...journey.querySelectorAll('.journey-cat[data-cat-progress]')];
  const catLabels = [...journey.querySelectorAll('.journey-cat-label[data-cat-progress]')];
  const decorations = [...journey.querySelectorAll('.journey-deco[data-deco-id]')];
  const progressState = { value: 0, raf: 0 };
  const layoutKey = 'signal-layout-composer-v1';
  const routeWidth = 1000;
  const routeHeight = 4000;
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const catAspect = {
    'cat-one': 1378 / 1056,
    'cat-two': 760 / 1144,
    'cat-three': 862 / 1198,
    'cat-four': 1304 / 1157,
    'cat-five': 1174 / 945,
  };

  const defaultRoutePoints = [
    { x: 810, y: 80 },
    { x: 850, y: 350 },
    { x: 220, y: 720 },
    { x: 185, y: 1070 },
    { x: 820, y: 1600 },
    { x: 850, y: 1940 },
    { x: 190, y: 2500 },
    { x: 165, y: 2880 },
    { x: 780, y: 3410 },
    { x: 825, y: 3650 },
    { x: 330, y: 4100 },
  ];

  function loadLayout() {
    try {
      return JSON.parse(window.localStorage.getItem(layoutKey) || 'null') || null;
    } catch {
      return null;
    }
  }

  function smoothPath(points) {
    if (!points.length) return '';
    const format = point => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    let d = `M${format(points[0])}`;

    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const before = points[index - 2] || previous;
      const after = points[index + 1] || current;
      const controlOne = index === 1
        ? {
          x: previous.x + (current.x - previous.x) * .16,
          y: previous.y + Math.max(86, (current.y - previous.y) * .42),
        }
        : {
          x: previous.x + (current.x - before.x) / 5,
          y: previous.y + (current.y - before.y) / 5,
        };
      const controlTwo = {
        x: current.x - (after.x - previous.x) / 5,
        y: current.y - (after.y - previous.y) / 5,
      };
      d += ` C${format(controlOne)} ${format(controlTwo)} ${format(current)}`;
    }
    return d;
  }

  function phoneStart() {
    if (!shell || !phone) return { x: 810, y: 80 };
    const shellRect = shell.getBoundingClientRect();
    const phoneRect = phone.getBoundingClientRect();
    if (!shellRect.width || !shellRect.height || !phoneRect.width) return { x: 810, y: 80 };
    return {
      x: Math.max(35, Math.min(965, ((phoneRect.left + phoneRect.width * .56 - shellRect.left) / shellRect.width) * routeWidth)),
      y: ((phoneRect.bottom - shellRect.top) / shellRect.height) * routeHeight,
    };
  }

  function applyItemLayout(item, element) {
    if (!item || !element) return;
    element.hidden = Boolean(item.hidden);
    element.dataset.layoutHidden = item.hidden ? 'true' : 'false';
    element.style.left = `${item.x / 10}%`;
    element.style.top = `${item.y / 40}%`;
    if (Number.isFinite(Number(item.w)) && item.w > 0) element.style.width = `${item.w / 10}%`;
    element.style.right = 'auto';
    const requestedLayer = Number(item.z ?? 6);
    /* Folder copy is a reading surface. Keep it above decorative cats while
       the translucent folder body still lets the cat remain visible beneath. */
    const visualLayer = item.kind === 'folder'
      ? Math.max(requestedLayer, 8)
      : item.kind === 'cat'
        ? Math.min(requestedLayer, 12)
        : requestedLayer;
    element.style.zIndex = String(visualLayer);
    element.style.setProperty('--layout-rotation', `${item.rotation || 0}deg`);
    if (item.kind === 'folder') {
      element.classList.add('has-layout');
      if (Number.isFinite(Number(item.h)) && item.h > 0) element.style.height = `${item.h / 40}%`;
    } else if (item.kind === 'cat') {
      const height = Number(item.h) > 0 ? Number(item.h) : Number(item.w || 0) * (catAspect[item.id] || 1);
      if (height > 0) element.style.height = `${height / 40}%`;
    } else if (Number.isFinite(Number(item.h)) && item.h > 0) {
      element.style.height = `${item.h / 40}%`;
    }
  }

  function intersects(a, b, padding = 0) {
    return a.x < b.x + b.w + padding
      && a.x + a.w > b.x - padding
      && a.y < b.y + b.h + padding
      && a.y + a.h > b.y - padding;
  }

  function clampItem(item) {
    const width = Math.max(1, Number(item.w) || 1);
    const fallbackHeight = item.kind === 'cat' ? width * (catAspect[item.id] || 1) : 1;
    const height = Math.max(1, Number(item.h) || fallbackHeight);
    return {
      x: Math.max(0, Math.min(routeWidth - width, Number(item.x) || 0)),
      y: Math.max(0, Math.min(routeHeight - height - 96, Number(item.y) || 0)),
      w: width,
      h: height,
    };
  }

  function safeHomepageItems(items) {
    const safeItems = (items || []).map(item => ({ ...item }));
    const folders = safeItems.filter(item => item.kind === 'folder' && !item.hidden);
    const textZones = folders.map(folder => {
      const insetX = Math.max(26, Number(folder.w || 520) * .09);
      const insetY = Math.max(70, Number(folder.h || 680) * .17);
      return {
        x: Number(folder.x || 0) + insetX,
        y: Number(folder.y || 0) + insetY,
        w: Math.max(80, Number(folder.w || 520) - insetX * 2),
        h: Math.max(90, Number(folder.h || 680) - insetY * 2),
      };
    });

    safeItems
      .filter(item => item.kind === 'cat' && !item.hidden)
      .forEach(cat => {
        const size = clampItem(cat);
        const original = { ...size };

        /* The bottom cat gets a hard safety margin so its whole silhouette
           stays inside the scroll canvas, including its transparent bounds. */
        const bottomSafeY = routeHeight - size.h - 120;
        size.y = Math.min(size.y, bottomSafeY);
        const alreadySafe = textZones.every(zone => !intersects(size, zone, 18));
        if (alreadySafe) {
          cat.x = size.x;
          cat.y = size.y;
          return;
        }

        const candidates = [{ x: size.x, y: size.y }];
        textZones.forEach(zone => {
          candidates.push(
            { x: zone.x - size.w - 34, y: original.y },
            { x: zone.x + zone.w + 34, y: original.y },
            { x: original.x, y: zone.y - size.h - 34 },
            { x: original.x, y: zone.y + zone.h + 34 },
          );
        });

        const scored = candidates.map(candidate => {
          const normalized = clampItem({ ...cat, x: candidate.x, y: candidate.y, w: size.w, h: size.h });
          const collisions = textZones.reduce((count, zone) => count + (intersects(normalized, zone, 18) ? 1 : 0), 0);
          const distance = Math.abs(normalized.x - original.x) + Math.abs(normalized.y - original.y);
          const bottomPenalty = normalized.y > bottomSafeY ? normalized.y - bottomSafeY : 0;
          return { ...normalized, score: collisions * 100000 + distance + bottomPenalty * 4 };
        }).sort((a, b) => a.score - b.score)[0];

        cat.x = scored.x;
        cat.y = Math.min(scored.y, bottomSafeY);
      });

    return safeItems;
  }

  function applyDecorationLayout(layout) {
    const activeItems = safeHomepageItems(layout?.items || [])
      .filter(item => !item.hidden && (item.kind === 'folder' || item.kind === 'cat'))
      .map(item => {
        const width = Math.max(1, Number(item.w) || 1);
        const fallbackHeight = item.kind === 'cat' ? width * (catAspect[item.id] || 1) : 1;
        return {
          x: Number(item.x) || 0,
          y: Number(item.y) || 0,
          w: width,
          h: Math.max(1, Number(item.h) || fallbackHeight),
        };
      });

    decorations.forEach(decoration => {
      const x = Number(decoration.dataset.decoX || 0);
      const y = Number(decoration.dataset.decoY || 0);
      const width = Math.max(1, Number(decoration.dataset.decoW || 1));
      const height = Math.max(1, Number(decoration.dataset.decoH || 1));
      decoration.style.left = `${x / 10}%`;
      decoration.style.top = `${y / 40}%`;
      decoration.style.width = `${width / 10}%`;
      if (!decoration.matches('svg')) decoration.style.height = `${height / 40}%`;
      const collision = activeItems.some(item => intersects(
        { x, y, w: width, h: height },
        item,
        22,
      ));
      decoration.classList.toggle('is-colliding', collision);
    });
  }

  function applyLayout(layout) {
    if (!layout) return;
    if (layout.pathStyle?.baseWidth) root.style.setProperty('--journey-line-base', `${layout.pathStyle.baseWidth}px`);
    if (layout.pathStyle?.highlightWidth) root.style.setProperty('--journey-line-highlight', `${layout.pathStyle.highlightWidth}px`);
    if (layout.pathStyle?.sheenWidth) root.style.setProperty('--journey-line-sheen', `${layout.pathStyle.sheenWidth}px`);
    if (layout.pathStyle?.opacity) root.style.setProperty('--journey-line-opacity', String(layout.pathStyle.opacity));
    if (layout.pathStyle?.highlightOpacity) root.style.setProperty('--journey-line-highlight-opacity', String(layout.pathStyle.highlightOpacity));
    if (layout.pathStyle?.sheenOpacity) root.style.setProperty('--journey-line-sheen-opacity', String(layout.pathStyle.sheenOpacity));

    safeHomepageItems(layout.items || []).forEach(item => {
      const element = journey.querySelector(`[data-layout-id="${item.id}"]`);
      applyItemLayout(item, element);
    });
  }

  const layout = loadLayout();
  applyLayout(layout);
  applyDecorationLayout(layout);

  function renderRoute() {
    const start = phoneStart();
    const points = layout?.path?.length
      ? layout.path.map(point => ({ x: Number(point.x), y: Number(point.y) }))
      : defaultRoutePoints.map(point => ({ ...point }));
    points[0] = { x: start.x, y: start.y };
    if (layout?.bridge && points.length > 1) {
      const bridgeOffset = Number(layout.bridge.x || 0);
      const bridgeLength = Math.max(90, Math.min(420, 180 + Number(layout.bridge.curve || 0)));
      points.splice(1, 0, {
        x: Math.max(35, Math.min(965, start.x + bridgeOffset)),
        y: start.y + bridgeLength,
      });
    }

    /* Keep every control point moving downward through one continuous
       document-flow route. A freehand point can still move left or right,
       but it cannot create a backward loop or a kink in the signal. */
    for (let index = 0; index < points.length; index += 1) {
      const previous = points[index - 1];
      points[index].x = Math.max(35, Math.min(965, Number(points[index].x) || 0));
      if (index > 0) {
        points[index].y = Math.max(Number(points[index].y) || 0, previous.y + 110);
      }
    }

    const d = smoothPath(points);
    [base, route, sheen].forEach(path => path?.setAttribute('d', d));
  }

  function setProgress(value) {
    const progress = clamp(value);
    progressState.value = progress;
    root.style.setProperty('--journey-progress', progress.toFixed(4));
    root.style.setProperty('--journey-dashoffset', String(1000 - progress * 1000));

    folders.forEach(folder => {
      const threshold = Number(folder.dataset.folderProgress || 0);
      if (progress >= threshold - .08) folder.closest('.journey-folder')?.classList.add('is-revealed');
    });

    cats.forEach(cat => {
      const threshold = Number(cat.dataset.catProgress || 0);
      const visible = reduced || (progress >= threshold - .075 && progress <= threshold + .17);
      cat.classList.toggle('is-visible', visible);
    });
    catLabels.forEach(label => {
      const threshold = Number(label.dataset.catProgress || 0);
      const visible = reduced || (progress >= threshold - .075 && progress <= threshold + .17);
      label.classList.toggle('is-visible', visible);
    });
  }

  function update() {
    renderRoute();
    const rect = journey.getBoundingClientRect();
    const travel = Math.max(1, rect.height - window.innerHeight * .68);
    const start = window.innerHeight * .42;
    const progress = (start - rect.top) / travel;
    setProgress(progress);
    progressState.raf = 0;
  }

  function requestUpdate() {
    if (!progressState.raf) progressState.raf = requestAnimationFrame(update);
  }

  function openFolder(id, scroll = true) {
    const panel = document.getElementById(id);
    if (!panel || !panel.matches('.folder-panel')) return;

    panels.forEach(candidate => {
      const active = candidate === panel;
      candidate.hidden = !active;
      candidate.classList.toggle('is-opening', active);
      if (!active) candidate.classList.remove('is-opening');
    });
    folders.forEach(folder => {
      const active = folder.dataset.folderTarget === id;
      folder.closest('.journey-folder')?.classList.toggle('is-active', active);
      folder.setAttribute('aria-expanded', String(active));
    });

    if (history.replaceState) history.replaceState(null, '', `#${id}`);
    if (scroll) {
      window.setTimeout(() => panel.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }), 55);
    }
  }

  function closeFolder(panel) {
    const opener = folders.find(folder => folder.dataset.folderTarget === panel.id);
    const cover = opener?.closest('.journey-folder');
    panel.hidden = true;
    panel.classList.remove('is-opening');
    folders.forEach(folder => {
      folder.closest('.journey-folder')?.classList.remove('is-active');
      folder.setAttribute('aria-expanded', 'false');
    });
    if (history.replaceState) history.replaceState(null, '', '#signalJourney');
    if (cover) {
      window.setTimeout(() => {
        cover.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
        opener.focus({ preventScroll: true });
      }, 55);
    } else {
      journey.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    }
  }

  folders.forEach(folder => {
    folder.addEventListener('click', () => openFolder(folder.dataset.folderTarget));
  });
  document.querySelectorAll('.folder-close').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      const panel = button.closest('.folder-panel');
      if (panel) closeFolder(panel);
    });
  });

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const hash = link.getAttribute('href').slice(1);
    const target = document.getElementById(hash);
    const panel = target?.closest('.folder-panel');
    if (!panel) return;
    event.preventDefault();
    openFolder(panel.id);
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) requestUpdate();
      });
    }, { rootMargin: '35% 0px 35% 0px' });
    observer.observe(journey);
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  window.addEventListener('pageshow', requestUpdate);
  window.addEventListener('load', requestUpdate, { once: true });

  const initialHash = location.hash.slice(1);
  const initialPanel = document.getElementById(initialHash)?.closest('.folder-panel');
  if (initialPanel) openFolder(initialPanel.id, false);
  else panels.forEach(panel => { panel.hidden = true; });

  if (reduced) {
    root.style.setProperty('--journey-progress', '1');
    folders.forEach(folder => folder.closest('.journey-folder')?.classList.add('is-revealed'));
    cats.forEach(cat => cat.classList.add('is-visible'));
    catLabels.forEach(label => label.classList.add('is-visible'));
  }
  requestUpdate();
})();
