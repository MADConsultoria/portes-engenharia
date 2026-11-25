const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const { buildCustomFields } = require('../clickup-lead');
const script = fs.readFileSync('analise/index.html', 'utf8').match(/<script type="text\/x-dc" data-dc-script>([\s\S]*?)<\/script>/)[1];
const ctx = vm.createContext({});
vm.runInContext('class DCLogic { setState(v) { Object.assign(this.state, v); } }\n' + script + '\nglobalThis.Form = Component; globalThis.questions = QUESTIONS;', ctx);
for (const status of ctx.questions[8].o) {
 const form = vm.runInContext('new Form()', ctx);
 form.pick(8, status);
 const qualifies = ctx.questions[8].o.slice(0,2).includes(status);
 if (qualifies) {
  assert.equal(form.state.step, 8.1);
  assert.equal(form.renderVals().isSingle, false);
  assert.equal(form.renderVals().landValue, 150);
  form.confirmLand(); assert.equal(form.state.step, 8.2);
  assert.equal(form.renderVals().landValue, 150000);
  form.confirmLand(); assert.equal(form.state.step, 9);
  form.renderVals().onBack(); assert.equal(form.state.step, 8.2);
  form.renderVals().onBack(); assert.equal(form.state.step, 8.1);
  form.renderVals().onBack(); assert.equal(form.state.step, 8);
  form.pick(8, ctx.questions[8].o[2]);
  assert.equal(Object.keys(form.state.landAnswers).length, 0);
 } else assert.equal(form.state.step, 9);
 const answers = Array(10).fill('test'); answers[8]=status;
 const result=buildCustomFields({ answers, land: {area:150,value:150000} });
 for (const [id, value] of [['a213970f-9366-4395-b4d9-973fb4f253a4',150],['5059bcf0-8396-4565-915a-d4b6587c80d4',150000]]) {
  assert.equal(result.custom_fields.find(f=>f.id===id)?.value, qualifies ? value : undefined);
  assert.equal(buildCustomFields({answers}).custom_fields.find(f=>f.id===id), undefined);
 }
}
console.log('PASS: conditional land questions, defaults, back navigation, clearing and ClickUp fields.');
