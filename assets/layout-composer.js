(() => {
  'use strict';

  const STORAGE_KEY = 'signal-layout-composer-v1';
  const ROUTE_WIDTH = 1000;
  const ROUTE_HEIGHT = 4000;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const clone = value => JSON.parse(JSON.stringify(value));

  const defaultPath = [
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
    { x: 330, y: 4000 },
  ];

  const defaultItems = [
    { id: 'folder-latest', kind: 'folder', label: '最新一期', kicker: 'DOSSIER / LATEST ISSUE', index: '01', x: 0, y: 300, w: 520, h: 680, rotation: -1, z: 6 },
    { id: 'folder-decision', kind: 'folder', label: '本周决策摘要', kicker: 'DOSSIER / DECISION BRIEF', index: '02', x: 480, y: 1270, w: 520, h: 680, rotation: 1, z: 6 },
    { id: 'folder-competitor', kind: 'folder', label: '竞品档案', kicker: 'DOSSIER / PROFILES', index: '03', x: 0, y: 2240, w: 520, h: 680, rotation: -1, z: 6 },
    { id: 'folder-archive', kind: 'folder', label: '往期内容', kicker: 'DOSSIER / ARCHIVE', index: '04', x: 480, y: 3210, w: 520, h: 680, rotation: 1, z: 6 },
    { id: 'cat-one', kind: 'cat', label: '猫 01 / STRUT', asset: 'assets/liquid-cats/cat-1-strut.webp', x: 730, y: 135, w: 245, h: 430, rotation: -7, z: 9 },
    { id: 'cat-two', kind: 'cat', label: '猫 02 / STALK', asset: 'assets/liquid-cats/cat-2-stalk.webp', x: 12, y: 1020, w: 280, h: 270, rotation: 7, z: 9 },
    { id: 'cat-three', kind: 'cat', label: '猫 03 / RUN', asset: 'assets/liquid-cats/cat-3-run.webp', x: 700, y: 1830, w: 285, h: 270, rotation: -4, z: 9 },
    { id: 'cat-four', kind: 'cat', label: '猫 04 / LEAP', asset: 'assets/liquid-cats/cat-4-leap.webp', x: 18, y: 2670, w: 280, h: 420, rotation: 6, z: 9 },
    { id: 'cat-five', kind: 'cat', label: '猫 05 / STEP', asset: 'assets/liquid-cats/cat-5-step.webp', x: 26, y: 3290, w: 250, h: 360, rotation: -6, z: 9 },
    { id: 'cat-label-one', kind: 'label', label: 'CAT / 01 — STRUT', text: 'CAT / 01 — STRUT', x: 705, y: 625, w: 190, h: 28, rotation: 0, z: 10 },
    { id: 'cat-label-two', kind: 'label', label: 'CAT / 02 — STALK', text: 'CAT / 02 — STALK', x: 220, y: 1375, w: 190, h: 28, rotation: 0, z: 10 },
    { id: 'cat-label-three', kind: 'label', label: 'CAT / 03 — RUN', text: 'CAT / 03 — RUN', x: 675, y: 2180, w: 180, h: 28, rotation: 0, z: 10 },
    { id: 'cat-label-four', kind: 'label', label: 'CAT / 04 — LEAP', text: 'CAT / 04 — LEAP', x: 665, y: 3060, w: 190, h: 28, rotation: 0, z: 10 },
    { id: 'cat-label-five', kind: 'label', label: 'CAT / 05 — STEP', text: 'CAT / 05 — STEP', x: 220, y: 3700, w: 190, h: 28, rotation: 0, z: 10 },
    { id: 'route-caption', kind: 'caption', label: 'SIGNAL PATH / OPEN THE DOSSIERS', text: 'SIGNAL PATH / OPEN THE DOSSIERS', x: 8, y: 32, w: 275, h: 28, rotation: 0, z: 3 },
    { id: 'spark-one', kind: 'spark', label: '青色节点闪光', color: 'cyan', text: '✦', x: 470, y: 820, w: 34, h: 34, rotation: 0, z: 4 },
    { id: 'spark-two', kind: 'spark', label: '粉色节点闪光', color: 'pink', text: '✦', x: 530, y: 1890, w: 34, h: 34, rotation: 0, z: 4 },
    { id: 'spark-three', kind: 'spark', label: '紫色节点闪光', color: 'violet', text: '✦', x: 420, y: 2920, w: 34, h: 34, rotation: 0, z: 4 },
  ];

  const defaultLayout = {
    version: 1,
    path: clone(defaultPath),
    pathStyle: {
      baseWidth: 72,
      highlightWidth: 58,
      sheenWidth: 10,
      opacity: .52,
      highlightOpacity: .96,
      sheenOpacity: .54,
    },
    bridge: { x: 0, curve: 90 },
    items: clone(defaultItems),
  };

  const state = {
    layout: loadLayout(),
    selectedType: 'item',
    selectedId: 'folder-latest',
    zoom: .82,
    drag: null,
    toastTimer: 0,
  };

  const canvas = document.getElementById('layoutCanvas');
  const canvasViewport = document.getElementById('canvasViewport');
  const canvasElements = document.getElementById('canvasElements');
  const pathPointLayer = document.getElementById('pathPointLayer');
  const editorRouteMain = document.getElementById('editorRouteMain');
  const editorRouteShadow = document.getElementById('editorRouteShadow');
  const editorRouteSheen = document.getElementById('editorRouteSheen');
  const editorBridge = document.getElementById('editorBridge');
  const itemInspector = document.getElementById('itemInspector');
  const pathInspector = document.getElementById('pathInspector');
  const bridgeInspector = document.getElementById('bridgeInspector');
  const selectionTitle = document.getElementById('selectionTitle');
  const selectedPreview = document.getElementById('selectedPreview');
  const inspectorDescription = document.getElementById('inspectorDescription');
  const emptyNote = document.getElementById('canvasEmptyNote');
  const zoomValue = document.getElementById('zoomValue');
  const layerCount = document.getElementById('layerCount');
  const saveState = document.getElementById('saveState');
  const storageIndicator = document.getElementById('storageIndicator');
  const toast = document.getElementById('composerToast');

  if (!canvas || !canvasElements) return;

  function loadLayout() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved) return clone(defaultLayout);
      const savedItems = new Map((saved.items || []).map(item => [item.id, item]));
      const items = defaultItems.map(item => ({ ...clone(item), ...(savedItems.get(item.id) || {}) }));
      return {
        ...clone(defaultLayout),
        ...saved,
        path: Array.isArray(saved.path) && saved.path.length > 1 ? saved.path : clone(defaultPath),
        pathStyle: { ...clone(defaultLayout.pathStyle), ...(saved.pathStyle || {}) },
        bridge: { ...clone(defaultLayout.bridge), ...(saved.bridge || {}) },
        items,
      };
    } catch {
      return clone(defaultLayout);
    }
  }

  function saveLayout({ quiet = false } = {}) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.layout));
      storageIndicator.textContent = 'LOCAL LAYOUT / SAVED';
      saveState.textContent = `已保存 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
      if (!quiet) showToast('布局已保存到本地首页');
    } catch {
      storageIndicator.textContent = 'LOCAL STORAGE / BLOCKED';
      saveState.textContent = '浏览器阻止了 localStorage';
      showToast('当前浏览器未允许保存，请使用 localhost 预览');
    }
  }

  function smoothPath(points) {
    if (!points.length) return '';
    const format = point => `${Number(point.x).toFixed(2)} ${Number(point.y).toFixed(2)}`;
    let d = `M${format(points[0])}`;
    points.slice(1).forEach((current, index) => {
      const previous = points[index];
      const before = points[index - 1] || previous;
      const after = points[index + 2] || current;
      const controlOne = index === 0
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
    });
    return d;
  }

  function logicalPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / ROUTE_WIDTH;
    return {
      x: clamp((event.clientX - rect.left) / scale, 0, ROUTE_WIDTH),
      y: clamp((event.clientY - rect.top) / scale, 0, ROUTE_HEIGHT),
    };
  }

  function itemById(id) {
    return state.layout.items.find(item => item.id === id);
  }

  function selectedItem() {
    return state.selectedType === 'item' ? itemById(state.selectedId) : null;
  }

  function setZoom(value) {
    state.zoom = clamp(value, .45, 1.25);
    canvas.style.width = `${ROUTE_WIDTH * state.zoom}px`;
    canvas.style.height = `${ROUTE_HEIGHT * state.zoom}px`;
    zoomValue.textContent = `${Math.round(state.zoom * 100)}%`;
    window.requestAnimationFrame(render);
  }

  function fitCanvasToWorkspace() {
    const available = Math.max(520, canvasViewport.clientWidth - 128);
    setZoom(available / ROUTE_WIDTH);
  }

  function setSelected(type, id = null) {
    state.selectedType = type;
    state.selectedId = id;
    render();
  }

  function renderRoute() {
    const points = state.layout.path.map(point => ({
      x: Number(point.x),
      y: Number(point.y),
    }));
    const d = smoothPath(points);
    [editorRouteShadow, editorRouteMain, editorRouteSheen].forEach(path => path.setAttribute('d', d));
    const first = points[0] || { x: 810, y: 80 };
    const bridge = state.layout.bridge || { x: 0, curve: 90 };
    const bridgeX = first.x + Number(bridge.x || 0);
    const curve = Number(bridge.curve || 90);
    editorBridge.setAttribute('d', `M810 45 C${810 + curve} 55 ${bridgeX + curve} ${first.y - 36} ${bridgeX} ${first.y}`);
    editorRouteShadow.style.strokeWidth = `${state.layout.pathStyle.baseWidth}px`;
    editorRouteMain.style.strokeWidth = `${state.layout.pathStyle.highlightWidth}px`;
    editorRouteMain.style.opacity = state.layout.pathStyle.highlightOpacity;
    editorRouteSheen.style.strokeWidth = `${state.layout.pathStyle.sheenWidth}px`;
    editorRouteSheen.style.opacity = state.layout.pathStyle.sheenOpacity;
  }

  function renderPathPoints() {
    pathPointLayer.replaceChildren();
    state.layout.path.forEach((point, index) => {
      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'path-point';
      handle.dataset.index = String(index + 1).padStart(2, '0');
      handle.title = index === 0 ? '手机底部起点（锁定）' : `路径控制点 ${index + 1}`;
      if (index === 0) handle.classList.add('is-locked');
      if (state.selectedType === 'path' && state.activePoint === index) handle.classList.add('is-active');
      handle.style.left = `${point.x / 10}%`;
      handle.style.top = `${point.y / 40}%`;
      handle.addEventListener('pointerdown', event => {
        event.preventDefault();
        if (index === 0) {
          showToast('手机底部起点固定，拖动其他控制点改变流向');
          return;
        }
        state.selectedType = 'path';
        state.activePoint = index;
        state.drag = { type: 'point', index };
        render();
      });
      pathPointLayer.appendChild(handle);
    });
  }

  function folderPreview(item) {
    const wrapper = document.createElement('div');
    wrapper.className = 'canvas-folder-copy';
    const kicker = document.createElement('small');
    kicker.textContent = item.kicker || 'DOSSIER / SIGNAL';
    const title = document.createElement('b');
    title.textContent = item.label;
    const description = document.createElement('span');
    description.textContent = '独立章节封面 · 点击后展开内容';
    wrapper.append(kicker, title, description);
    const index = document.createElement('span');
    index.className = 'canvas-folder-index';
    index.textContent = item.index || '00';
    return [wrapper, index];
  }

  function makeCanvasItem(item) {
    const element = document.createElement('div');
    element.className = `canvas-element canvas-element--${item.kind}`;
    element.dataset.itemId = item.id;
    element.dataset.kind = item.kind;
    element.style.left = `${item.x / 10}%`;
    element.style.top = `${item.y / 40}%`;
    element.style.width = `${Math.max(1, item.w) / 10}%`;
    element.style.height = `${Math.max(1, item.h) / 40}%`;
    const requestedLayer = Number(item.z ?? 6);
    /* Keep folder copy readable if a cat is positioned close to a cover.
       The folder surface remains translucent, so the cat is still visible. */
    const visualLayer = item.kind === 'folder'
      ? Math.max(requestedLayer, 20)
      : item.kind === 'cat'
        ? Math.min(requestedLayer, 12)
        : requestedLayer;
    element.style.zIndex = String(visualLayer);
    element.style.transform = `rotate(${Number(item.rotation || 0)}deg)`;
    if (item.hidden) element.classList.add('is-hidden');

    const label = document.createElement('span');
    label.className = 'element-label';
    label.textContent = item.label;
    element.appendChild(label);

    if (item.kind === 'folder') {
      folderPreview(item).forEach(child => element.appendChild(child));
    } else if (item.kind === 'cat') {
      const image = document.createElement('img');
      image.src = item.asset;
      image.alt = '';
      image.draggable = false;
      element.appendChild(image);
    } else if (item.kind === 'caption') {
      element.append(item.text || item.label);
    } else if (item.kind === 'label') {
      element.append(item.text || item.label);
    } else if (item.kind === 'spark') {
      element.dataset.color = item.color || 'cyan';
      element.append(item.text || '✦');
    }

    const rotateHandle = document.createElement('span');
    rotateHandle.className = 'rotate-handle';
    const resizeHandle = document.createElement('span');
    resizeHandle.className = 'resize-handle';
    element.append(rotateHandle, resizeHandle);

    if (state.selectedType === 'item' && state.selectedId === item.id) element.classList.add('is-selected');

    element.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      setSelected('item', item.id);
      const point = logicalPoint(event);
      if (event.target.classList.contains('resize-handle')) {
        state.drag = {
          type: 'resize',
          id: item.id,
          start: point,
          item: clone(item),
        };
      } else if (event.target.classList.contains('rotate-handle')) {
        state.drag = {
          type: 'rotate',
          id: item.id,
          center: { x: item.x + item.w / 2, y: item.y + item.h / 2 },
          startAngle: Math.atan2(point.y - (item.y + item.h / 2), point.x - (item.x + item.w / 2)),
          startRotation: Number(item.rotation || 0),
        };
      } else {
        state.drag = {
          type: 'item',
          id: item.id,
          offset: { x: point.x - item.x, y: point.y - item.y },
        };
      }
    });

    element.addEventListener('dblclick', event => {
      event.preventDefault();
      setSelected('item', item.id);
      showToast(`${item.label} 已选中，可在右侧精确输入属性`);
    });
    return element;
  }

  function renderElements() {
    canvasElements.replaceChildren();
    const visibleItems = state.layout.items
      .slice()
      .sort((a, b) => Number(a.z || 0) - Number(b.z || 0));
    visibleItems.forEach(item => canvasElements.appendChild(makeCanvasItem(item)));
    emptyNote.classList.toggle('is-hidden', visibleItems.some(item => !item.hidden));
    layerCount.textContent = `${visibleItems.filter(item => !item.hidden).length} LAYERS`;
    document.querySelectorAll('[data-asset-status]').forEach(status => {
      const item = itemById(status.dataset.assetStatus);
      const hidden = !item || item.hidden;
      status.textContent = hidden ? '+' : '●';
      status.parentElement?.classList.toggle('is-hidden', hidden);
      status.parentElement?.classList.toggle('is-selected', state.selectedType === 'item' && state.selectedId === status.dataset.assetStatus);
    });
  }

  function renderInspector() {
    itemInspector.hidden = state.selectedType !== 'item';
    pathInspector.hidden = state.selectedType !== 'path';
    bridgeInspector.hidden = state.selectedType !== 'bridge';

    const item = selectedItem();
    if (item) {
      selectionTitle.textContent = item.label;
      selectedPreview.textContent = `${item.kind.toUpperCase()} / ${item.id}`;
      inspectorDescription.textContent = '拖动画框里的元素，或直接输入精确位置。';
      document.querySelectorAll('[data-field]').forEach(input => {
        const field = input.dataset.field;
        if (field === 'hidden') input.checked = Boolean(item.hidden);
        else input.value = Number(item[field] ?? 0);
      });
    } else if (state.selectedType === 'path') {
      selectionTitle.textContent = '主路径控制器';
      inspectorDescription.textContent = '路径保持粗细一致，控制点决定自然的 S 型流动。';
      document.querySelectorAll('[data-path-field]').forEach(input => {
        input.value = Number(state.layout.pathStyle[input.dataset.pathField] ?? 0);
      });
    } else if (state.selectedType === 'bridge') {
      selectionTitle.textContent = '手机接口';
      inspectorDescription.textContent = '接口从手机底部接出，第一控制点保持锁定。';
      document.querySelectorAll('[data-bridge-field]').forEach(input => {
        input.value = Number(state.layout.bridge[input.dataset.bridgeField] ?? 0);
      });
    } else {
      selectionTitle.textContent = '选择一个素材开始排版';
      inspectorDescription.textContent = '选择素材后，可以直接输入位置和尺寸。';
    }
  }

  function renderSelectionClasses() {
    document.querySelectorAll('.asset-button[data-add-id]').forEach(button => {
      button.classList.toggle('is-selected', state.selectedType === 'item' && state.selectedId === button.dataset.addId);
    });
  }

  function render() {
    renderRoute();
    renderPathPoints();
    renderElements();
    renderInspector();
    renderSelectionClasses();
  }

  function updateItem(field, value) {
    const item = selectedItem();
    if (!item) return;
    if (field === 'hidden') item.hidden = Boolean(value);
    else item[field] = Number(value);
    if (field === 'w') item.w = Math.max(1, item.w);
    if (field === 'h') item.h = Math.max(1, item.h);
    render();
  }

  function updatePath(field, value) {
    state.layout.pathStyle[field] = Number(value);
    renderRoute();
  }

  function updateBridge(field, value) {
    state.layout.bridge[field] = Number(value);
    renderRoute();
  }

  function addOrRestoreItem(id) {
    const item = itemById(id);
    if (!item) return;
    item.hidden = false;
    setSelected('item', id);
    showToast(`${item.label} 已加入画框`);
  }

  function removeSelected() {
    const item = selectedItem();
    if (!item) return;
    item.hidden = true;
    render();
    showToast(`${item.label} 已隐藏，可从左侧素材库重新加入`);
  }

  function duplicateProperties() {
    const item = selectedItem();
    if (!item) return;
    try {
      navigator.clipboard?.writeText(JSON.stringify({
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        rotation: item.rotation,
        z: item.z,
      }));
      showToast('当前元素的排版属性已复制');
    } catch {
      showToast('复制失败，但当前布局仍然保存在画框中');
    }
  }

  function raiseLayer(amount) {
    const item = selectedItem();
    if (!item) return;
    item.z = clamp(Number(item.z || 0) + amount, 0, 99);
    render();
  }

  function resetLayout() {
    state.layout = clone(defaultLayout);
    state.selectedType = 'item';
    state.selectedId = 'folder-latest';
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // The editor remains usable in memory.
    }
    storageIndicator.textContent = 'LOCAL LAYOUT / DEFAULT';
    saveState.textContent = '已恢复默认排版，尚未写入首页';
    render();
    showToast('已恢复默认排版');
  }

  function exportLayout() {
    const blob = new Blob([JSON.stringify(state.layout, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'signal-layout-composer.json';
    link.click();
    URL.revokeObjectURL(url);
    showToast('布局 JSON 已导出');
  }

  function showToast(message) {
    window.clearTimeout(state.toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    state.toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
  }

  function moveSelection(event) {
    const drag = state.drag;
    if (!drag) return;
    const point = logicalPoint(event);
    if (drag.type === 'point') {
      const target = state.layout.path[drag.index];
      target.x = Math.round(point.x);
      target.y = Math.round(point.y);
      render();
      return;
    }
    const item = itemById(drag.id);
    if (!item) return;
    if (drag.type === 'item') {
      item.x = Math.round(clamp(point.x - drag.offset.x, 0, ROUTE_WIDTH - Math.max(1, item.w)));
      item.y = Math.round(clamp(point.y - drag.offset.y, 0, ROUTE_HEIGHT - Math.max(1, item.h)));
    } else if (drag.type === 'resize') {
      item.w = Math.round(clamp(drag.item.w + point.x - drag.start.x, 24, 980));
      item.h = Math.round(clamp(drag.item.h + point.y - drag.start.y, 24, 1150));
    } else if (drag.type === 'rotate') {
      const currentAngle = Math.atan2(point.y - drag.center.y, point.x - drag.center.x);
      item.rotation = Math.round(drag.startRotation + ((currentAngle - drag.startAngle) * 180) / Math.PI);
    }
    render();
  }

  function stopDrag() {
    state.drag = null;
  }

  document.querySelectorAll('[data-select-layer]').forEach(button => {
    button.addEventListener('click', () => setSelected(button.dataset.selectLayer === 'main-path' ? 'path' : 'bridge'));
  });

  document.querySelectorAll('[data-add-id]').forEach(button => {
    button.addEventListener('click', () => addOrRestoreItem(button.dataset.addId));
  });

  document.querySelectorAll('[data-field]').forEach(input => {
    input.addEventListener('input', event => updateItem(event.target.dataset.field, event.target.dataset.field === 'hidden' ? event.target.checked : event.target.value));
  });

  document.querySelectorAll('[data-path-field]').forEach(input => {
    input.addEventListener('input', event => updatePath(event.target.dataset.pathField, event.target.value));
  });

  document.querySelectorAll('[data-bridge-field]').forEach(input => {
    input.addEventListener('input', event => updateBridge(event.target.dataset.bridgeField, event.target.value));
  });

  document.getElementById('saveLayout')?.addEventListener('click', () => saveLayout());
  document.getElementById('resetLayout')?.addEventListener('click', resetLayout);
  document.getElementById('exportLayout')?.addEventListener('click', exportLayout);
  document.getElementById('removeItem')?.addEventListener('click', removeSelected);
  document.getElementById('duplicateItem')?.addEventListener('click', duplicateProperties);
  document.getElementById('zoomOut')?.addEventListener('click', () => setZoom(state.zoom - .08));
  document.getElementById('zoomIn')?.addEventListener('click', () => setZoom(state.zoom + .08));
  document.getElementById('fitCanvas')?.addEventListener('click', fitCanvasToWorkspace);

  document.addEventListener('pointermove', moveSelection);
  document.addEventListener('pointerup', stopDrag);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') stopDrag();
    if ((event.key === 'Delete' || event.key === 'Backspace') && state.selectedType === 'item' && document.activeElement?.tagName !== 'INPUT') removeSelected();
    if (event.key === 'ArrowUp' && event.shiftKey) raiseLayer(1);
    if (event.key === 'ArrowDown' && event.shiftKey) raiseLayer(-1);
  });

  window.addEventListener('resize', () => window.requestAnimationFrame(render));
  setZoom(state.zoom);
  render();
})();
