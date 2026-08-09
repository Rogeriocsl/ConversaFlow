function toChatId(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? `${digits}@c.us` : null;
}

function sanitizeCustomList(list) {
  const unique = new Map();
  for (const item of Array.isArray(list) ? list : []) {
    if (item == null) continue;
    const id = typeof item === 'object' ? item.id || toChatId(item.number) : toChatId(item);
    if (!id || !String(id).endsWith('@c.us')) continue;
    const name = typeof item === 'object' ? item.name || item.nome || item.first : undefined;
    unique.set(id, { id, name });
  }
  return Array.from(unique.values());
}

module.exports = { toChatId, sanitizeCustomList };
