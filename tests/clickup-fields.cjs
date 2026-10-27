const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { buildCustomFields, normalizePhone, fieldsMatch } = require('../clickup-lead');
const fields = require('../clickup-fields.json');
const html = fs.readFileSync(require('node:path').join(__dirname, '../analise/index.html'), 'utf8');
const script = html.match(/<script type="text\/x-dc" data-dc-script>([\s\S]*?)<\/script>/)[1];
const context = vm.createContext({});
vm.runInContext('class DCLogic {}\n' + script + '\nglobalThis.questions = QUESTIONS;', context);
const questions = context.questions;
const lead = { nome: 'Teste', email: 'teste@example.invalid', fone: '11964040944', answers: questions.map(q => q.type === 'age' ? '53 anos' : q.o[0]) };
const get = (result, index) => result.custom_fields.find(f => f.id === fields[index].id)?.value;
let result = buildCustomFields(lead);
assert.equal(result.custom_fields.length, 14);
assert.equal(result.pending.length, 0);
assert.equal(get(result, 6), 53);
assert.equal(get(result, 3), questions[3].o[0]);
assert.equal(get(result, 12), '+5511964040944');
assert.deepEqual(get(result, 2), ['3495185b-3f54-477b-b170-bab05760aa87']);
for (const index of [0, 1, 2, 4, 7, 8, 9]) {
  for (const option of questions[index].o) {
    const updated = buildCustomFields({ ...lead, answers: lead.answers.map((v, i) => i === index ? option : v) });
    const expected = fields[index].options[option];
    assert.deepEqual(get(updated, index), expected ? (index === 2 ? [expected] : expected) : undefined);
    if (!expected) assert(updated.pending.length > 0);
  }
}
const changed = (index, value) => buildCustomFields({ ...lead, answers: lead.answers.map((v, i) => i === index ? value : v) });
result = changed(2, 'CLT, Outra situação, Empresário');
assert.equal(get(result, 2).length, 2); assert.equal(result.pending.length, 1);
assert.equal(get(changed(3, 'Não sei estimar'), 3), 'Não sei estimar');
const yesNo = r => r.custom_fields.find(f => f.id === '85bf370f-4085-40dc-b6ef-f1135125631e')?.value;
assert.equal(yesNo(changed(5, 'Nenhuma')), 'bb521c1c-d7ab-4b1d-a116-a31a88fb2dac');
assert.equal(yesNo(changed(5, 'Aluguel, Investimentos')), '8fed4975-ff7e-4428-b236-2c8b0868fd06');
result = changed(5, 'Nenhuma, Aluguel');
assert.equal(yesNo(result), undefined); assert.equal(get(result, 5), 'Nenhuma, Aluguel'); assert.equal(result.pending.length, 1);
assert.equal(yesNo(changed(5, '')), undefined);
for (const age of ['', 'inválida', '0 anos', '53.5 anos']) assert.equal(get(changed(6, age), 6), undefined);
for (const phone of ['11964040944', '(11) 96404-0944', '5511964040944', '+55 11 96404-0944', '005511964040944']) assert.equal(normalizePhone(phone), '+5511964040944');
assert.equal(normalizePhone('+1 202 555 0123'), '+12025550123');
assert.equal(normalizePhone('inválido'), null);
assert.equal(get(changed(0, 'toString'), 0), undefined);
result = buildCustomFields(lead);
assert(fieldsMatch({ custom_fields: result.custom_fields }, result.custom_fields));
assert(!fieldsMatch({ custom_fields: [] }, result.custom_fields));
const expected = [{ id: fields[0].id, value: fields[0].options[questions[0].o[0]] }];
assert(fieldsMatch({ custom_fields: [{ id: fields[0].id, type: 'drop_down', value: 0, type_config: { options: [{ id: expected[0].value, orderindex: 0 }] } }] }, expected));
console.log('PASS: every mapped option, partial mappings, inconsistencies, age, phone normalization and saved-field verification.');
