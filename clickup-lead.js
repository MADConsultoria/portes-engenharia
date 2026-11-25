const fields = require('./clickup-fields.json');

function normalizePhone(value) {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+') && /^[1-9]\d{7,14}$/.test(digits)) return '+' + digits;
  if (raw.startsWith('00') && /^[1-9]\d{7,14}$/.test(digits.slice(2))) return '+' + digits.slice(2);
  if (/^55\d{10,11}$/.test(digits)) return '+' + digits;
  if (/^\d{10,11}$/.test(digits)) return '+55' + digits;
  return null;
}

function buildCustomFields(lead) {
  const custom_fields = [], pending = [];
  const add = (index, value) => {
    if (value !== undefined && value !== null && value !== '') custom_fields.push({ id: fields[index].id, value });
  };
  const answer = index => String(lead.answers[index] || '').trim();
  for (const index of [0, 1, 4, 7, 8, 9]) {
    const text = answer(index);
    if (!text) continue;
    const value = Object.hasOwn(fields[index].options, text) ? fields[index].options[text] : undefined;
    if (value) add(index, value);
    else pending.push(`Pergunta ${index + 1}: opção sem correspondência cadastrada (${text}).`);
  }
  const professions = [...new Set(answer(2).split(',').map(s => s.trim()).filter(Boolean))];
  const ids = [];
  for (const text of professions) {
    const value = Object.hasOwn(fields[2].options, text) ? fields[2].options[text] : undefined;
    if (value) ids.push(value);
    else pending.push(`Pergunta 3: opção sem correspondência cadastrada (${text}).`);
  }
  if (ids.length) add(2, ids);
  add(3, answer(3));
  const sources = answer(5).split(',').map(s => s.trim()).filter(Boolean);
  add(5, sources.join(', '));
  if (sources.length) {
    if (sources.includes('Nenhuma') && sources.length > 1) {
      pending.push('Pergunta 6: Nenhuma foi informada junto com outras fontes; classificação Sim/Não omitida.');
    } else {
      custom_fields.push({ id: '85bf370f-4085-40dc-b6ef-f1135125631e', value: sources[0] === 'Nenhuma'
        ? 'bb521c1c-d7ab-4b1d-a116-a31a88fb2dac' : '8fed4975-ff7e-4428-b236-2c8b0868fd06' });
    }
  }
  const age = answer(6).match(/^(\d{1,3})(?:\s+anos)?$/);
  if (age && Number(age[1]) >= 18 && Number(age[1]) <= 90) add(6, Number(age[1]));
  else if (answer(6)) pending.push('Pergunta 7: idade inválida; campo numérico omitido.');
  add(10, lead.nome);
  add(11, lead.email);
  const phone = normalizePhone(lead.fone);
  if (phone) add(12, phone);
  else pending.push('WhatsApp: número sem formato válido; campo de telefone omitido.');
  if (['Já possuo o terreno', 'Estou negociando um terreno'].includes(answer(8))) {
    for (const [key, id] of [['area', 'a213970f-9366-4395-b4d9-973fb4f253a4'], ['value', '5059bcf0-8396-4565-915a-d4b6587c80d4']]) {
      const value = lead.land?.[key];
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) custom_fields.push({ id, value });
    }
  }
  const tracking = lead.tracking || {};
  const source = String(tracking.utm_source || '').trim().toLowerCase();
  const isMeta = Boolean(String(tracking.fbclid || '').trim()) ||
    ['meta', 'facebook', 'instagram', 'fb', 'ig', 'facebook.com', 'instagram.com', 'l.facebook.com', 'm.facebook.com'].includes(source);
  custom_fields.push({
    id: '98f9c9ed-42d4-4968-8e76-da70a4268d8f',
    value: isMeta ? '4429159c-109c-4454-a304-dfd8e1b79a9b' : '6d386e98-2c20-4c38-9591-1ad6668a7c41',
  });
  return { custom_fields, pending };
}

function fieldsMatch(task, expected) {
  if (!Array.isArray(task.custom_fields)) return false;
  return expected.every(({ id, value }) => {
    const saved = task.custom_fields.find(field => field.id === id);
    if (!saved || saved.value === undefined || saved.value === null) return false;
    if (Array.isArray(value)) return Array.isArray(saved.value) && value.length === saved.value.length && value.every(v => saved.value.includes(v));
    if (saved.type === 'drop_down' && String(saved.value) !== String(value)) {
      const option = (saved.type_config?.options || []).find(o => String(o.orderindex) === String(saved.value));
      return option?.id === value;
    }
    return String(saved.value) === String(value);
  });
}

module.exports = { normalizePhone, buildCustomFields, fieldsMatch };
