import React, { forwardRef, useEffect, useMemo, useRef, useState, useImperativeHandle } from 'react';
import { renderCV } from '../../../../shared/cv/render.mjs';
import { fontStyles } from '../../../../shared/cv/fonts.mjs';
import css from '../../../../shared/cv/document.css?raw';

const CVRenderer = forwardRef(function CVRenderer({ template, cvData, revision, avatarData, zoom = 'fit', onChange, onAction, onSelect, onReflow, onUndo, onRedo }, ref) {
  const iframe = useRef(null);
  const callbacks = useRef({});
  callbacks.current = { onChange, onAction, onSelect, onReflow, onUndo, onRedo };
  const [height, setHeight] = useState(1150);
  const [width, setWidth] = useState(794);
  const [error, setError] = useState('');
  const container = useRef(null);
  // Only structural edits rebuild the document; typing never replaces the active node.
  const html = useMemo(() => renderCV(cvData, { template, editable: true, avatarData, css, fontCSS: fontStyles() }), [revision, avatarData]);
  useImperativeHandle(ref, () => ({ flush() {
    const active = iframe.current?.contentDocument?.activeElement;
    if (active?.hasAttribute('data-path')) active.blur();
  } }));
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.min(794, entry.contentRect.width)));
    observer.observe(container.current);
    const receive = event => {
      if (event.source !== iframe.current?.contentWindow || event.data?.type !== 'cv-ready') return;
      setHeight(event.data.height); setError('');
    };
    window.addEventListener('message', receive);
    return () => { observer.disconnect(); window.removeEventListener('message', receive); };
  }, []);
  function bind() {
    const doc = iframe.current.contentDocument;
    let composing = false;
    const read = el => {
      if (!el?.dataset.path) return;
      const path = el.dataset.path;
      const parts = [...doc.querySelectorAll('[data-path]')].filter(node => node.dataset.path === path);
      const value = parts.map(node => node.innerText.replace(/\u00a0/g, ' ')).join('');
      callbacks.current.onChange(path, path.startsWith('skills.') ? value.split('\n').map(s => s.trim()).filter(Boolean) : value);
    };
    doc.addEventListener('compositionstart', () => { composing = true; });
    doc.addEventListener('compositionend', event => { composing = false; read(event.target); });
    doc.addEventListener('input', event => { if (!composing && !event.isComposing) read(event.target); });
    doc.addEventListener('paste', event => {
      if (!event.target.hasAttribute('data-path')) return;
      event.preventDefault();
      let text = event.clipboardData.getData('text/plain');
      if (event.target.getAttribute('aria-multiline') !== 'true') text = text.replace(/[\r\n]+/g, ' ');
      doc.execCommand('insertText', false, text); read(event.target);
    });
    doc.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase()) && !composing) {
        event.preventDefault();
        if (event.shiftKey || event.key.toLowerCase() === 'y') callbacks.current.onRedo(); else callbacks.current.onUndo();
      }
      if (event.key === 'Enter' && !composing && event.target.hasAttribute('data-path')) {
        event.preventDefault();
        if (event.target.getAttribute('aria-multiline') === 'true') { doc.execCommand('insertText', false, '\n'); read(event.target); }
      }
    });
    doc.addEventListener('focusout', event => {
      if (!composing) read(event.target);
      setTimeout(() => {
        if (!composing && !doc.activeElement?.closest('[data-path],button,input')) callbacks.current.onReflow();
      }, 100);
    });
    doc.defaultView.addEventListener('blur', () => {
      if (!composing) { read(doc.activeElement); callbacks.current.onReflow(); }
    });
    doc.addEventListener('click', event => {
      const section = event.target.closest('[data-section]');
      if (section) {
        doc.querySelectorAll('.is-selected').forEach(node => node.classList.remove('is-selected'));
        event.target.closest('.cv-section')?.classList.add('is-selected');
        callbacks.current.onSelect(section.dataset.section);
      }
      const action = event.target.closest('[data-action]');
      if (action) callbacks.current.onAction(action.dataset.section, action.dataset.action, action.dataset.index);
    });
    doc.addEventListener('change', event => {
      if (event.target.hasAttribute('data-current')) callbacks.current.onChange(`experiences.${event.target.dataset.current}.current`, event.target.checked, false);
    });
    setTimeout(() => { if (doc.documentElement.dataset.error) setError('Không thể phân trang CV. Hãy tải lại trang.'); }, 5000);
  }
  const scale = zoom === 'actual' ? 1 : width / 794;
  return <div className="cv-canvas" ref={container} style={{ overflowX: zoom === 'actual' ? 'auto' : 'hidden' }}>
    {error && <p role="alert">{error}</p>}
    <div style={{ height: height * scale, width }}>
      <iframe ref={iframe} title="CV — bấm vào nội dung để chỉnh sửa" srcDoc={html} onLoad={bind}
        style={{ width: 794, height, border: 0, transform: `scale(${scale})`, transformOrigin: 'top left', display: 'block' }} />
    </div>
  </div>;
});
export default CVRenderer;
