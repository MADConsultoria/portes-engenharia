const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('construidas-src/src/tracking.js', 'utf8').replaceAll('export function', 'function');
const layer = [], navigations = [], timers = new Map();
let timerId = 0;
const context = {
  window: { location: { hostname: 'viabilidade-estrategica.porteseng.com.br', pathname: '/construidas/', assign: url => navigations.push(url) }, dataLayer: layer },
  setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id),
};
vm.createContext(context);vm.runInContext(source, context);
assert.equal(layer.length,0);
for (const nav_target of ['inicio','encontro','jornada','convite']) context.trackConstruase('construa_nav_click',{nav_target});
for (const pillar_id of ['01','02','03','04','05']) context.trackConstruase('construa_pillar_select',{pillar_id});
assert.equal(layer.length,9);
const links = new Map();
function link(href) { return { getAttribute: () => href, addEventListener: (type, fn) => links.set(href, fn) }; }
let hero;
context.bindInternalTracking({ querySelector: () => ({addEventListener: (type,fn) => {hero=fn;}}), querySelectorAll: () => [link('#encontro'),link('#convite')] });
hero();assert.equal(layer.at(-1).cta_location,'hero');
const before = layer.length;links.get('#convite')();
assert.equal(layer.length,before+1);assert.equal(layer.at(-1).event,'construa_nav_click');
for (const name of ['Purchase','InitiateCheckout','Lead','CompleteRegistration','page_view','toString']) assert.equal(context.trackConstruase(name),false);
assert.equal(context.trackConstruase('construa_pillar_select',{pillar_id:'06'}),false);
context.trackConstruase('construa_nav_click',{nav_target:'inicio',email:'private@example.com'});
assert.deepEqual(Object.keys(layer.at(-1)),['event','nav_target']);
for (const pathname of ['/','/analise/','/construidas-else/']) {
  context.window.location.pathname=pathname;
  assert.equal(context.trackConstruase('construa_nav_click',{nav_target:'inicio'}),false);
}
context.window.location.pathname='/construidas/';
context.window.location.hostname='localhost';
assert.equal(context.trackConstruase('construa_nav_click',{nav_target:'inicio'}),false);
context.window.location.hostname='viabilidade-estrategica.porteseng.com.br';
const url='https://www.sympla.com.br/evento/construa-se-construidas-para-construir/3631386';
context.navigateToSympla(url);const callback=layer.at(-1).eventCallback;
assert.equal(layer.at(-1).event,'construa_sympla_outbound');
callback();callback();assert.equal(navigations.length,1);
context.navigateToSympla(url);for(const fn of [...timers.values()]) fn();
assert.equal(navigations.length,2);
context.window.dataLayer={push(){throw Error('blocked');}};
context.navigateToSympla(url);assert.equal(navigations.length,3);
assert.equal(context.window.dataLayer === layer,false);
const html=fs.readFileSync('construidas/index.html','utf8');
assert.equal((html.match(/gtm\.js\?id=GTM-K3JPF24Z/g)||[]).length,1);
assert.match(html,/<template id="construa-gtm-pending-consent">[\s\S]*?GTM-K3JPF24Z[\s\S]*?<\/template>/);
assert(!html.includes('GTM-TD97LTRC'));
assert(!fs.readFileSync('index.html','utf8').includes('GTM-K3JPF24Z'));
console.log('PASS: contracts, host/route isolation, manual CTA/menu, PII allowlist, outbound callback/fallback, inert GTM.');
