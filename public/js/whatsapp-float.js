'use strict';

(function () {
  const btn          = document.getElementById('whatsappFloatBtn');
  const bubble       = document.getElementById('whatsappFloatBubble');
  const overlay      = document.getElementById('whatsappModalOverlay');
  const closeBtn     = document.getElementById('whatsappModalClose');
  const qrContainer  = document.getElementById('whatsappModalQr');
  const numberBtn    = document.getElementById('whatsappModalNumber');
  const copiedNotice = document.getElementById('whatsappModalCopied');

  if (!btn) return;

  const BUBBLE_MESSAGES = [
    '¿Tienes alguna duda?',
    '¿Te ayudo con algo?',
    '¡Escríbenos por WhatsApp!',
    '¿Quieres ver una demo?',
  ];
  const BUBBLE_FIRST_DELAY = 3000;
  const BUBBLE_INTERVAL    = 15000;
  const BUBBLE_VISIBLE_FOR = 6000;

  let bubbleIndex   = 0;
  let bubbleTimer   = null;
  let hasInteracted = false;

  function showBubble() {
    if (!bubble || hasInteracted) return;
    bubble.textContent = BUBBLE_MESSAGES[bubbleIndex % BUBBLE_MESSAGES.length];
    bubbleIndex += 1;
    bubble.hidden = false;
    requestAnimationFrame(() => bubble.classList.add('is-visible'));
    setTimeout(hideBubble, BUBBLE_VISIBLE_FOR);
  }

  function hideBubble() {
    if (!bubble) return;
    bubble.classList.remove('is-visible');
    setTimeout(() => { bubble.hidden = true; }, 250);
  }

  function stopBubbleLoop() {
    hasInteracted = true;
    hideBubble();
    clearInterval(bubbleTimer);
  }

  if (bubble) {
    setTimeout(() => {
      showBubble();
      bubbleTimer = setInterval(showBubble, BUBBLE_INTERVAL);
    }, BUBBLE_FIRST_DELAY);

    bubble.addEventListener('click', () => btn.click());
  }

  function isMobileDevice() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  function formatNumber(number) {
    // "34600000000" -> "+34 600 000 000"
    const cc  = number.slice(0, 2);
    const rest = number.slice(2);
    return `+${cc} ${rest.replace(/(\d{3})(?=\d)/g, '$1 ')}`.trim();
  }

  let whatsappInfo = null;

  async function fetchWhatsappInfo() {
    if (whatsappInfo) return whatsappInfo;
    const resp = await fetch('/api/whatsapp-link');
    if (!resp.ok) throw new Error('WhatsApp no disponible');
    whatsappInfo = await resp.json();
    return whatsappInfo;
  }

  function openModal(info) {
    qrContainer.innerHTML = '<img src="/api/whatsapp-qr.svg" width="200" height="200" alt="Código QR de WhatsApp" />';
    numberBtn.textContent = formatNumber(info.number);
    copiedNotice.hidden = true;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.style.overflow = '';
    btn.focus();
  }

  btn.addEventListener('click', async () => {
    stopBubbleLoop();

    let info;
    try {
      info = await fetchWhatsappInfo();
    } catch {
      return;
    }

    if (isMobileDevice()) {
      window.open(info.link, '_blank', 'noopener');
    } else {
      openModal(info);
    }
  });

  closeBtn?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay && !overlay.hidden) closeModal();
  });

  numberBtn?.addEventListener('click', async () => {
    if (!whatsappInfo) return;
    try {
      await navigator.clipboard.writeText(`+${whatsappInfo.number}`);
      copiedNotice.hidden = false;
    } catch {
      // Clipboard API unavailable — the number is already visible to copy manually.
    }
  });
})();
