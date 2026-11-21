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
  // over a dark section the frosted bar switches to light text
  const hb = header.getBoundingClientRect().bottom;
  const under = document.elementsFromPoint(innerWidth / 2, Math.min(hb + 4, innerHeight - 1)).find(el => !header.contains(el));
  header.classList.toggle('on-dark', y > 150 && !!under?.closest('.dark-section'));
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
document.querySelectorAll('.price-marquee').forEach(el => el.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); el.click(); } }));
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
    const response = await fetch('/api/enquiry', {
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
    status.textContent = 'Sorry, that did not send. Please check your connection and try again.';
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
const reelDialog = document.querySelector('#reel-dialog');
const reelPlayer = document.querySelector('#reel-player');
const reelGallery = document.querySelector('.founder-reels');
document.querySelectorAll('.fr-open').forEach(button => button.addEventListener('click', () => {
  const card = button.closest('.fr-card');
  const preview = card.querySelector('video');
  document.querySelector('#reel-dialog-title').textContent = card.querySelector('figcaption').lastChild.textContent.trim();
  reelPlayer.src = preview.getAttribute('src') + '?v=20261119-audio';
  reelPlayer.poster = preview.getAttribute('poster');
  reelPlayer.muted = false;
  reelGallery.classList.add('reel-open');
  openDialog(reelDialog, button.closest('.fr-set[aria-hidden]') ? reelGallery.querySelector('.fr-window') : button);
  reelPlayer.play().catch(() => {});
}));
reelDialog?.addEventListener('close', () => {
  reelPlayer.pause();
  reelPlayer.removeAttribute('src');
  reelPlayer.load();
  reelGallery.classList.remove('reel-open');
});
const heroVideo = document.querySelector('.hero-video');
if (heroVideo && reducedMotion.matches) { heroVideo.removeAttribute('autoplay'); heroVideo.pause(); }
document.querySelector('#year').textContent = new Date().getFullYear();

// "Find your rhythm" tiles: scroll the pinned scene to the form, or (phones / reduced motion) open the class finder pre-selected.
document.querySelectorAll('.rt[data-form]').forEach(tile => tile.addEventListener('click', event => {
  if (window.rhythmGoTo && window.rhythmGoTo(Number(tile.dataset.k))) return;
  style.value = tile.dataset.form;
  updateSelection();
  openDialog(bookingDialog, event.currentTarget);
}));

/* Mobile menu (hamburger) */
(() => {
  const trigger = document.querySelector('.menu-trigger');
  const menu = document.querySelector('#menu-dialog');
  if (!trigger || !menu) return;
  trigger.addEventListener('click', event => openDialog(menu, event.currentTarget));
  menu.querySelectorAll('nav a').forEach(link => link.addEventListener('click', () => menu.close()));
  menu.querySelector('[data-menu-book]')?.addEventListener('click', () => {
    menu.close();
    document.querySelector('.site-header .book-trigger')?.click();
  });
})();

/* Keep the founder gallery moving only while it is near the viewport. */
const founderReels = document.querySelector('.founder-reels');
if (founderReels) {
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      founderReels.classList.toggle('is-visible', entries[0].isIntersecting);
    }, { rootMargin: '120px 0px' }).observe(founderReels);
  } else {
    founderReels.classList.add('is-visible');
  }
}
