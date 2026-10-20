(function () {
  'use strict';
  if (typeof window === 'undefined' || window.PortesTracking) return;
  var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];
  var steps = ['objective', 'operation_timeline', 'professional_profile', 'financial_movement', 'declared_income', 'other_income_sources', 'age', 'operation_partner', 'land_status', 'operation_size'];
  var attribution = {};
  try {
    var saved = JSON.parse(window.sessionStorage.getItem('portes_attribution_v1') || '{}');
    keys.forEach(function (key) { if (typeof saved[key] === 'string' && saved[key]) attribution[key] = saved[key].slice(0, 500); });
  } catch (_) {}
  try {
    var query = new URLSearchParams(window.location.search);
    keys.forEach(function (key) {
      var value = query.get(key);
      if (value && value.trim()) attribution[key] = value.trim().slice(0, 500);
    });
    window.sessionStorage.setItem('portes_attribution_v1', JSON.stringify(attribution));
  } catch (_) {}
  function trackPortesEvent(name, params) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: name }, params));
    } catch (_) {}
  }
  function id() {
    try { return window.crypto.randomUUID(); } catch (_) {
      return 'd-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    }
  }
  function attempt(owner) {
    if (!owner.__portesAttempt) owner.__portesAttempt = { id: id(), steps: {}, lead: false };
    return owner.__portesAttempt;
  }
  function diagnosticParams(a) { return { diagnostic_session_id: a.id, diagnostic_version: 'v1' }; }
  window.PortesTracking = {
    trackPortesEvent: trackPortesEvent,
    completeStep: function (owner, index) {
      try {
        if (!Number.isInteger(index) || !steps[index]) return;
        var a = attempt(owner);
        if (a.steps[index]) return;
        a.steps[index] = true;
        if (index === 0) trackPortesEvent('diagnostic_start', diagnosticParams(a));
        trackPortesEvent('diagnostic_step_complete', Object.assign(diagnosticParams(a), {
          step_number: index + 1, step_id: steps[index], progress: Math.round((index + 1) / 11 * 100)
        }));
        if (index === 9) trackPortesEvent('diagnostic_answers_complete', diagnosticParams(a));
      } catch (_) {}
    },
    leadData: function (owner) {
      try { return Object.assign({}, attribution, { diagnostic_session_id: attempt(owner).id }); } catch (_) { return {}; }
    },
    leadCreated: function (owner, result, status) {
      try {
        if (status !== 201 || result.ok !== true || !result.lead_id || !result.event_id) return;
        var a = attempt(owner);
        if (a.lead) return;
        a.lead = true;
        trackPortesEvent('lead_created', Object.assign(diagnosticParams(a), { lead_id: result.lead_id, event_id: result.event_id }));
      } catch (_) {}
    },
    restart: function (owner) { try { delete owner.__portesAttempt; } catch (_) {} }
  };
  // Delegation survives the runtime replacing its template with rendered elements.
  document.addEventListener('click', function (event) {
    try {
      var link = event.target.closest('a[data-portes-cta]');
      if (!link) return;
      var text = Array.from(link.querySelectorAll('span')).find(function (span) { return window.getComputedStyle(span).display !== 'none' && span.textContent.trim().length > 1; });
      trackPortesEvent('cta_click', {
        cta_id: link.getAttribute('data-portes-cta'),
        cta_position: Number(link.getAttribute('data-portes-position')),
        cta_text: (text ? text.textContent : link.textContent).replace(/→/g, '').trim(),
        cta_location: link.getAttribute('data-portes-location')
      });
    } catch (_) {}
  });
})();
