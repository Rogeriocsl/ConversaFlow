function firstName(value) {
  return String(value || '').trim().split(/\s+/)[0] || '';
}

function applyTemplate(text, context = {}) {
  return String(text || '')
    .replace(/\{\{\s*(nome|name)\s*\}\}/gi, context.name || '')
    .replace(/\{\{\s*first\s*\}\}/gi, context.first || firstName(context.name));
}

module.exports = { firstName, applyTemplate };
