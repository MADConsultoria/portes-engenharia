// Runs the actual form and backend code, replacing only HTTP transport and ClickUp.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
let handler, saved, creates = 0, checks = 0, apiResult;
const backend = vm.createContext({
  __dirname: root, process: { env: { CLICKUP_API_TOKEN: 'fake-token', CLICKUP_LIST_ID: '123' } },
  require: name => name === 'http' ? { createServer(fn) { handler = fn; return { listen() {} }; } }
    : name === './clickup-lead' ? require('../clickup-lead') : require(name),
  console, AbortSignal,
  fetch: async (endpoint, options) => {
    if (options.method === 'POST') {
      assert.equal(endpoint, 'https://api.clickup.com/api/v2/list/123/task');
      creates++;
      saved = JSON.parse(options.body);
      // Force verification through GET rather than echoing fields in the POST response.
      return { ok: true, json: async () => ({ id: 'simulated_lead' }) };
    }
    assert.equal(endpoint, 'https://api.clickup.com/api/v2/task/simulated_lead');
    checks++;
    return { ok: true, json: async () => ({ id: 'simulated_lead', custom_fields: saved.custom_fields }) };
  },
});
vm.runInContext(read('_server.js'), backend);
const browser = vm.createContext({
  window: { location: { search: '?utm_source=simulacao&utm_campaign=teste_integracao' }, sessionStorage: { getItem: () => null, setItem() {} } },
  document: { addEventListener() {} }, URLSearchParams,
  fetch: async (endpoint, options) => {
    assert.equal(endpoint, '../api/leads');
    const req = Object.assign(new EventEmitter(), {
      method: 'POST', url: '/api/leads', headers: { 'content-type': 'application/json', referer: 'http://localhost/analise/' },
      socket: { remoteAddress: '127.0.0.1' }, setEncoding() {},
    });
    return new Promise((resolve, reject) => {
      let status;
      Promise.resolve(handler(req, {
        writeHead(code) { status = code; },
        end(body) {
          apiResult = { status, body: JSON.parse(body) };
          resolve({ ok: status >= 200 && status < 300, status, json: async () => apiResult.body });
        },
      })).catch(reject);
      req.emit('data', options.body); req.emit('end');
    });
  },
});
vm.runInContext(read('portes-tracking.js'), browser);
const script = read('analise/index.html').match(/<script type="text\/x-dc" data-dc-script>([\s\S]*?)<\/script>/)[1];
vm.runInContext('class DCLogic { setState(values) { Object.assign(this.state, values); } }\n' + script + '\nglobalThis.form = new Component();', browser);
async function run() {
  const form = browser.form;
  form.pick(0, 'Construir minha própria casa');
  form.pick(1, 'Entre 3 e 6 meses');
  form.toggleMulti(2, 'CLT'); form.toggleMulti(2, 'Empresário'); form.confirmMulti(2);
  form.pick(3, 'R$ 10 mil a R$ 30 mil por mês');
  form.pick(4, 'R$ 10 mil a R$ 20 mil');
  form.toggleMulti(5, 'Aluguel'); form.toggleMulti(5, 'Investimentos'); form.confirmMulti(5);
  form.setAge(53); form.confirmAge(6);
  form.pick(7, 'Sim, com cônjuge');
  form.pick(8, 'Já possuo o terreno');
  form.pick(9, 'R$ 500 mil a R$ 700 mil');
  form.renderVals().onNome({ target: { value: 'Lead Fictício de Teste' } });
  form.renderVals().onEmail({ target: { value: 'teste@example.invalid' } });
  form.renderVals().onFone({ target: { value: '(11) 90000-0000' } });
  await form.submitLead();
  assert.equal(apiResult.status, 201); assert.equal(apiResult.body.verified, true);
  assert.equal(form.state.done, true); assert.equal(creates, 1); assert.equal(checks, 1);
  assert.equal(saved.custom_fields.length, 14);
  assert.equal(saved.name, 'Lead LP | Lead Fictício de Teste');
  assert(saved.markdown_content.includes('utm_source:** simulacao'));
  assert(saved.markdown_content.includes('diagnostic_session_id'));
  assert(saved.markdown_content.includes('http://localhost/analise/'));
  assert(saved.markdown_content.includes('Recebido em:'));
  assert.equal(saved.custom_fields.find(f => f.id === '7d85505f-d300-47a0-aaef-bb8d9c93f67d').value, '+5511900000000');
  assert.equal(browser.window.dataLayer.filter(event => event.event === 'lead_created').length, 1);
  console.log(JSON.stringify({ simulated: true, externalRequests: 0, title: saved.name, customFields: saved.custom_fields.length, creationRequests: creates, verificationRequests: checks, response: apiResult, formCompleted: form.state.done, answers: form.state.answers }, null, 2));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
