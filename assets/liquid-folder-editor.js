/* Live controls for the local scroll composition.
   Every value is a CSS custom property, so the editor never rewrites source content. */
(() => {
  'use strict';

  const root = document.documentElement;
  const editor = document.getElementById('flowEditor');
  const toggle = document.getElementById('flowEditorToggle');
  const close = document.getElementById('flowEditorClose');
  if (!editor || !toggle) return;

  const storageKey = 'signal-liquid-folder-editor-v1';
  const controls = [...editor.querySelectorAll('input[type="range"]')];
  const folders = [...document.querySelectorAll('.journey-folder')];
  const cats = [...document.querySelectorAll('.journey-cat')];
  const defaults = new Map(controls.map(control => [control, control.defaultValue]));

  const keyFor = control => {
    if (control.dataset.editorVar) return `var:${control.dataset.editorVar}`;
    if (control.dataset.catField) return `cat:${control.dataset.cat}:${control.dataset.catField}`;
    if (control.dataset.folderField) {
      return `folder:${control.dataset.folder || control.dataset.folderGroup || 'all'}:${control.dataset.folderField}`;
    }
    return control.id;
  };

  const trimNumber = value => {
    const number = Number(value);
    return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  };

  function formatValue(control) {
    const value = trimNumber(control.value);
    const unit = control.dataset.editorUnit || '';
    if (unit === 'scale') return `${Number(control.value).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}×`;
    return `${value}${unit}`;
  }

  function updateOutput(control) {
    const output = control.parentElement?.querySelector('output');
    if (output) output.textContent = formatValue(control);
  }

  function setFolderValue(folder, field, value) {
    const property = field === 'scale' ? '--folder-scale' : `--folder-${field}`;
    folder.style.setProperty(property, field === 'scale' ? value : `${value}px`);
  }

  function applyControl(control) {
    const value = control.value;
    updateOutput(control);

    if (control.dataset.editorVar) {
      const unit = control.dataset.editorUnit || '';
      root.style.setProperty(control.dataset.editorVar, `${value}${unit === 'scale' ? '' : unit}`);
      return;
    }

    if (control.dataset.catField) {
      const cat = cats.find(candidate => candidate.classList.contains(`journey-cat--${control.dataset.cat}`));
      if (!cat) return;
      const property = control.dataset.catField === 'size'
        ? '--journey-cat-size'
        : `--journey-cat-${control.dataset.catField}`;
      cat.style.setProperty(property, `${value}px`);
      return;
    }

    if (control.dataset.folderField) {
      const targets = control.dataset.folderGroup === 'all'
        ? folders
        : folders.filter(folder => folder.classList.contains(`journey-folder--${control.dataset.folder}`));
      targets.forEach(folder => setFolderValue(folder, control.dataset.folderField, value));
    }
  }

  function snapshot() {
    return Object.fromEntries(controls.map(control => [keyFor(control), control.value]));
  }

  function save() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(snapshot()));
    } catch {
      // A file:// preview may disable storage; the controls still work in memory.
    }
  }

  function restoreSaved() {
    let saved = {};
    try {
      saved = JSON.parse(window.localStorage.getItem(storageKey) || '{}') || {};
    } catch {
      saved = {};
    }
    controls.forEach(control => {
      if (saved[keyFor(control)] !== undefined) control.value = saved[keyFor(control)];
      applyControl(control);
    });
  }

  function clearInlineValues() {
    ['--journey-line-base', '--journey-line-highlight', '--journey-line-sheen', '--journey-cat-scale', '--journey-cat-layer', '--journey-folder-width', '--journey-folder-height', '--journey-folder-layer'].forEach(property => root.style.removeProperty(property));
    cats.forEach(cat => {
      cat.style.removeProperty('--journey-cat-size');
      cat.style.removeProperty('--journey-cat-x');
      cat.style.removeProperty('--journey-cat-y');
    });
    folders.forEach(folder => {
      folder.style.removeProperty('--folder-scale');
      folder.style.removeProperty('--folder-x');
      folder.style.removeProperty('--folder-y');
    });
  }

  function reset() {
    clearInlineValues();
    controls.forEach(control => {
      control.value = defaults.get(control);
      applyControl(control);
    });
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Keep the reset usable when storage is unavailable.
    }
  }

  function setOpen(open) {
    editor.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('span').textContent = open ? 'CLOSE EDITOR' : 'OPEN EDITOR';
    if (open) editor.querySelector('input')?.focus();
  }

  controls.forEach(control => {
    control.addEventListener('input', () => {
      applyControl(control);
      save();
    });
  });

  toggle.addEventListener('click', () => setOpen(editor.hidden));
  close?.addEventListener('click', () => setOpen(false));
  document.getElementById('flowEditorSave')?.addEventListener('click', event => {
    save();
    const button = event.currentTarget;
    const original = button.textContent;
    button.textContent = '已保存到本地';
    window.setTimeout(() => { button.textContent = original; }, 1200);
  });
  document.getElementById('flowEditorReset')?.addEventListener('click', reset);

  restoreSaved();
})();
