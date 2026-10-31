const host = 'viabilidade-estrategica.porteseng.com.br';
const locations = ['hero', 'header', 'final'];
const contracts = {
  construa_cta_click: p => locations.includes(p.cta_location) && p.cta_label === 'quero_garantir_minha_vaga',
  construa_nav_click: p => ['inicio', 'encontro', 'jornada', 'convite'].includes(p.nav_target),
  construa_pillar_select: p => /^0[1-5]$/.test(p.pillar_id),
  construa_sympla_outbound: p => locations.includes(p.cta_location),
};
const fields = {
  construa_cta_click: ['cta_location', 'cta_label'],
  construa_nav_click: ['nav_target'],
  construa_pillar_select: ['pillar_id'],
  construa_sympla_outbound: ['cta_location'],
};

export function trackConstruase(name, payload = {}, completion) {
  if (typeof window === 'undefined' || window.location.hostname !== host ||
      !/^\/construidas(?:\/|$)/.test(window.location.pathname) ||
      !Object.hasOwn(contracts, name) || !contracts[name](payload) ||
      !fields[name].every(key => typeof payload[key] === 'string')) return false;
  try {
    const message = { event: name };
    for (const key of fields[name]) message[key] = payload[key];
    if (completion) {
      message.eventCallback = completion;
      message.eventTimeout = 150;
    }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(message);
    return true;
  } catch { return false; }
}

export function navigateToSympla(url) {
  let finished = false;
  const navigate = () => {
    if (finished) return;
    finished = true;
    window.location.assign(url);
  };
  // A bounded fallback also works with paused tags, blockers and no GTM.
  const timer = setTimeout(navigate, 150);
  const done = () => { clearTimeout(timer); navigate(); };
  if (url !== 'https://www.sympla.com.br/evento/construa-se-construidas-para-construir/3631386' ||
      !trackConstruase('construa_sympla_outbound', { cta_location: 'final' }, done)) done();
}

export function bindInternalTracking(doc = document) {
  doc.querySelector('.hero a[href="#convite"]').addEventListener('click', () => {
    trackConstruase('construa_cta_click', { cta_location: 'hero', cta_label: 'quero_garantir_minha_vaga' });
  });
  // Header CTA belongs to the menu: navigation only, never two events.
  doc.querySelectorAll('.header a[href^="#"], footer a[href="#inicio"]').forEach(link => {
    link.addEventListener('click', () => {
      trackConstruase('construa_nav_click', { nav_target: link.getAttribute('href').slice(1) });
    });
  });
}
