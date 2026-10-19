const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (!reducedMotion.matches) document.documentElement.classList.add('js-motion');
const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); }
}), { threshold: .1 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

const header = document.querySelector('#header');
const hero = document.querySelector('.hero');
const heroTitle = document.querySelector('#hero-title');
const heroMedia = document.querySelector('.hero-media');
const leftCard = document.querySelector('.floating-left');
const rightCard = document.querySelector('.floating-right');
const founderStack = document.querySelector('.founder-stack');
let scheduled = false;
function updateScroll() {
  const y = window.scrollY;
  header.classList.toggle('scrolled', y > 150);
  // hero parallax now lives in motion.css/motion.js (lerped --progress)
  if (founderStack && !reducedMotion.matches) {
    const rect = founderStack.getBoundingClientRect();
    founderStack.style.setProperty('--fan', Math.max(0, Math.min(1, (innerHeight - rect.top) / innerHeight)));
  }
  scheduled = false;
}
window.addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateScroll); } }, { passive: true });
window.addEventListener('resize', updateScroll);
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) {
    [heroTitle, heroMedia, leftCard, rightCard].forEach(el => el?.style.removeProperty('transform'));
    document.documentElement.classList.remove('js-motion');
  }
  updateScroll();
});
updateScroll();

const menuDialog = document.querySelector('#menu-dialog');
const bookingDialog = document.querySelector('#booking-dialog');
const filmDialog = document.querySelector('#film-dialog');
let returnFocus = null;
function openDialog(dialog, trigger) {
  returnFocus = trigger;
  document.body.classList.add('locked');
  dialog.showModal();
  dialog.querySelector('[data-close]')?.focus();
}
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const r = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('locked');
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  });
});
document.querySelector('.menu-trigger').addEventListener('click', event => openDialog(menuDialog, event.currentTarget));
menuDialog.querySelectorAll('nav a').forEach(link => link.addEventListener('click', () => menuDialog.close()));

const goal = document.querySelector('#goal');
const style = document.querySelector('#style');
function updateSelection() {
  const parts = [];
  if (goal.value !== 'Help me choose') parts.push(goal.value);
  if (style.value !== 'Help me choose') parts.push(style.value);
  document.querySelector('#selection-summary').textContent = parts.length ? parts.join(' / ') : 'A little guidance to find your first class.';
}
document.querySelectorAll('.book-trigger, [data-goal], [data-style]').forEach(button => button.addEventListener('click', event => {
  if (button.dataset.goal) { goal.value = button.dataset.goal; style.value = 'Help me choose'; }
  else if (button.dataset.style) { style.value = button.dataset.style; }
  updateSelection();
  openDialog(bookingDialog, event.currentTarget);
}));
goal.addEventListener('change', updateSelection);
style.addEventListener('change', updateSelection);
const classFinder = document.querySelector('#class-finder');
classFinder.addEventListener('submit', async event => {
  event.preventDefault();
  if (classFinder.elements['bot-field'].value) return; // honeypot: bots fill this in
  const status = classFinder.querySelector('.form-status');
  const send = classFinder.querySelector('[type="submit"]');
  send.disabled = true;
  status.textContent = 'Sending\u2026';
  try {
    const response = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(classFinder)).toString()
    });
    if (!response.ok) throw new Error('Request failed: ' + response.status);
    status.textContent = '';
    classFinder.classList.add('is-sent');
    classFinder.querySelector('.form-success').focus();
  } catch (error) {
    send.disabled = false;
    status.textContent = 'Sorry, that did not send. Please try again, or use the booking page link below.';
  }
});
bookingDialog.addEventListener('close', () => {
  if (classFinder.classList.contains('is-sent')) { classFinder.reset(); classFinder.classList.remove('is-sent'); classFinder.querySelector('[type="submit"]').disabled = false; updateSelection(); }
});
const filmVideo = document.querySelector('#film-video');
const filmPlaceholderParts = document.querySelectorAll('#film-dialog .film-placeholder > .media-center, #film-dialog .film-placeholder > .slot-bottom');
document.querySelectorAll('[data-film]').forEach(button => button.addEventListener('click', event => {
  document.querySelector('#film-title').textContent = button.dataset.film;
  const src = button.dataset.video;
  filmPlaceholderParts.forEach(part => { part.hidden = Boolean(src); });
  filmVideo.hidden = !src;
  if (src) { filmVideo.src = src; filmVideo.currentTime = 0; filmVideo.play().catch(() => {}); }
  openDialog(filmDialog, event.currentTarget);
}));
filmDialog?.addEventListener('close', () => { filmVideo.pause(); filmVideo.removeAttribute('src'); filmVideo.load(); });
const heroVideo = document.querySelector('.hero-video');
if (heroVideo && reducedMotion.matches) { heroVideo.removeAttribute('autoplay'); heroVideo.pause(); }
document.querySelector('#year').textContent = new Date().getFullYear();

const testimonialsSection = document.querySelector('#love');
const testimonialSlots = [...document.querySelectorAll('.t-cards .t-card')];
const testimonialTemplate = document.querySelector('#testimonial-placeholders');
if (testimonialsSection && testimonialSlots.length && testimonialTemplate) {
  const entries = [...testimonialSlots, ...testimonialTemplate.content.querySelectorAll('.t-card')].map(card => ({
    quote: card.querySelector('blockquote p').textContent,
    name: card.querySelector('figcaption').textContent,
    placeholder: card.hasAttribute('data-placeholder')
  }));
  let nextEntry = testimonialSlots.length;
  let nextSlot = 0;
  window.setInterval(() => {
    const bounds = testimonialsSection.getBoundingClientRect();
    if (bounds.top >= innerHeight || bounds.bottom <= 0 || document.hidden || reducedMotion.matches || testimonialSlots.some(card => card.matches(':hover'))) return;
    const card = testimonialSlots[nextSlot];
    const entry = entries[nextEntry];
    card.classList.add('is-changing');
    window.setTimeout(() => {
      card.querySelector('blockquote p').textContent = entry.quote;
      card.querySelector('figcaption').textContent = entry.name;
      card.classList.toggle('is-placeholder', entry.placeholder);
      card.classList.remove('is-changing');
    }, 550);
    nextEntry = (nextEntry + 1) % entries.length;
    nextSlot = (nextSlot + 1) % testimonialSlots.length;
  }, 3200);
}

// "Find your rhythm" tiles: scroll the pinned scene to the form, or (phones / reduced motion) open the class finder pre-selected.
document.querySelectorAll('.rt[data-form]').forEach(tile => tile.addEventListener('click', event => {
  if (window.rhythmGoTo && window.rhythmGoTo(Number(tile.dataset.k))) return;
  style.value = tile.dataset.form;
  updateSelection();
  openDialog(bookingDialog, event.currentTarget);
}));
