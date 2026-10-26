import './style.css';
import './theme.css';
import { stages, event } from './content.js';

document.querySelector('#steps').innerHTML = stages.map((s,i) => `<article class="step" id="etapa-${i+1}" aria-labelledby="title-${i}"><div class="step-top"><span class="step-number">${s.number}</span><span class="step-label">${s.label}</span></div><h3 id="title-${i}">${s.title}</h3><div class="speaker"><span class="speaker-mark" aria-hidden="true">${s.mark}</span><div><p class="speaker-name">${s.name}</p><p class="speaker-theme">${s.theme}</p></div></div><p class="step-description">${s.description}</p><p class="step-metaphor">${s.metaphor}</p></article>`).join('');

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
  const mobile = innerWidth <= 760;
  const readingLine = mobile ? 400 : innerHeight * .52;
  let index = 0;
  for (let i = 0; i < stepEls.length; i++) if (stepEls[i].getBoundingClientRect().top <= readingLine) index = i;
  const rect = stepEls[index].getBoundingClientRect();
  const local = Math.min(1,Math.max(0,(readingLine - rect.top) / rect.height));
  progress = Math.min(4.999, index + local);
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

