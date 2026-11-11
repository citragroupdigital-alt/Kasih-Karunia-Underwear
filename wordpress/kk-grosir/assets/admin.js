(() => {
  'use strict';
  if (typeof wp === 'undefined' || !wp.media) return;
  document.addEventListener('click', event => {
    const pick = event.target.closest('[data-kkg-media-pick]');
    if (pick) {
      event.preventDefault();
      const wrap = pick.closest('.kkg-media-field');
      const input = wrap.querySelector('input[type="number"]');
      const preview = wrap.querySelector('.kkg-media-preview');
      const frame = wp.media({ title: 'Pilih Gambar KK Grosir', library: { type: 'image' }, multiple: false });
      frame.on('select', () => {
        const attachment = frame.state().get('selection').first().toJSON();
        input.value = String(attachment.id || 0);
        const url = (attachment.sizes && attachment.sizes.thumbnail ? attachment.sizes.thumbnail.url : attachment.url) || '';
        preview.textContent = '';
        if (url) {
          const img = document.createElement('img');
          img.src = url;
          img.alt = attachment.alt || attachment.title || '';
          preview.appendChild(img);
        }
      });
      frame.open();
      return;
    }
    const clear = event.target.closest('[data-kkg-media-clear]');
    if (clear) {
      event.preventDefault();
      const wrap = clear.closest('.kkg-media-field');
      wrap.querySelector('input[type="number"]').value = '0';
      const preview = wrap.querySelector('.kkg-media-preview');
      preview.textContent = 'Kosong';
    }
  });
})();

