// ===== Helpers & State =====
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const toastRoot = $('#toast-root');
let logBuffer = []; // buffer para logs

function addToast(msg, type = 'info', timeout = 2200) {
  const el = document.createElement('div');
  el.className = `toast ${type === 'success' ? 'success' : type === 'danger' ? 'danger' : ''}`;
  el.textContent = msg;
  toastRoot.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(6px)'; }, timeout - 300);
  setTimeout(() => { el.remove(); }, timeout);
}

// ===== Tema =====
const themeToggle = $('#theme-toggle');
const themeIcon = $('#theme-icon');

function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('theme', t);
  themeIcon.innerHTML = t === 'light'
    ? '<path d="M12 4.5a7.5 7.5 0 1 0 7.5 7.5A7.5 7.5 0 0 0 12 4.5Z" stroke="currentColor" stroke-width="1.5"/>'
    : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke="currentColor" stroke-width="1.5"/>';
}
setTheme(localStorage.getItem('theme') || 'dark');
themeToggle?.addEventListener('click', () => {
  setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

// ===== Densidade =====
const densityToggle = $('#density-toggle');
const densityIcon = $('#density-icon');

function setDensity(d) {
  document.body.setAttribute('data-density', d);
  localStorage.setItem('density', d);
  densityToggle.setAttribute('aria-pressed', d === 'compact' ? 'true' : 'false');
  densityToggle.title = d === 'compact' ? 'Modo compacto (ativado)' : 'Modo compacto (desativado)';
  densityIcon.innerHTML = d === 'compact'
    ? '<path d="M4 8h16M4 12h16M4 16h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 5l0 2M16 5l0 2M8 17l0 2M16 17l0 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'
    : '<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>';
}
setDensity(localStorage.getItem('density') || 'comfortable');
densityToggle?.addEventListener('click', () => {
  const current = document.body.getAttribute('data-density') || 'comfortable';
  const next = current === 'compact' ? 'comfortable' : 'compact';
  setDensity(next);
  addToast(next === 'compact' ? 'Modo compacto ativado' : 'Modo confortável ativado', 'success');
});

// ===== Tabs =====
const tabs = $$('.tab');
const panels = $$('.panel');
const LAST_TAB_KEY = 'ui_last_tab';
let licenseOk = false; // gate de licença

function activateTab(name) {
  if (!licenseOk && name !== 'licenca') {
    name = 'licenca';
    addToast('É necessário cadastrar uma licença válida.', 'danger');
  }
  tabs.forEach(t => {
    const active = t.dataset.tab === name;
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', String(active));
  });
  panels.forEach(p => p.classList.toggle('active', p.dataset.panel === name));
  localStorage.setItem(LAST_TAB_KEY, name);
}
tabs.forEach(btn => btn.addEventListener('click', () => activateTab(btn.dataset.tab)));
activateTab(localStorage.getItem(LAST_TAB_KEY) || 'conexao');

// ===== Status / QR / KPI topo =====
const statusEl = $('#status');
const qrEl = $('#qr');
const qrPlaceholder = $('#qr-placeholder');
const qrPlaceholderText = $('#qr-placeholder-text');
let lastConnState = null;

const kpiConn = $('#kpi-conn');
const kpiSched = $('#kpi-sched');
const kpiCooldown = $('#kpi-cooldown');

function setStatus(text) { if (statusEl) statusEl.textContent = text; }
function setKpiConn(state) {
  const dot = kpiConn?.querySelector('.kpi-dot');
  const mapText = {
    qr: 'QR aguardando', authenticated: 'Autenticando', ready: 'Conectado',
    auth_failure: 'Falha auth', disconnected: 'Desconectado', resetting: 'Reiniciando'
  };
  const mapClass = { qr: 'warn', authenticated: 'warn', ready: 'ok', auth_failure: 'err', disconnected: 'err', resetting: 'warn' };
  if (kpiConn?.lastChild) kpiConn.lastChild.textContent = ' ' + (mapText[state] || state);
  if (dot) dot.className = `kpi-dot ${mapClass[state] || 'idle'}`;
}
function showQrImage(dataUrl) {
  if (!qrEl || !qrPlaceholder) return;
  if (dataUrl) { qrEl.src = dataUrl; qrPlaceholder.style.display = 'none'; }
  else { qrEl.removeAttribute('src'); qrPlaceholder.style.display = 'flex'; }
}
function updateQrPlaceholderByState(state) {
  if (!qrPlaceholderText) return;
  const mapMsg = {
    qr: 'Aponte a câmera do WhatsApp para o QR acima.',
    authenticated: 'Conectando…',
    ready: 'Sessão ativa — QR não necessário.',
    resetting: 'Reiniciando sessão… aguarde um novo QR.',
    auth_failure: 'Falha de autenticação — gere um novo QR.',
    disconnected: 'Desconectado — aguardando QR…'
  };
  qrPlaceholderText.textContent = mapMsg[state] || 'Aguardando QR…';
}

// ===== Logs =====
const logEl = $('#log');
function appendLogLine(line) {
  if (!logEl) return;
  const atBottom = logEl.scrollTop + logEl.clientHeight >= logEl.scrollHeight - 5;
  const div = document.createElement('div');
  div.textContent = line;
  logEl.appendChild(div);
  if (atBottom) logEl.scrollTop = logEl.scrollHeight;
}
function addLog(text) {
  const ts = new Date().toLocaleTimeString();
  const line = `[${ts}] ${text}`;
  logBuffer.push(line);
  appendLogLine(line);
}

// ===== LICENÇA =====
const licStatus = $('#lic-status');
const licExp = $('#lic-exp');
const licName = $('#lic-name');
const licMachine = $('#lic-machine');
const licKeyEl = $('#lic-key');
const licSaveBtn = $('#lic-save');
const licResetBtn = $('#lic-reset');
const licRemaining = $('#lic-remaining');

function formatRemaining(expIso) {
  if (!expIso) return '—';
  const ms = Date.parse(expIso) - Date.now();
  if (!Number.isFinite(ms)) return '—';
  if (ms <= 0) return 'Expirada';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  if (d > 0) return `${d} dia(s) e ${h}h restantes`;
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}min restantes`;
}
function renderLicenseStatus(st) {
  licenseOk = !!st?.ok;
  if (licStatus) licStatus.textContent = st?.ok ? 'Válida' : (st?.reason || 'Inválida');
  if (licExp) licExp.textContent = st?.exp || '—';
  if (licName) licName.textContent = st?.name || '—';
  if (licMachine) licMachine.textContent = st?.machine || '—';
  if (licRemaining) licRemaining.textContent = st?.exp ? formatRemaining(st.exp) : '—';
  if (!licenseOk) activateTab('licenca');
}
async function fetchLicense() {
  try { const st = await window.api.licenseGet(); renderLicenseStatus(st); }
  catch { addToast('Erro ao obter status da licença', 'danger'); }
}
fetchLicense();
window.api.onLicenseStatus((st) => renderLicenseStatus(st));

licSaveBtn?.addEventListener('click', async () => {
  try {
    const key = (licKeyEl.value || '').trim();
    await window.api.licenseSet(key);
    addToast('Licença salva', 'success');
  } catch { addToast('Erro ao salvar licença', 'danger'); }
});
licResetBtn?.addEventListener('click', async () => {
  try { await window.api.licenseReset(); addToast('Licença removida', 'success'); }
  catch { addToast('Erro ao remover licença', 'danger'); }
});

// ===== Auto-reply (texto, cooldown, horário) =====
const autoTextEl = $('#auto-text');
const autoSaveBtn = $('#auto-save');
const autoStatusEl = $('#auto-status');
const autoCountEl = $('#auto-count');
const autoCooldownEl = $('#auto-cooldown');
const autoCooldownNote = $('#auto-cooldown-note');
const automationEnabled = $('#automation-enabled');
const automationOptions = $('#automation-options');
const automationInvalid = $('#automation-invalid');
const automationTimeout = $('#automation-timeout');

const autoSchedEnabled = $('#auto-sched-enabled');
const autoSchedStart = $('#auto-sched-start');
const autoSchedEnd = $('#auto-sched-end');
const autoSchedNote = $('#auto-sched-note');

// Variáveis de teste + prévia
const chipInsertNome = $('#chip-insert-nome');
const chipInsertFirst = $('#chip-insert-first');
const ctxNameEl = $('#ctx-name');
const ctxFirstEl = $('#ctx-first');
const ctxAutoFirst = $('#ctx-autofirst');
const autoPreview = $('#auto-preview');
const autoPreviewBtn = $('#auto-preview-btn');
const autoTestTo = $('#auto-test-to');
const autoTestSend = $('#auto-test-send');

function insertAtCursor(textarea, insert) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const val = textarea.value;
  textarea.value = val.slice(0, start) + insert + val.slice(end);
  textarea.selectionStart = textarea.selectionEnd = start + insert.length;
  textarea.focus();
  textarea.dispatchEvent(new Event('input'));
}
chipInsertNome?.addEventListener('click', () => insertAtCursor(autoTextEl, '{{nome}}'));
chipInsertFirst?.addEventListener('click', () => insertAtCursor(autoTextEl, '{{first}}'));

function updateAutoCount() {
  const n = (autoTextEl.value || '').length;
  autoCountEl.textContent = `${n} ${n === 1 ? 'caractere' : 'caracteres'}`;
}
function fmtCooldown(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (n < 3600000) return `${Math.round(n / 60000)} min`;
  const h = Math.round(n / 3600000);
  return `${h} ${h === 1 ? 'hora' : 'horas'}`;
}
function setCooldownUI(ms) {
  const allowed = [300000,900000,1800000,3600000,7200000,14400000,28800000,43200000,86400000];
  let best = allowed[0], diff = Math.abs(ms - best);
  for (const a of allowed) { const d = Math.abs(ms - a); if (d < diff) { best = a; diff = d; } }
  autoCooldownEl.value = String(best);
  autoCooldownNote.textContent = `Atual: ${fmtCooldown(best)}`;
  kpiCooldown.textContent = `🕒 Cooldown: ${fmtCooldown(best)}`;
}
function parseHHMM(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
  if (!m) return null;
  const hh = Number(m[1]), mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return { hh, mm, minutes: hh * 60 + mm };
}
function firstName(s) {
  const t = String(s || '').trim();
  if (!t) return '';
  return t.split(/\s+/)[0];
}
function nowMinutes() { const d = new Date(); return d.getHours()*60 + d.getMinutes(); }
function isNowInside(startStr, endStr) {
  const s = parseHHMM(startStr), e = parseHHMM(endStr);
  if (!s || !e) return true;
  if (s.minutes === e.minutes) return true; // 24h
  const n = nowMinutes();
  return s.minutes < e.minutes ? (n >= s.minutes && n < e.minutes) : (n >= s.minutes || n < e.minutes);
}
function renderScheduleNote(enabled, start, end) {
  if (!enabled) { autoSchedNote.textContent = 'Horário: desativado'; kpiSched.textContent = '⏰ Horário: livre'; return; }
  const inside = isNowInside(start, end);
  const txt = `${start}–${end} (${inside ? 'agora: dentro' : 'agora: fora'})`;
  autoSchedNote.textContent = `Horário: ${txt}`;
  kpiSched.textContent = `⏰ Horário: ${txt}`;
}
function applyTemplatePreview(text, ctx) {
  return String(text || '')
    .replace(/\{\{\s*(nome|name)\s*\}\}/gi, ctx.name || '')
    .replace(/\{\{\s*first\s*\}\}/gi, ctx.first || (ctx.name ? firstName(ctx.name) : ''));
}
function getCtx() {
  const name = (ctxNameEl?.value || '').trim();
  let first = (ctxFirstEl?.value || '').trim();
  if (ctxAutoFirst?.checked && name && !first) first = firstName(name);
  return { name, first };
}
function renderAutoPreview() {
  const text = (autoTextEl.value || '').trim();
  const ctx = getCtx();
  const menu = parseAutomationOptions(automationOptions?.value).map(option => `${option.key} - ${option.label}`).join('\n');
  const ex = `${applyTemplatePreview(text, ctx)}${menu ? `\n\n${menu}\n\nResponda com o número da opção desejada.` : ''}`;
  autoPreview.textContent = ex || '—';
}

function parseAutomationOptions(value) {
  return String(value || '').split(/\r?\n/).map(line => {
    const [key, label, response, action] = line.split('|').map(part => part.trim());
    if (!key || !label) return null;
    return { key, label, response: response || '', ...(String(action || '').toLowerCase() === 'atendente' ? { action: 'handoff' } : {}) };
  }).filter(Boolean);
}

function formatAutomationOptions(options) {
  return (Array.isArray(options) ? options : []).map(option =>
    [option.key, option.label, option.response, option.action === 'handoff' ? 'atendente' : ''].filter((part, index) => index < 3 || part).join(' | ')
  ).join('\n');
}

autoTextEl.addEventListener('input', () => { updateAutoCount(); renderAutoPreview(); });
automationOptions?.addEventListener('input', renderAutoPreview);
autoPreviewBtn?.addEventListener('click', renderAutoPreview);
ctxNameEl?.addEventListener('input', renderAutoPreview);
ctxFirstEl?.addEventListener('input', renderAutoPreview);
ctxAutoFirst?.addEventListener('change', () => {
  if (ctxAutoFirst.checked) ctxFirstEl.value = '';
  renderAutoPreview();
});

autoCooldownEl.addEventListener('change', async () => {
  const ms = Number(autoCooldownEl.value || 3600000);
  autoCooldownNote.textContent = `Atual: ${fmtCooldown(ms)}`;
  kpiCooldown.textContent = `🕒 Cooldown: ${fmtCooldown(ms)}`;
  try { await window.api.setSettings({ autoReplyCooldownMs: ms }); addToast('Cooldown salvo', 'success'); }
  catch { addToast('Erro ao salvar cooldown', 'danger'); }
});

// Envio de teste usa a PRÉVIA renderizada
autoTestSend?.addEventListener('click', async () => {
  const to = (autoTestTo.value || '').replace(/\D/g, '');
  if (!to) return addToast('Informe um número para teste', 'danger');
  const msg = (autoPreview.textContent || '').trim();
  if (!msg || msg === '—') return addToast('Mensagem de prévia vazia', 'danger');
  try { await window.api.sendMessage(to, msg); addToast('Teste enviado', 'success'); }
  catch (e) { addToast('Erro no teste: ' + (e?.message || e), 'danger'); }
});

// Horário – persistir on-change
autoSchedEnabled?.addEventListener('change', async () => {
  const payload = { autoReplySchedule: { enabled: autoSchedEnabled.checked, start: autoSchedStart.value, end: autoSchedEnd.value } };
  try { await window.api.setSettings(payload); renderScheduleNote(payload.autoReplySchedule.enabled, payload.autoReplySchedule.start, payload.autoReplySchedule.end); addToast(payload.autoReplySchedule.enabled ? 'Horário ativado' : 'Horário desativado', 'success'); }
  catch { addToast('Erro ao salvar horário', 'danger'); }
});
autoSchedStart?.addEventListener('change', async () => {
  const payload = { autoReplySchedule: { enabled: autoSchedEnabled.checked, start: autoSchedStart.value, end: autoSchedEnd.value } };
  try { await window.api.setSettings(payload); renderScheduleNote(payload.autoReplySchedule.enabled, payload.autoReplySchedule.start, payload.autoReplySchedule.end); addToast('Início atualizado', 'success'); }
  catch { addToast('Erro ao salvar início', 'danger'); }
});
autoSchedEnd?.addEventListener('change', async () => {
  const payload = { autoReplySchedule: { enabled: autoSchedEnabled.checked, start: autoSchedStart.value, end: autoSchedEnd.value } };
  try { await window.api.setSettings(payload); renderScheduleNote(payload.autoReplySchedule.enabled, payload.autoReplySchedule.start, payload.autoReplySchedule.end); addToast('Fim atualizado', 'success'); }
  catch { addToast('Erro ao salvar fim', 'danger'); }
});

// ==== Controle de Ritmo ====
const rateDelayEl = $('#rate-delay');
const rateDelayLabel = $('#rate-delay-label');
const fmtDelay = (ms) => `${(Number(ms) / 1000).toFixed(1)}s`;
function renderRateLabel(ms) {
  const s = fmtDelay(ms);
  let hint = '';
  const n = Number(ms);
  if (n < 800) hint = ' • ⚠ rápido';
  else if (n < 1500) hint = ' • moderado';
  else hint = ' • seguro';
  rateDelayLabel.textContent = `${s}${hint}`;
}
let rateSaveTimer = null;
function saveRateDebounced(ms) {
  clearTimeout(rateSaveTimer);
  rateSaveTimer = setTimeout(async () => {
    try { await window.api.setSettings({ batchDelayMs: Number(ms) }); addToast('Intervalo salvo', 'success'); }
    catch { addToast('Erro ao salvar intervalo', 'danger'); }
  }, 350);
}
rateDelayEl?.addEventListener('input', (e) => { const ms = e.target.value; renderRateLabel(ms); saveRateDebounced(ms); });

// ==== Jitter ====
const rateJitterEl = $('#rate-jitter');
const rateJitterLabel = $('#rate-jitter-label');
function renderJitterLabel(pct) { rateJitterLabel.textContent = `${pct}%`; }
let jitterSaveTimer = null;
function saveJitterDebounced(pct) {
  clearTimeout(jitterSaveTimer);
  jitterSaveTimer = setTimeout(async () => {
    try { await window.api.setSettings({ batchJitterPct: Number(pct)/100 }); addToast('Jitter salvo', 'success'); }
    catch { addToast('Erro ao salvar jitter', 'danger'); }
  }, 350);
}
rateJitterEl?.addEventListener('input', (e) => { const pct = e.target.value; renderJitterLabel(pct); saveJitterDebounced(pct); });

// ==== Carregar settings iniciais ====
(async function initSettings() {
  try {
    const s = await window.api.getSettings();
    // Automação por menu
    const automation = s?.automation || {};
    autoTextEl.value = automation.welcomeMessage || s?.autoReplyText || '';
    automationEnabled.checked = automation.enabled !== false;
    automationOptions.value = formatAutomationOptions(automation.options);
    automationInvalid.value = automation.invalidOptionMessage || 'Não entendi essa opção.';
    automationTimeout.value = String(automation.sessionTimeoutMinutes || 30);
    updateAutoCount();
    renderAutoPreview();

    // Cooldown
    const cd = s?.autoReplyCooldownMs != null ? s.autoReplyCooldownMs : 3600000;
    setCooldownUI(cd);

    // Horário
    const sch = s?.autoReplySchedule || { enabled:false, start:'08:00', end:'20:00' };
    autoSchedEnabled.checked = !!sch.enabled;
    autoSchedStart.value = sch.start || '08:00';
    autoSchedEnd.value = sch.end || '20:00';
    renderScheduleNote(autoSchedEnabled.checked, autoSchedStart.value, autoSchedEnd.value);

    // Contexto de teste
    if (ctxNameEl) ctxNameEl.value = localStorage.getItem('ctx_name') || '';
    if (ctxFirstEl) ctxFirstEl.value = localStorage.getItem('ctx_first') || '';
    if (ctxAutoFirst) ctxAutoFirst.checked = localStorage.getItem('ctx_autofirst') !== 'false';
    renderAutoPreview();

    // Ritmo
    if (typeof s?.batchDelayMs === 'number') { rateDelayEl.value = s.batchDelayMs; renderRateLabel(s.batchDelayMs); }
    if (typeof s?.batchJitterPct === 'number') { rateJitterEl.value = Math.round((s.batchJitterPct||0)*100); renderJitterLabel(rateJitterEl.value); }
  } catch {
    addToast('Erro ao carregar configurações', 'danger');
  }
})();
window.api.onSettingsUpdated((s) => {
  if (s?.automation) {
    autoTextEl.value = s.automation.welcomeMessage || '';
    automationEnabled.checked = s.automation.enabled !== false;
    automationOptions.value = formatAutomationOptions(s.automation.options);
    automationInvalid.value = s.automation.invalidOptionMessage || '';
    automationTimeout.value = String(s.automation.sessionTimeoutMinutes || 30);
    updateAutoCount(); renderAutoPreview();
  }
  if (s?.autoReplyCooldownMs != null) { setCooldownUI(Number(s.autoReplyCooldownMs)); }
  if (s?.autoReplySchedule) {
    const sch = s.autoReplySchedule;
    autoSchedEnabled.checked = !!sch.enabled;
    autoSchedStart.value = sch.start || '08:00';
    autoSchedEnd.value = sch.end || '20:00';
    renderScheduleNote(autoSchedEnabled.checked, autoSchedStart.value, autoSchedEnd.value);
  }
});

// Persistir ctx de teste
if (ctxNameEl && ctxFirstEl && ctxAutoFirst) {
  [ctxNameEl, ctxFirstEl].forEach(el => el.addEventListener('input', () => {
    localStorage.setItem('ctx_name', ctxNameEl.value);
    localStorage.setItem('ctx_first', ctxFirstEl.value);
  }));
  ctxAutoFirst.addEventListener('change', () => {
    localStorage.setItem('ctx_autofirst', String(ctxAutoFirst.checked));
  });
}

// ===== Envio individual =====
const toEl = $('#to');
const msgEl = $('#message');
const sendBtn = $('#send');

function sendIndividual() {
  const to = toEl.value.trim();
  const message = msgEl.value.trim();
  if (!to || !message) { addToast('Preencha número e mensagem'); return; }
  sendBtn.disabled = true;
  window.api.sendMessage(to, message).then(() => {
    addToast('Mensagem enviada', 'success');
    addLog(`Enviado → ${to}: ${message}`);
  }).catch((e) => {
    addToast('Erro ao enviar: ' + (e?.message || e), 'danger');
    addLog('Erro ao enviar: ' + (e?.message || e));
  }).finally(() => { sendBtn.disabled = false; });
}
sendBtn?.addEventListener('click', sendIndividual);

// Atalhos globais
window.addEventListener('keydown', (ev) => {
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  if ((isMac ? ev.metaKey : ev.ctrlKey) && ev.key.toLowerCase() === 's') {
    ev.preventDefault(); autoSaveBtn.click();
  }
  if ((isMac ? ev.metaKey : ev.ctrlKey) && ev.key.toLowerCase() === 'enter') {
    ev.preventDefault();
    if ($('.panel.active')?.dataset.panel === 'individual') sendIndividual();
  }
});

// Salvar automação por menu
autoSaveBtn?.addEventListener('click', async () => {
  const txt = (autoTextEl.value || '').trim();
  const options = parseAutomationOptions(automationOptions.value);
  if (!txt) return addToast('Informe a saudação do menu', 'danger');
  if (!options.length) return addToast('Cadastre pelo menos uma opção válida', 'danger');
  autoSaveBtn.disabled = true;
  autoStatusEl.textContent = 'Salvando...';
  try {
    await window.api.setSettings({ automation: {
      enabled: automationEnabled.checked,
      welcomeMessage: txt,
      footerMessage: 'Responda com o número da opção desejada.',
      invalidOptionMessage: automationInvalid.value.trim() || 'Não entendi essa opção.',
      handoffMessage: 'Certo! Encaminhamos sua conversa para um atendente.',
      sessionTimeoutMinutes: Number(automationTimeout.value || 30),
      options,
    } });
    autoStatusEl.textContent = 'Automação salva ✔️';
    addToast('Menu automático salvo', 'success');
    setTimeout(() => { autoStatusEl.textContent = ' '; }, 1500);
  } catch {
    autoStatusEl.textContent = 'Erro ao salvar';
    addToast('Erro ao salvar mensagem', 'danger');
  } finally {
    autoSaveBtn.disabled = false;
  }
});

// ===== Sessão (logout) =====
const logoutBtn = $('#logout');
logoutBtn?.addEventListener('click', async () => {
  logoutBtn.disabled = true;
  addLog('Solicitando logout e limpeza de sessão...');
  try {
    await window.api.logout();
    addToast('Sessão limpa. Escaneie o novo QR.', 'success');
    showQrImage(null);
    updateQrPlaceholderByState('resetting');
    addLog('Sessão limpa. Aguarde aparecer um novo QR na tela.');
  } catch (e) {
    addToast('Erro ao deslogar', 'danger');
    addLog('Erro ao deslogar/limpar: ' + (e?.message || e));
  } finally {
    logoutBtn.disabled = false;
  }
});

// ===== Disparo em massa: elementos =====
const bulkModeEl = $('#bulk-mode');
const bulkImageEl = $('#bulk-image');
const bulkSendBtn = $('#bulk-send');
const bulkPauseBtn = $('#bulk-pause');
const bulkCancelBtn = $('#bulk-cancel');
const bulkBarInner = $('#bulk-bar');
const bulkStatsEl = $('#bulk-stats');
const bulkStateEl = $('#bulk-state');
const bulkTextEl = $('#bulk-text');
const bulkTextCount = $('#bulk-text-count');
const bulkPreviewBtn = $('#bulk-preview');
const bulkPreviewInfo = $('#bulk-preview-info');
const bulkPreviewList = $('#bulk-preview-list');
const bulkPreviewCopy = $('#bulk-preview-copy');
const bulkImgPreviewWrap = $('#bulk-image-preview');
const bulkImgThumb = $('#bulk-image-thumb');
const bulkImgName = $('#bulk-image-name');
const bulkImgRemove = $('#bulk-image-remove');
const bulkDonut = $('#bulk-donut');
const bulkDonutLabel = $('#bulk-donut-label');
const dropzone = $('#dz-bulk-image');

let bulkMedia = null; // { dataBase64, mimetype, filename }
window.__bulkMedia = null; // para uso no modal

// Texto & contadores
bulkTextEl?.addEventListener('input', () => {
  const n = (bulkTextEl.value || '').length;
  bulkTextCount.textContent = `${n} ${n === 1 ? 'caractere' : 'caracteres'}`;
});

// Drag & drop da imagem
function setDropzoneActive(on) { dropzone?.classList.toggle('dragover', !!on); }
['dragenter','dragover'].forEach(evt => dropzone?.addEventListener(evt, (e)=>{ e.preventDefault(); e.stopPropagation(); setDropzoneActive(true); }));
['dragleave','drop'].forEach(evt => dropzone?.addEventListener(evt, (e)=>{ e.preventDefault(); e.stopPropagation(); setDropzoneActive(false); }));
dropzone?.addEventListener('drop', (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (file) handleBulkImage(file);
});
bulkImageEl?.addEventListener('change', async (ev) => {
  const file = ev.target.files?.[0];
  if (file) handleBulkImage(file);
});
function handleBulkImage(file) {
  bulkMedia = null;
  if (!bulkImgPreviewWrap) return;
  bulkImgPreviewWrap.style.display = 'none';
  try {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const [header, base64] = String(dataUrl).split(',');
      const mimetypeMatch = header.match(/^data:(.*);base64$/i);
      const mimetype = mimetypeMatch?.[1] || 'application/octet-stream';
      bulkMedia = { dataBase64: base64, mimetype, filename: file.name || 'imagem' };
      window.__bulkMedia = bulkMedia; // ponte para modal
      bulkImgThumb.src = dataUrl; // preview
      bulkImgName.textContent = `${file.name} (${mimetype})`;
      bulkImgPreviewWrap.style.display = 'flex';
      addLog(`Imagem carregada: ${file.name} (${mimetype})`);
    };
    reader.onerror = (e) => addLog('Erro ao ler imagem: ' + (e?.message || 'desconhecido'));
    reader.readAsDataURL(file);
  } catch (e) {
    addLog('Erro no FileReader: ' + (e?.message || e));
  }
}
bulkImgRemove?.addEventListener('click', () => {
  if (bulkImageEl) bulkImageEl.value = '';
  bulkMedia = null;
  window.__bulkMedia = null;
  if (bulkImgPreviewWrap) bulkImgPreviewWrap.style.display = 'none';
});

// Pré-visualização (alcance)
function clearPreview() {
  if (bulkPreviewInfo) bulkPreviewInfo.textContent = '—';
  if (bulkPreviewList) { bulkPreviewList.textContent = ''; bulkPreviewList.style.display = 'none'; }
  if (bulkPreviewCopy) bulkPreviewCopy.style.display = 'none';
}
bulkPreviewBtn?.addEventListener('click', async () => {
  const mode = bulkModeEl.value;
  const args = { mode };
  if (mode === 'custom') args.list = customList;
  bulkPreviewBtn.disabled = true;
  bulkSendBtn.disabled = true;
  clearPreview();
  bulkPreviewInfo.textContent = 'Calculando alcance…';
  try {
    const { total, recipients, truncated } = await window.api.bulkPreview(args);
    const mapWho = { contacts: 'contatos', chats: 'conversas', custom: 'números da lista' };
    const who = mapWho[mode] || 'destinos';
    const extra = truncated ? ` (mostrando ${recipients.length} primeiros)` : '';
    bulkPreviewInfo.textContent = `Alcance previsto: ${total} ${who}${extra}.`;

    if (recipients && recipients.length) {
      bulkPreviewList.textContent = recipients.join('\n');
      bulkPreviewList.style.display = 'block';
      bulkPreviewCopy.style.display = 'inline-block';
    }
    addToast(`Alcance: ${total} ${who}`, 'success');
  } catch {
    bulkPreviewInfo.textContent = 'Erro ao calcular alcance';
    addToast('Erro ao calcular alcance', 'danger');
  } finally {
    bulkPreviewBtn.disabled = false;
    bulkSendBtn.disabled = false;
  }
});
bulkPreviewCopy?.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(bulkPreviewList.textContent || ''); addToast('Lista copiada', 'success'); }
  catch { addToast('Não foi possível copiar', 'danger'); }
});

// ===== Modal de prévia (novo visual) =====
const confirmBackdrop = $('#confirm-backdrop');
const confirmClose = $('#confirm-close');
const confirmCancel = $('#confirm-cancel');
const confirmGo = $('#confirm-go');
const confirmTotal = $('#confirm-total');
const confirmETA = $('#confirm-eta');
const confirmRisk = $('#confirm-risk');
const confirmText = $('#confirm-text');
const confirmTextCount = $('#confirm-text-count');
const confirmVars = $('#confirm-vars');
const confirmImg = $('#confirm-img');
const confirmNoImg = $('#confirm-noimg');
const confirmImgMeta = $('#confirm-img-meta');

function formatEta(seconds){
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s/60), r = s%60;
  if (m < 60) return r?`${m} min ${r}s`:`${m} min`;
  const h = Math.floor(m/60), m2=m%60;
  return m2?`${h}h ${m2}min`:`${h}h`;
}
function computeRisk(total, delayMs, jitterPct, hasImage){
  let score = 0;
  if (delayMs < 800) score += 2;
  else if (delayMs < 1200) score += 1;
  if (total > 500) score += 2;
  else if (total > 200) score += 1;
  if ((jitterPct||0) < 0.1) score += 1;
  if (hasImage) score += 0.5;
  if (score >= 3) return {level:'alto', cls:'danger'};
  if (score >= 1.5) return {level:'médio', cls:'warn'};
  return {level:'baixo', cls:'ok'};
}
function detectPlaceholders(text){
  const set = new Set();
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m; while((m=re.exec(text))){ set.add(m[1]); }
  return Array.from(set);
}
function approxBase64Bytes(b64){ return Math.floor(((b64||'').length) * 3 / 4); }
function humanBytes(n){
  if (!Number.isFinite(n) || n<=0) return '—';
  const kb = n/1024, mb = kb/1024;
  if (mb>=1) return `${mb.toFixed(2)} MB`;
  return `${Math.ceil(kb)} KB`;
}

let modalKeyHandler = null;
function openConfirmModal({ total, text, imgDataUrl, delayMs, jitterPct }){
  confirmTotal.textContent = `Destinatários: ${total ?? '—'}`;
  const etaSec = total && delayMs ? (total * delayMs)/1000 : 0;
  confirmETA.textContent = `Duração: ${etaSec? '~'+formatEta(etaSec) : '—'}`;

  const hasImage = !!imgDataUrl;
  const risk = computeRisk(Number(total||0), Number(delayMs||1500), Number(jitterPct||0), hasImage);
  confirmRisk.textContent = `Risco: ${risk.level}`;
  confirmRisk.classList.remove('ok','warn','danger');
  confirmRisk.classList.add(risk.cls);

  confirmText.textContent = text || '(sem texto)';
  const n = (text||'').length;
  confirmTextCount.textContent = `${n} ${n===1?'caractere':'caracteres'}`;
  confirmVars.innerHTML = '';
  const vars = detectPlaceholders(text||'');
  if (vars.length){
    vars.forEach(v=>{
      const span = document.createElement('span');
      span.className='chip';
      span.textContent = `{{${v}}}`;
      confirmVars.appendChild(span);
    });
  } else {
    const span = document.createElement('span');
    span.className='subtle';
    span.textContent='Nenhuma variável detectada';
    confirmVars.appendChild(span);
  }

  if (imgDataUrl){
    confirmImg.src = imgDataUrl;
    confirmImg.style.display = 'block';
    confirmNoImg.style.display = 'none';
    const header = String(imgDataUrl).split(',')[0] || '';
    const mt = (header.match(/^data:(.*);base64$/i)||[])[1] || 'image/*';
    const b64 = String(imgDataUrl).split(',')[1] || '';
    const size = humanBytes(approxBase64Bytes(b64));
    confirmImg.onload = ()=>{
      confirmImgMeta.textContent = `${mt.toLowerCase()} • ${confirmImg.naturalWidth}×${confirmImg.naturalHeight}px • ${size}`;
    };
  } else {
    confirmImg.removeAttribute('src');
    confirmImg.style.display = 'none';
    confirmNoImg.style.display = 'block';
    confirmImgMeta.textContent = '—';
  }

  confirmBackdrop.style.display = 'flex';
  confirmGo.focus();

  modalKeyHandler = (ev)=>{
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const ctrlEnter = (isMac?ev.metaKey:ev.ctrlKey) && ev.key.toLowerCase()==='enter';
    if (ev.key==='Escape') closeConfirmModal();
    if (ctrlEnter){ ev.preventDefault(); confirmGo.click(); }
  };
  window.addEventListener('keydown', modalKeyHandler);
}
function closeConfirmModal(){
  confirmBackdrop.style.display = 'none';
  if (modalKeyHandler){ window.removeEventListener('keydown', modalKeyHandler); modalKeyHandler=null; }
}
confirmClose?.addEventListener('click', closeConfirmModal);
confirmCancel?.addEventListener('click', closeConfirmModal);

// Abrir modal com dados ricos
bulkSendBtn?.addEventListener('click', async ()=>{
  const mode = bulkModeEl?.value || 'chats';
  const text = (bulkTextEl?.value || '').trim();
  const args = { mode };
  if (mode === 'custom') args.list = customList;

  bulkSendBtn.disabled = true;
  try{
    const { total } = await window.api.bulkPreview(args);
    if (!total){ addToast('Nenhum destinatário encontrado para este modo','danger'); return; }

    const imgDataUrl = (bulkImgPreviewWrap?.style.display !== 'none' && bulkImgThumb?.src) ? bulkImgThumb.src : null;
    const delayMs = Number(rateDelayEl?.value || 1500);
    const jitterPct = Number(rateJitterEl?.value || 0)/100;

    openConfirmModal({ total, text, imgDataUrl, delayMs, jitterPct });
  }catch{
    addToast('Erro ao calcular alcance','danger');
  }finally{
    bulkSendBtn.disabled = false;
  }
});

// Confirmar envio no modal
confirmGo?.addEventListener('click', async ()=>{
  const mode = bulkModeEl?.value || 'chats';
  const text = (bulkTextEl?.value || '').trim();
  const media = window.__bulkMedia || null;
  const args = { mode, text, media };
  if (mode === 'custom') args.list = customList;

  bulkSendBtn.disabled = true;
  bulkPreviewBtn && (bulkPreviewBtn.disabled = true);
  try{
    closeConfirmModal();
    await window.api.bulkStart(args);
    addToast('Disparo iniciado','success');
  }catch(e){
    addToast('Erro ao iniciar disparo','danger');
  }finally{
    bulkSendBtn.disabled = false;
    bulkPreviewBtn && (bulkPreviewBtn.disabled = false);
  }
});

// ===== Progresso do disparo (IPC) =====
window.api.onBulkProgress((p) => {
  const { status, total, sent, failed, paused } = p;
  const done = Math.min((sent||0) + (failed||0), total||0);
  const pct = total > 0 ? Math.floor((done / total) * 100) : 0;

  if (bulkBarInner) bulkBarInner.style.width = `${pct}%`;
  if (bulkStatsEl) bulkStatsEl.textContent = `${done}/${total} enviado(s) • ${failed||0} falha(s)`;

  if (bulkDonut) bulkDonut.style.setProperty('--pct', pct);
  if (bulkDonutLabel) bulkDonutLabel.textContent = `${pct}%`;

  let st = 'Em execução';
  if (status === 'paused' || paused) st = 'Pausado';
  if (status === 'cancelled') st = 'Cancelado';
  if (status === 'done') st = 'Concluído';
  if (bulkStateEl) bulkStateEl.textContent = st;

  if (status === 'running') {
    bulkSendBtn.disabled = true;
    bulkPauseBtn.disabled = false;
    bulkCancelBtn.disabled = false;
    bulkPreviewBtn.disabled = true;
    bulkPauseBtn.textContent = paused ? 'Retomar' : 'Pausar';
  } else if (status === 'paused') {
    bulkSendBtn.disabled = true;
    bulkPauseBtn.disabled = false;
    bulkCancelBtn.disabled = false;
    bulkPreviewBtn.disabled = true;
    bulkPauseBtn.textContent = 'Retomar';
  } else {
    bulkSendBtn.disabled = false;
    bulkPauseBtn.disabled = true;
    bulkCancelBtn.disabled = true;
    bulkPreviewBtn.disabled = false;
    bulkPauseBtn.textContent = 'Pausar';
  }
});

// Botões de pausa/cancelar
bulkPauseBtn?.addEventListener('click', async () => {
  try { await window.api.bulkPauseToggle(); }
  catch { addToast('Erro ao pausar/retomar', 'danger'); }
});
bulkCancelBtn?.addEventListener('click', async () => {
  try { await window.api.bulkCancel(); }
  catch { addToast('Erro ao cancelar', 'danger'); }
});

// ===== QR / Status / Log (IPC) =====
window.api.onQr((dataUrl) => {
  if (dataUrl) { showQrImage(dataUrl); updateQrPlaceholderByState('qr'); }
  else { showQrImage(null); updateQrPlaceholderByState(lastConnState || 'qr'); }
});
window.api.onStatus((p) => {
  lastConnState = p.state;
  const map = {
    qr: 'Aguardando scan do QR…',
    authenticated: 'Autenticado. Carregando…',
    ready: 'Pronto (conectado) ✅',
    auth_failure: 'Falha de autenticação ❌',
    disconnected: 'Desconectado 🔌',
    resetting: 'Reiniciando sessão…'
  };
  setStatus(map[p.state] || p.state);
  setKpiConn(p.state);
  if (p.state === 'qr') updateQrPlaceholderByState('qr');
  else { showQrImage(null); updateQrPlaceholderByState(p.state); }
});
window.api.onLog((p) => addLog(p.text));

// ===== Listas personalizadas =====
let customList = []; // [{number:'5511...', name:'Maria'}]
const listTextEl = $('#list-text');
const listFileEl = $('#list-file');
const listCountEl = $('#list-count');
const listPreviewEl = $('#list-preview');
const listClearBtn = $('#list-clear');

function updateListPreview() {
  if (listCountEl) listCountEl.textContent = `${customList.length} ${customList.length === 1 ? 'item' : 'itens'}`;
  if (listPreviewEl) {
    const sample = customList.slice(0, 200).map(x => `${x.number}${x.name ? ', '+x.name : ''}`).join('\n');
    listPreviewEl.textContent = sample || '—';
  }
}
listClearBtn?.addEventListener('click', () => {
  customList = [];
  if (listTextEl) listTextEl.value = '';
  if (listFileEl) listFileEl.value = '';
  updateListPreview();
  addToast('Lista limpa', 'success');
});
listTextEl?.addEventListener('input', () => {
  const lines = (listTextEl.value || '').split(/\r?\n/);
  const out = [];
  for (const ln of lines) {
    const parts = ln.split(',');
    const number = String(parts[0] || '').replace(/\D/g, '');
    if (!number) continue;
    const name = (parts[1] || '').trim();
    out.push({ number, name });
  }
  customList = out;
  updateListPreview();
});
listFileEl?.addEventListener('change', async (ev) => {
  const file = ev.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const rows = text.split(/\r?\n/).filter(Boolean);
    if (rows[0] && /number/i.test(rows[0]) && /name/i.test(rows[0])) rows.shift();
    const out = [];
    for (const row of rows) {
      const [c0, c1] = row.split(',');
      const number = String(c0 || '').replace(/\D/g, '');
      if (!number) continue;
      const name = (c1 || '').trim();
      out.push({ number, name });
    }
    customList = out;
    updateListPreview();
    addToast(`CSV carregado (${customList.length} itens)`, 'success');
  } catch {
    addToast('Erro ao ler CSV', 'danger');
  }
});

// ===== Privacidade / Blacklist =====
const privListEl = $('#priv-list');
const privClearBtn = $('#priv-clear');
const privBadge = $('#badge-priv');

function renderBlacklist(list) {
  const arr = Array.isArray(list) ? list : [];
  if (privBadge) {
    if (arr.length > 0) { privBadge.style.display = 'grid'; privBadge.textContent = String(arr.length); }
    else { privBadge.style.display = 'none'; }
  }

  if (!privListEl) return;
  if (!arr.length) { privListEl.textContent = '—'; return; }
  privListEl.innerHTML = '';
  for (const id of arr) {
    const card = document.createElement('div');
    card.style.display = 'flex';
    card.style.justifyContent = 'space-between';
    card.style.alignItems = 'center';
    card.style.borderBottom = '1px solid var(--border-2)';
    card.style.padding = '6px 0';
    const span = document.createElement('span');
    span.textContent = id;
    const btn = document.createElement('button');
    btn.className = 'btn secondary';
    btn.textContent = 'Remover';
    btn.addEventListener('click', async () => {
      try { const res = await window.api.blacklistRemove(id); renderBlacklist(res.blacklist); addToast('Removido', 'success'); }
      catch { addToast('Erro ao remover', 'danger'); }
    });
    card.appendChild(span); card.appendChild(btn);
    privListEl.appendChild(card);
  }
}
async function refreshBlacklist() {
  try { const res = await window.api.blacklistGet(); renderBlacklist(res.blacklist); }
  catch { if (privListEl) privListEl.textContent = 'Erro ao carregar'; }
}
privClearBtn?.addEventListener('click', async () => {
  try { const res = await window.api.blacklistClear(); renderBlacklist(res.blacklist); addToast('Blacklist limpa', 'success'); }
  catch { addToast('Erro ao limpar', 'danger'); }
});
window.api.onPrivacyEvent((_p) => { refreshBlacklist(); });
refreshBlacklist();

// ===== Logs: busca / copiar / baixar =====
const logSearch = $('#log-search');
const logCopy = $('#log-copy');
const logDownload = $('#log-download');
const logClear = $('#clear-log');

logSearch?.addEventListener('input', () => {
  if (!logEl) return;
  const q = (logSearch.value || '').toLowerCase();
  logEl.innerHTML = '';
  (q ? logBuffer.filter(l => l.toLowerCase().includes(q)) : logBuffer).forEach(appendLogLine);
});
logCopy?.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(logBuffer.join('\n')); addToast('Logs copiados', 'success'); }
  catch { addToast('Não foi possível copiar', 'danger'); }
});
logDownload?.addEventListener('click', () => {
  const blob = new Blob([logBuffer.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `lc-bot-logs-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.txt`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});
logClear?.addEventListener('click', () => {
  logBuffer = [];
  if (logEl) logEl.textContent = '';
  addToast('Logs limpos', 'success');
});
