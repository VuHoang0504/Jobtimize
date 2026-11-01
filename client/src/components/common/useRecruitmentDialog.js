import { useEffect, useRef } from 'react';

export default function useRecruitmentDialog() {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    const keepFocus = event => {
      if (event.key !== 'Tab') return;
      const controls = [...element.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]')]
        .filter(control => control.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      else if (!element.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
    };
    element.addEventListener('keydown', keepFocus);
    return () => {
      element.removeEventListener('keydown', keepFocus);
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected && !previousFocus.disabled) previousFocus.focus();
    };
  }, []);
  return dialog;
}
