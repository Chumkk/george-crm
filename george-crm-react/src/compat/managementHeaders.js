// The table keeps its horizontal scroll area; a presentation-only header follows
// the outer page's vertical scroll, directly below its sticky toolbar.
export function attachManagementHeader(root) {
  const page = root.closest('.page');
  if (!page || !['projects', 'opps'].includes(page.dataset.kind)) return;
  const toolbar = root.querySelector('.toolbar');
  const box = root.querySelector('.table-box');
  const table = box?.querySelector('table');
  const head = table?.tHead;
  if (!toolbar || !head) return;
  const doc = root.ownerDocument, win = doc.defaultView;
  const pinned = doc.createElement('div');
  pinned.className = 'rx-management-header';
  pinned.setAttribute('aria-hidden', 'true');
  pinned.inert = true;
  pinned.hidden = true;
  page.appendChild(pinned);
  let frame = 0, dirty = true, stopped = false;
  function render() {
    frame = 0;
    const headerRect = head.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();
    const tableRect = table.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    const top = toolbarRect.bottom;
    const visible = page.getBoundingClientRect().width > 0 &&
      headerRect.top < top && tableRect.bottom > top + headerRect.height;
    pinned.hidden = !visible;
    if (!visible) return;
    if (dirty) {
      const copy = table.cloneNode(false), copyHead = head.cloneNode(true);
      copy.removeAttribute('id');
      copyHead.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      const originals = head.querySelectorAll('th,td');
      copyHead.querySelectorAll('th,td').forEach((cell, index) => {
        const original = originals[index], width = original.getBoundingClientRect().width;
        cell.style.boxSizing = 'border-box';
        cell.style.width = cell.style.minWidth = cell.style.maxWidth = width + 'px';
        cell.style.display = win.getComputedStyle(original).display;
      });
      copy.style.width = copy.style.minWidth = tableRect.width + 'px';
      copy.style.tableLayout = 'fixed';
      copy.appendChild(copyHead);
      pinned.replaceChildren(copy);
      dirty = false;
    }
    Object.assign(pinned.style, {
      top: top + 'px', left: boxRect.left + box.clientLeft + 'px',
      width: box.clientWidth + 'px', height: headerRect.height + 'px',
    });
    pinned.scrollLeft = box.scrollLeft;
  }
  function schedule() { if (!stopped && !frame) frame = win.requestAnimationFrame(render); }
  function invalidate() { dirty = true; schedule(); }
  const resize = new win.ResizeObserver(invalidate);
  [page, toolbar, box, table, head].forEach(element => resize.observe(element));
  const changes = new win.MutationObserver(invalidate);
  changes.observe(head, { childList: true, subtree: true, attributes: true, characterData: true });
  page.addEventListener('scroll', schedule, { passive: true });
  box.addEventListener('scroll', schedule, { passive: true });
  win.addEventListener('resize', invalidate);
  doc.fonts?.ready.then(invalidate);
  schedule();
  return () => {
    stopped = true;
    resize.disconnect(); changes.disconnect();
    page.removeEventListener('scroll', schedule); box.removeEventListener('scroll', schedule);
    win.removeEventListener('resize', invalidate);
    if (frame) win.cancelAnimationFrame(frame);
    pinned.remove();
  };
}
