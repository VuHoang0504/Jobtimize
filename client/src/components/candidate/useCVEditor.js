import { useCallback, useEffect, useRef, useState } from 'react';

export function useCVEditor(initial) {
  const [value, setValue] = useState(initial);
  const current = useRef(initial);
  const [revision, setRevision] = useState(0);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const history = useRef({ past: [], future: [], group: null });
  const pending = useRef(false);
  const publish = useCallback((next, redraw) => {
    current.current = next; setValue(next);
    setHistoryState({ canUndo: !!history.current.past.length, canRedo: !!history.current.future.length });
    if (redraw) { pending.current = false; setRevision(v => v + 1); } else pending.current = true;
  }, []);
  const change = useCallback((update, { inline = false, group = null } = {}) => {
    const before = current.current;
    const next = typeof update === 'function' ? update(before) : update;
    if (JSON.stringify(before) === JSON.stringify(next)) return;
    const h = history.current;
    if (!group || h.group !== group) h.past = [...h.past.slice(-79), before];
    h.group = group; h.future = [];
    publish(next, !inline);
  }, [publish]);
  const undo = useCallback(() => {
    const h = history.current; if (!h.past.length) return;
    h.future.unshift(current.current); h.group = null;
    publish(h.past.pop(), true);
  }, [publish]);
  const redo = useCallback(() => {
    const h = history.current; if (!h.future.length) return;
    h.past.push(current.current); h.group = null;
    publish(h.future.shift(), true);
  }, [publish]);
  const reset = useCallback(next => { history.current = { past: [], future: [], group: null }; publish(next, true); }, [publish]);
  const reflow = useCallback(() => { if (pending.current) { pending.current = false; history.current.group = null; setRevision(v => v + 1); } }, []);
  return { value, current, change, undo, redo, reset, reflow, revision, ...historyState };
}

export function useUnsavedCV(dirty) {
  const latest = useRef(dirty); latest.current = dirty;
  useEffect(() => {
    const message = 'CV có thay đổi chưa lưu. Bạn có muốn rời trang?';
    const unload = event => { if (latest.current) { event.preventDefault(); event.returnValue = ''; } };
    const click = event => {
      const link = event.target.closest('a[href]');
      if (!latest.current || !link || link.target === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey || link.hasAttribute('download')) return;
      if (link.href === window.location.href || link.getAttribute('href')?.startsWith('#')) return;
      if (!window.confirm(message)) { event.preventDefault(); event.stopPropagation(); }
    };
    let index = window.history.state?.idx || 0;
    let reverting = false;
    const pop = event => {
      const next = event.state?.idx ?? index;
      if (reverting) { reverting = false; event.stopImmediatePropagation(); return; }
      if (latest.current && !window.confirm(message)) {
        event.stopImmediatePropagation(); reverting = true;
        window.history.go(index - next || 1);
      } else index = next;
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', click, true);
    window.addEventListener('popstate', pop, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', click, true); window.removeEventListener('popstate', pop, true); };
  }, []);
}
