// Runs in the preview iframe and in Chromium's PDF page. No app state or network access.
export async function paginateCV() {
  await document.fonts.ready;
  await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
  const source = document.querySelector('.cv-source');
  const output = document.querySelector('.cv-pages');
  if (!source || !output) return;
  output.replaceChildren();
  const template = document.body.dataset.template;
  const pages = [];
  function makePage() {
    const page = document.createElement('article');
    page.className = `cv-page cv-${template}`;
    const columns = document.createElement('div');
    columns.className = 'cv-columns';
    for (const key of (template === 'minimal' ? ['main'] : ['side', 'main'])) {
      const col = document.createElement('div');
      col.className = `cv-column cv-${key}`;
      col.dataset.column = key;
      columns.append(col);
    }
    page.append(columns);
    output.append(page);
    pages.push(page);
    return page;
  }
  const first = makePage();
  const header = source.querySelector(':scope > .cv-header');
  if (header) first.prepend(header.cloneNode(true));
  const capacity = col => col.clientHeight;
  const fits = col => col.scrollHeight <= capacity(col) + 1;
  for (const sourceCol of source.querySelectorAll(':scope > .cv-columns > .cv-column')) {
    const key = sourceCol.dataset.column;
    let pageIndex = 0;
    let col = first.querySelector(`[data-column="${key}"]`);
    function nextPage() {
      pageIndex++;
      const page = pages[pageIndex] || makePage();
      col = page.querySelector(`[data-column="${key}"]`);
    }
    for (const block of sourceCol.children) {
      if (!block.classList.contains('cv-section')) {
        const clone = block.cloneNode(true);
        col.append(clone);
        if (!fits(col) && col.children.length > 1) { clone.remove(); nextPage(); col.append(clone); }
        continue;
      }
      let section;
      function openSection(continued = false) {
        section = block.cloneNode(false);
        const heading = block.querySelector(':scope > .cv-section-heading');
        if (heading) {
          const clone = heading.cloneNode(true);
          if (continued) clone.classList.add('cv-continuation');
          section.append(clone);
        }
        col.append(section);
      }
      openSection();
      for (const entry of block.querySelectorAll(':scope > .cv-entry')) {
        let item = entry.cloneNode(true);
        section.append(item);
        if (fits(col)) continue;
        item.remove();
        // Move a whole entry first; leave no heading orphaned on the previous page.
        const hasItems = section.querySelector('.cv-entry');
        const hasPrevious = col.children.length > 1 || hasItems;
        if (!hasItems) section.remove();
        if (hasPrevious) { nextPage(); openSection(!!hasItems); }
        else if (!section.isConnected) openSection();
        section.append(item);
        while (!fits(col)) {
          const description = item.querySelector('.cv-description');
          if (!description || !description.textContent.trim()) {
            // Pathological long non-description fields are flowed as text, never clipped.
            const flow = document.createElement('div');
            flow.className = 'cv-description';
            flow.textContent = item.innerText;
            item.replaceChildren(flow);
          }
          const field = item.querySelector('.cv-description');
          const original = field.textContent;
          const words = original.match(/\S+\s*|\s+/gu) || [original];
          let lo = 0, hi = words.length;
          while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2);
            field.textContent = words.slice(0, mid).join('');
            if (fits(col)) lo = mid; else hi = mid - 1;
          }
          if (!lo) {
            // An extremely long unbroken token still needs to wrap and split.
            if (words.length === 1 && original.length > 1) {
              words.splice(0, 1, ...Array.from(original));
              hi = words.length;
              while (lo < hi) {
                const mid = Math.ceil((lo + hi) / 2);
                field.textContent = words.slice(0, mid).join('');
                if (fits(col)) lo = mid; else hi = mid - 1;
              }
            }
            if (!lo) lo = 1;
          }
          field.textContent = words.slice(0, lo).join('');
          const remainder = words.slice(lo).join('');
          if (!remainder) break;
          // Record fragment offsets so editing one page preserves all other fragments.
          const path = field.dataset.path;
          const start = Number(field.dataset.fragmentStart || 0);
          field.dataset.fragmentStart = String(start);
          field.dataset.fragmentEnd = String(start + field.textContent.length);
          const continuation = item.cloneNode(false);
          continuation.classList.add('cv-entry-continuation');
          const tail = field.cloneNode(false);
          tail.textContent = remainder;
          if (path) { tail.dataset.path = path; tail.dataset.fragmentStart = String(start + field.textContent.length); tail.dataset.fragmentEnd = String(start + original.length); }
          continuation.append(tail);
          nextPage(); openSection(true);
          item = continuation;
          section.append(item);
        }
      }
    }
  }
  source.remove();
  pages.forEach((page, index) => {
    const label = document.createElement('span');
    label.className = 'cv-page-number';
    label.textContent = `${index + 1} / ${pages.length}`;
    page.append(label);
  });
  document.documentElement.dataset.ready = 'true';
  window.parent?.postMessage({ type: 'cv-ready', height: document.body.scrollHeight, pages: pages.length }, '*');
}
