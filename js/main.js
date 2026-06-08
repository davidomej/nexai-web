/* ============================
   NAVBAR — scroll effect + mobile toggle
   ============================ */
const navbar    = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
  document.body.style.overflow = open ? 'hidden' : '';
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  });
});

/* ============================
   SCROLL ANIMATIONS
   ============================ */
const fadeUpEls = document.querySelectorAll('.fade-up');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

fadeUpEls.forEach(el => observer.observe(el));

/* ============================
   FAQ ACCORDION
   ============================ */
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const answer   = btn.nextElementSibling;
    const isOpen   = btn.getAttribute('aria-expanded') === 'true';

    // close all
    document.querySelectorAll('.faq-question').forEach(b => {
      b.setAttribute('aria-expanded', 'false');
      b.nextElementSibling.classList.remove('open');
    });

    // open current if it was closed
    if (!isOpen) {
      btn.setAttribute('aria-expanded', 'true');
      answer.classList.add('open');
    }
  });
});

/* ============================
   CONTACT FORM
   ============================ */
const contactForm = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const original  = submitBtn.innerHTML;
    submitBtn.disabled  = true;
    submitBtn.innerHTML = 'Enviando…';

    const fd = new FormData(contactForm);
    const payload = {
      name:     fd.get('name'),
      business: fd.get('business'),
      phone:    fd.get('phone'),
      email:    fd.get('email'),
    };

    try {
      const res  = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.ok) {
        contactForm.style.display = 'none';
        formSuccess.style.display = 'block';
      } else {
        showFormError(json.error || 'Error desconocido. Inténtalo de nuevo.');
        submitBtn.disabled  = false;
        submitBtn.innerHTML = original;
      }
    } catch {
      showFormError('No se pudo conectar con el servidor. Comprueba tu conexión.');
      submitBtn.disabled  = false;
      submitBtn.innerHTML = original;
    }
  });
}

function showFormError(msg) {
  let err = document.getElementById('formError');
  if (!err) {
    err = document.createElement('p');
    err.id = 'formError';
    err.style.cssText = 'color:#e53e3e;font-size:.85rem;text-align:center;margin-top:-.5rem';
    contactForm.appendChild(err);
  }
  err.textContent = msg;
}

/* ============================
   SMOOTH SCROLL for anchor links
   ============================ */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = navbar.offsetHeight + 16;
    const top    = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});
