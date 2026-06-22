/* ============================
   CHAT DEMO — animated WhatsApp conversation
   ============================ */

function now() {
  return new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function createBubble(text, type) {
  const bubble = document.createElement('div');
  bubble.className = `bubble bubble-${type}`;
  bubble.innerHTML = `${text}<div class="bubble-time">${now()} ✓✓</div>`;
  return bubble;
}

function createTyping() {
  const el = document.createElement('div');
  el.className = 'typing-indicator';
  el.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
  return el;
}

function scrollToBottom(container) {
  container.scrollTop = container.scrollHeight;
}

function playConversation(container, messages, onDone) {
  container.innerHTML = '';
  let delay = 600;

  messages.forEach(({ text, type, pause }) => {
    if (type === 'received') {
      // show typing first
      setTimeout(() => {
        const typing = createTyping();
        container.appendChild(typing);
        scrollToBottom(container);

        setTimeout(() => {
          container.removeChild(typing);
          const bubble = createBubble(text, type);
          container.appendChild(bubble);
          scrollToBottom(container);
        }, pause || 1200);
      }, delay);
      delay += (pause || 1200) + 400;
    } else {
      setTimeout(() => {
        const bubble = createBubble(text, type);
        container.appendChild(bubble);
        scrollToBottom(container);
      }, delay);
      delay += 500;
    }
  });

  if (onDone) setTimeout(onDone, delay + 2000);
}

/* ============================
   HERO chat — loops indefinitely
   ============================ */
const heroMessages = [
  { type: 'sent',     text: 'Hola! Quiero pedir cita para el viernes por la tarde 💇‍♂️' },
  { type: 'received', text: '¡Hola! Claro, tengo disponibilidad el <b>viernes a las 17:30 y 18:00</b>. ¿Cuál te viene mejor?', pause: 1500 },
  { type: 'sent',     text: 'Las 17:30 perfecto!' },
  { type: 'received', text: '✅ ¡Perfecto! Tu cita queda confirmada para el <b>viernes a las 17:30</b>. Te enviaré un recordatorio el día antes. ¡Hasta el viernes!', pause: 1800 },
];

function startHeroChat() {
  const container = document.getElementById('heroChatMessages');
  if (!container) return;
  playConversation(container, heroMessages, () => {
    setTimeout(startHeroChat, 3000);
  });
}

/* ============================
   DEMO chat (how-it-works section) — plays once when visible
   ============================ */
const demoMessages = [
  { type: 'sent',     text: 'Buenos días! Necesito cita para corte y barba, preferiblemente el sábado por la mañana 🪒' },
  { type: 'received', text: '¡Buenos días! Con mucho gusto. El sábado tengo disponible a las <b>10:00, 10:30 y 11:00</b>. ¿Qué hora prefieres?', pause: 2000 },
  { type: 'sent',     text: 'Las 10:30 genial' },
  { type: 'received', text: 'Perfecto! ¿Me confirmas tu nombre para la reserva?', pause: 1200 },
  { type: 'sent',     text: 'Soy Carlos Martínez' },
  { type: 'received', text: '✅ ¡Listo, Carlos! Cita confirmada:\n📅 <b>Sábado, 10:30</b>\n✂️ Corte + barba\n📍 Tu Negocio\n\nTe enviamos un recordatorio el viernes. ¡Hasta el sábado!', pause: 2200 },
];

let demoChatPlayed = false;

function startDemoChat() {
  if (demoChatPlayed) return;
  demoChatPlayed = true;
  const container = document.getElementById('demoChatMessages');
  if (!container) return;
  playConversation(container, demoMessages);
}

/* ============================
   INIT
   ============================ */
document.addEventListener('DOMContentLoaded', () => {
  // Start hero chat after a short delay
  setTimeout(startHeroChat, 1200);

  // Start demo chat when the section scrolls into view
  const demoSection = document.querySelector('.chat-demo-wrapper');
  if (demoSection) {
    const demoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          startDemoChat();
          demoObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    demoObserver.observe(demoSection);
  }
});
