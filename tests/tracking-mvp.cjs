const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
let stored = '{}';
const listeners = {};
const window = {
  location: { search: '?utm_source=qa&utm_campaign=isolated&fbclid=test-click' },
  sessionStorage: { getItem: () => stored, setItem: (_, value) => { stored = value; } },
  getComputedStyle: () => ({ display: 'inline' })
};
const context = vm.createContext({ window, document: { addEventListener: (name, fn) => { listeners[name] = fn; } }, URLSearchParams });
vm.runInContext(read('portes-tracking.js'), context);
const script = read('analise/index.html').match(/<script type="text\/x-dc" data-dc-script>([\s\S]*?)<\/script>/)[1];
vm.runInContext('class DCLogic { setState(update) { Object.assign(this.state, update); } }\n' + script + '\nglobalThis.Diagnostic = Component;', context);
const owner = vm.runInContext('new Diagnostic()', context);
owner.pick(0, 'synthetic');
owner.renderVals().onBack();
owner.pick(0, 'synthetic again');
owner.pick(1, 'synthetic');
owner.confirmMulti(2);
assert.equal(owner.state.step, 2);
owner.toggleMulti(2, 'synthetic'); owner.confirmMulti(2);
owner.pick(3, 'synthetic'); owner.pick(4, 'synthetic');
owner.toggleMulti(5, 'synthetic'); owner.toggleMulti(5, 'Nenhuma');
assert.equal(owner.state.draft.length, 1);
owner.confirmMulti(5); owner.setAge(99); owner.confirmAge(6);
assert.equal(owner.state.age, 90);
owner.pick(7, 'synthetic'); owner.pick(8, 'synthetic'); owner.pick(9, 'synthetic');
assert.equal(owner.renderVals().isContact, true);
assert.equal(window.dataLayer.filter(e => e.event === 'diagnostic_start').length, 1);
assert.equal(window.dataLayer.filter(e => e.event === 'diagnostic_step_complete').length, 10);
assert.equal(window.dataLayer.filter(e => e.event === 'diagnostic_answers_complete').length, 1);
assert.equal(window.dataLayer.find(e => e.step_number === 10).progress, 91);
const metadata = window.PortesTracking.leadData(owner);
assert.equal(metadata.utm_source, 'qa');
window.PortesTracking.leadCreated(owner, { ok: true }, 200);
assert.equal(window.dataLayer.filter(e => e.event === 'lead_created').length, 0);
const success = { ok: true, lead_id: 'qa_task', event_id: 'clickup_lead_qa_task' };
window.PortesTracking.leadCreated(owner, success, 424);
assert.equal(window.dataLayer.filter(e => e.event === 'lead_created').length, 0);
Object.assign(owner.state, { nome: 'Synthetic Test', email: 'test@example.invalid', fone: '000000000' });
context.fetch = async () => ({ ok: true, status: 201, json: async () => success });
async function run() {
  await owner.submitLead();
  assert.equal(owner.state.done, true);
  window.PortesTracking.leadCreated(owner, success, 201);
  assert.equal(window.dataLayer.filter(e => e.event === 'lead_created').length, 1);
  assert(!JSON.stringify(window.dataLayer).includes('Synthetic Test'));
  assert(!JSON.stringify(window.dataLayer).includes('synthetic'));
  owner.renderVals().onRestart(); owner.pick(0, 'synthetic');
  assert.notEqual(window.PortesTracking.leadData(owner).diagnostic_session_id, metadata.diagnostic_session_id);
  context.fetch = async () => ({ ok: false, status: 424, json: async () => ({}) });
  await owner.submitLead();
  assert.equal(owner.state.done, false);
  assert(owner.state.submitError);
  context.fetch = async () => ({ ok: true, status: 201, json: async () => ({ ...success, verified: false }) });
  await owner.submitLead();
  assert.equal(owner.state.done, true);
  assert.equal(window.dataLayer.filter(e => e.event === 'lead_created').length, 2);
  window.dataLayer = { push() { throw Error('blocked'); } };
  owner.pick(1, 'synthetic'); assert.equal(owner.state.step, 2);
  delete window.PortesTracking;
  owner.pick(3, 'synthetic'); assert.equal(owner.state.step, 4);
  // Attribution survives same-origin navigation and empty URL parameters.
  window.location.search = '?utm_source=';
  vm.runInContext(read('portes-tracking.js'), context);
  assert.equal(window.PortesTracking.leadData({}).utm_source, 'qa');
  window.dataLayer = [];
  listeners.click({ target: { closest: () => ({ querySelectorAll: () => [], textContent: 'CTA', getAttribute: key => ({ 'data-portes-cta': 'cta_01', 'data-portes-position': '1', 'data-portes-location': 'header' })[key] }) } });
  assert.equal(window.dataLayer[0].event, 'cta_click');
  assert.equal(window.dataLayer[0].cta_position, 1);
  const restricted = { location: { search: '?utm_source=restricted' }, sessionStorage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } } };
  vm.runInNewContext(read('portes-tracking.js'), { window: restricted, document: { addEventListener() {} }, URLSearchParams });
  assert.equal(restricted.PortesTracking.leadData({}).utm_source, 'restricted');
  // Execute backend with all network and server startup replaced, never contacting ClickUp.
  let handler, calls = 0, outbound;
  let taskResponse = { ok: true, json: async () => ({ id: 'qa_task', custom_fields: outbound.custom_fields }) };
  const backend = vm.createContext({
    require: name => name === 'http' ? { createServer(fn) { handler = fn; return { listen() {} }; } } : name === './clickup-lead' ? require('../clickup-lead') : require(name),
    __dirname: root, process: { env: { CLICKUP_API_TOKEN: 'synthetic', CLICKUP_LIST_ID: '123' } },
    console: { log() {}, error() {}, warn() {} }, Buffer, URL, AbortSignal,
    fetch: async (_, options) => { calls++; if (options.body) outbound = JSON.parse(options.body); return taskResponse; }
  });
  vm.runInContext(read('_server.js'), backend);
  async function request(data) {
    const req = new EventEmitter();
    Object.assign(req, { method: 'POST', url: '/api/leads', headers: { 'content-type': 'application/json' }, socket: { remoteAddress: String(Math.random()) }, setEncoding() {} });
    let status, body;
    const result = new Promise(resolve => {
      handler(req, { writeHead(code) { status = code; }, end(value) { body = JSON.parse(value); resolve(); } });
    });
    req.emit('data', JSON.stringify(data)); req.emit('end'); await result;
    return { status, body };
  }
  const lead = { nome: 'Synthetic Test', email: 'test@example.invalid', fone: '000000000', answers: Array(10).fill('synthetic'), website: '', tracking: metadata };
  const created = await request(lead);
  assert.equal(created.status, 201); assert.equal(created.body.lead_id, 'qa_task');
  assert.equal(created.body.event_id, success.event_id);
  assert(outbound.markdown_content.includes('utm_source:** qa'));
  assert(outbound.markdown_content.includes(metadata.diagnostic_session_id));
  assert(outbound.markdown_content.includes('Pendências da integração'));
  assert.equal(outbound.name, 'Lead LP | Synthetic Test');
  assert(outbound.custom_fields.some(field => field.id === 'f2f8f6f2-78e2-470e-98e0-95736d888e5c' && field.value === lead.nome));
  const beforeBot = calls;
  assert.equal((await request({ ...lead, website: 'bot' })).status, 200);
  assert.equal(calls, beforeBot);
  assert.equal((await request({ ...lead, answers: [] })).status, 400);
  taskResponse = { ok: false, status: 403, text: async () => 'denied' };
  assert.equal((await request(lead)).status, 424);
  taskResponse = { ok: true, json: async () => { throw Error('unreadable'); } };
  const noId = await request(lead);
  assert.equal(noId.status, 201); assert.equal(noId.body.lead_id, undefined);
  assert.equal(noId.body.created, true); assert.equal(noId.body.ok, true);
  taskResponse = { ok: true, json: async () => ({ id: 'qa_task', custom_fields: [] }) };
  const beforeVerification = calls;
  const missingFields = await request(lead);
  assert.equal(missingFields.status, 201); assert.equal(missingFields.body.verified, false);
  assert.equal(missingFields.body.ok, true); assert.equal(missingFields.body.lead_id, 'qa_task');
  assert.equal(calls - beforeVerification, 2); // One POST and one GET, never another creation.
  for (const name of ['index.html', 'analise/index.html']) {
    const html = read(name);
    assert.equal((html.match(/'GTM-TD97LTRC'/g) || []).length, 1);
    assert.equal((html.match(/ns.html\?id=GTM-TD97LTRC/g) || []).length, 1);
    for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  }
  assert.equal((read('index.html').match(/data-portes-cta="cta_/g) || []).length, 6);
  vm.runInNewContext(read('portes-tracking.js'), {}); // SSR safe
  console.log('PASS: diagnostic flow, deduplication, restart, attribution, failures, mocked backend, honeypot, GTM counts and script syntax. No external requests.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
