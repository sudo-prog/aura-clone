/* COLDCASE — document viewer. Typewritten pages, redactions that resist. */
(function () {
  'use strict';

  const dialog = document.getElementById('docview');
  const body = document.getElementById('docviewBody');
  const title = document.getElementById('docviewTitle');
  const closeBtn = document.getElementById('docviewClose');
  const tagChip = document.getElementById('docviewTag');
  if (!dialog || !body) return;

  let lastFocus = null;

  // punched-tag label matching the board's evidence chips
  function tagFor(id) {
    let m;
    if ((m = id.match(/^doc(\d+)$/))) return 'DOC-' + m[1].padStart(2, '0');
    if ((m = id.match(/^p(\d+)$/))) return 'P-' + m[1];
    if ((m = id.match(/^e(\d+)$/))) return 'E-' + m[1];
    if (id === 'geo') return 'MEMO';
    return '';
  }

  function open(id) {
    const tpl = document.getElementById(id);
    if (!tpl) return;
    lastFocus = document.activeElement;
    // clear previous content (keep the hidden h3)
    body.querySelectorAll(':scope > *:not(#docviewTitle)').forEach((n) => n.remove());
    const frag = tpl.content.cloneNode(true);
    body.appendChild(frag);
    const head = body.querySelector('.doc-head');
    title.textContent = head ? 'Case document: ' + head.textContent.split('\n')[0] : 'Case document';
    if (tagChip) tagChip.textContent = tagFor(id);
    // arm redactions
    body.querySelectorAll('.redacted').forEach((r) => {
      r.setAttribute('tabindex', '0');
      r.setAttribute('role', 'note');
      r.setAttribute('aria-label', 'Redacted. Margin note: ' + (r.dataset.note || 'It stays black.'));
    });
    dialog.showModal();
    dialog.scrollTop = 0;
    document.querySelector('.docview-paper').scrollTop = 0;
  }

  function close() {
    dialog.close();
  }

  closeBtn.addEventListener('click', close);
  dialog.addEventListener('click', (e) => {
    // click on the backdrop (the dialog element itself) closes
    if (e.target === dialog) close();
  });
  dialog.addEventListener('close', () => {
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  });

  // inventory rows
  document.querySelectorAll('.inv-row[data-doc]').forEach((btn) => {
    btn.addEventListener('click', () => open(btn.dataset.doc));
  });

  window.CCDocs = { open };
})();
