import './style.css';
import './theme.css';
import { stages, event } from './content.js';

document.querySelector('#steps').innerHTML = stages.map((s,i) => `
  <article class="step" id="etapa-${i+1}" aria-labelledby="speaker-${i}">
    <div class="step-top"><span class="step-number">${s.number}</span><span class="step-label">${s.label}</span></div>
    <div class="speaker-profile">
      <figure class="speaker-portrait"><img src="./images/${s.photo}" width="${s.photoWidth}" height="${s.photoHeight}" alt="Retrato de ${s.name}" loading="lazy" decoding="async"></figure>
      <div class="speaker-copy">
        <p class="speaker-kicker">Especialista convidada</p>
        <h3 class="speaker-name" id="speaker-${i}">${s.name}</h3>
        <p class="speaker-theme">${s.theme}</p>
        <p class="speaker-message">${s.title.replaceAll('<br>', ' ')}</p>
        <p class="step-description">${s.description}</p>
      </div>
    </div>
    <p class="step-metaphor">${s.metaphor}</p>
  </article>`).join('');

const cards = document.querySelector('#steps');
cards.setAttribute('tabindex', '0');
cards.setAttribute('aria-label', 'Especialistas do encontro');
cards.insertAdjacentHTML('afterend', `<div class="cards-controls">
  <button type="button" class="card-previous" aria-label="Especialista anterior" aria-controls="steps"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button>
  <p class="cards-status" aria-live="polite" aria-atomic="true">1 de 5</p>
  <button type="button" class="card-next" aria-label="Próxima especialista" aria-controls="steps"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button>
  <p class="cards-hint">Deslize para conhecer cada especialista</p>
</div>`);
const mobileCards = matchMedia('(max-width: 760px)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); }
}), { threshold: .08 });
if (!reducedMotion.matches) document.documentElement.classList.add('js-motion');
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

const modal = document.querySelector('#signup-dialog');
document.querySelector('#signup').addEventListener('click', () => {
  if (event.checkoutUrl) { window.location.assign(event.checkoutUrl); return; }
  modal.showModal();
});
document.querySelectorAll('.close-dialog,.close-dialog-button').forEach(button => button.addEventListener('click', () => modal.close()));
modal.addEventListener('click', e => { if (e.target === modal) { const r = modal.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) modal.close(); } });

const stepEls = [...document.querySelectorAll('.step')];
const stageLinks = [...document.querySelectorAll('.stage-nav a')];
const viewport = document.querySelector('.model-viewport');
const toggle = document.querySelector('.motion-toggle');
let scene, progress = 0, active = -1, paused = reducedMotion.matches, scrollPending = false;
function syncMotionLabel() {
  toggle.setAttribute('aria-pressed', String(paused));
  toggle.innerHTML = paused ? 'Ativar movimento <span aria-hidden="true">▷</span>' : 'Pausar movimento <span aria-hidden="true">Ⅱ</span>';
}
syncMotionLabel();
function updateScroll() {
  scrollPending = false;
  let index = 0;
  if (mobileCards.matches) {
    const width = stepEls[0].getBoundingClientRect().width + 12;
    const position = Math.min(4, Math.max(0, cards.scrollLeft / width));
    index = Math.round(position);
    progress = Math.min(4.999, position + .9);
  } else {
    const readingLine = innerHeight * .52;
    for (let i = 0; i < stepEls.length; i++) if (stepEls[i].getBoundingClientRect().top <= readingLine) index = i;
    const rect = stepEls[index].getBoundingClientRect();
    const local = Math.min(1, Math.max(0, (readingLine - rect.top) / rect.height));
    progress = Math.min(4.999, index + local);
  }
  document.querySelector('.cards-status').textContent = `${index + 1} de ${stages.length}`;
  document.querySelector('.card-previous').disabled = index === 0;
  document.querySelector('.card-next').disabled = index === stages.length - 1;
  if (active !== index) {
    active = index;
    document.querySelector('#model-number').textContent = `${stages[index].number} / 05`;
    document.querySelector('#model-stage').textContent = stages[index].label;
    document.querySelector('.stage-progress span').style.width = `${(index+1)*20}%`;
    stageLinks.forEach((link,i) => { if(i === index) link.setAttribute('aria-current','step'); else link.removeAttribute('aria-current'); });
  }
  scene?.setProgress(progress, paused);
}
function queueScroll() { if(!scrollPending){ scrollPending = true; requestAnimationFrame(updateScroll); } }
addEventListener('scroll', queueScroll, { passive: true });
addEventListener('resize', queueScroll);
cards.addEventListener('scroll', queueScroll, { passive: true });
function selectCard(index) {
  const target = Math.min(stages.length - 1, Math.max(0, index));
  const left = stepEls[target].offsetLeft - stepEls[0].offsetLeft;
  cards.scrollTo({ left, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}
document.querySelector('.card-previous').addEventListener('click', () => selectCard(active - 1));
document.querySelector('.card-next').addEventListener('click', () => selectCard(active + 1));
cards.addEventListener('keydown', e => {
  if (!mobileCards.matches || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  e.preventDefault();
  selectCard(e.key === 'Home' ? 0 : e.key === 'End' ? stages.length - 1 : active + (e.key === 'ArrowRight' ? 1 : -1));
});
stageLinks.forEach((link, i) => link.addEventListener('click', e => {
  if (!mobileCards.matches) return;
  e.preventDefault();
  selectCard(i);
}));
mobileCards.addEventListener('change', () => {
  if (mobileCards.matches) selectCard(Math.max(active, 0));
  queueScroll();
});
if (mobileCards.matches && /^#etapa-[1-5]$/.test(location.hash)) {
  selectCard(Number(location.hash.slice(-1)) - 1);
}

toggle.addEventListener('click', () => { paused = !paused; syncMotionLabel(); scene?.setPaused(paused); updateScroll(); });
reducedMotion.addEventListener('change', e => { paused = e.matches; if(e.matches) document.documentElement.classList.remove('js-motion'); syncMotionLabel(); scene?.setPaused(paused); updateScroll(); });
updateScroll();

const sceneObserver = new IntersectionObserver(async entries => {
  if (!entries.some(e=>e.isIntersecting)) return;
  sceneObserver.disconnect();
  try {
    const { createScene } = await import('./scene.js');
    scene = createScene(document.querySelector('#scene'), paused);
    updateScroll();
  } catch(error) {
    viewport.classList.add('fallback-active');
    toggle.hidden = true;
    console.warn('Maquete 3D indisponível; exibindo a ilustração alternativa.', error);
  }
}, { rootMargin: '600px' });
sceneObserver.observe(viewport);

