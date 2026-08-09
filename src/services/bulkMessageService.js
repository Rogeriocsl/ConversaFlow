const { MessageMedia } = require('whatsapp-web.js');
const { sleep } = require('../utils/delay');
const { sanitizeCustomList } = require('../utils/phone');
const { firstName, applyTemplate } = require('../utils/template');

class BulkMessageService {
  constructor({ whatsappService, settingsService, privacyService, licenseService, onProgress, log }) {
    this.whatsapp = whatsappService; this.settings = settingsService; this.privacy = privacyService; this.license = licenseService;
    this.onProgress = onProgress; this.log = log; this.job = this.newJob();
  }
  newJob() { return { running: false, paused: false, cancelled: false, mode: '', recipients: [], index: 0, total: 0, ok: 0, fail: 0, text: '', media: null, nameMap: new Map() }; }
  emit(status) { const j = this.job; this.onProgress({ status, mode: j.mode, total: j.total, sent: j.ok, failed: j.fail, pending: Math.max(j.total - j.ok - j.fail, 0), index: j.index, paused: j.paused }); }
  async recipients(mode, customList) {
    this.whatsapp.assertReady(); const client = this.whatsapp.getClient(); let ids;
    if (mode === 'contacts') ids = (await client.getContacts()).filter(x => x.isMyContact && !x.isGroup && x.id?._serialized).map(x => x.id._serialized);
    else if (mode === 'custom') ids = sanitizeCustomList(customList).map(x => x.id);
    else ids = (await client.getChats()).filter(x => !x.isGroup && x.id?._serialized).map(x => x.id._serialized);
    return [...new Set(ids.filter(id => id.endsWith('@c.us') && !this.privacy.has(id)))];
  }
  async preview(mode = 'chats', list) { const recipients = await this.recipients(mode, list); return { total: recipients.length, recipients: recipients.slice(0, 200), truncated: recipients.length > 200, mode }; }
  pause() { this.license.assertValid(); if (!this.job.running) throw new Error('Nenhum disparo em andamento'); this.job.paused = true; this.emit('paused'); return { paused: true }; }
  resume() { this.license.assertValid(); if (!this.job.running) throw new Error('Nenhum disparo em andamento'); this.job.paused = false; this.emit('running'); return { paused: false }; }
  cancel() { this.license.assertValid(); if (!this.job.running) throw new Error('Nenhum disparo em andamento'); this.job.cancelled = true; this.emit('cancelled'); return { cancelled: true }; }
  async start({ mode = 'chats', text = '', media, list }) {
    this.whatsapp.assertReady(); if (this.job.running) throw new Error('Já existe um disparo em andamento');
    const job = this.job = this.newJob(); job.running = true; job.mode = mode; job.text = text;
    if (media?.dataBase64 && media?.mimetype) job.media = new MessageMedia(media.mimetype, media.dataBase64, media.filename || 'imagem');
    for (const item of sanitizeCustomList(list)) if (!this.privacy.has(item.id)) job.nameMap.set(item.id, item.name || '');
    job.recipients = await this.recipients(mode, list); job.total = job.recipients.length; this.emit('running');
    this.log(`📣 Disparo iniciado: ${job.total} destino(s) [modo: ${mode}]`);
    while (job.running && job.index < job.total && !job.cancelled) {
      while (job.paused && !job.cancelled) { this.emit('paused'); await sleep(250); }
      if (job.cancelled) break;
      const id = job.recipients[job.index]; if (this.privacy.has(id)) { job.index++; this.emit('running'); continue; }
      let name = job.nameMap.get(id) || ''; try { if (!name) { const contact = await this.whatsapp.getClient().getContactById(id); name = contact?.pushname || contact?.name || ''; } } catch {}
      const output = applyTemplate(job.text, { name, first: firstName(name) }); let sent = false;
      for (let attempt = 0; attempt < 2 && !sent; attempt++) { try { if (job.media) await this.whatsapp.getClient().sendMessage(id, job.media, { caption: output }); else await this.whatsapp.getClient().sendMessage(id, output); sent = true; } catch (error) { this.log(`${attempt ? '❌ Falhou novamente' : '⚠️ Falha ao enviar'} → ${id}: ${error.message}`); if (!attempt) await sleep(1500); } }
      if (sent) job.ok++; else job.fail++; job.index++; this.emit('running'); await sleep(this.settings.computeSendDelay());
    }
    const status = job.cancelled ? 'cancelled' : 'done'; job.running = false; job.paused = false; this.emit(status); this.log(`📦 Disparo finalizado. Sucesso: ${job.ok} | Falhas: ${job.fail}`);
    return { total: job.total, ok: job.ok, fail: job.fail, status };
  }
}
module.exports = { BulkMessageService };
