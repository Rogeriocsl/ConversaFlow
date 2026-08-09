const fs = require('fs/promises');
const path = require('path');
const { verifyLicenseKey, getMachineFingerprint } = require('../../license');

class LicenseService {
  constructor({ userDataPath, publicKey, onChanged = () => {} }) {
    this.filePath = path.join(userDataPath, 'license.key');
    this.publicKey = publicKey;
    this.onChanged = onChanged;
    this.machine = getMachineFingerprint();
    this.state = this.emptyState('Não verificado');
  }
  emptyState(reason) { return { ok: false, reason, exp: null, name: null, machine: this.machine, key: null }; }
  getState() { return { ...this.state, machine: this.machine }; }
  isValid() { return this.state.ok; }
  broadcast() { this.onChanged(this.getState()); }
  assertValid() { if (!this.state.ok) throw new Error(`Licença inválida ou expirada: ${this.state.reason || 'Verifique sua licença'}`); }
  async load() {
    let key;
    try { key = (await fs.readFile(this.filePath, 'utf8')).trim(); } catch {}
    this.state = key ? { ...verifyLicenseKey(key, this.publicKey, Date.now()), key, machine: this.machine } : this.emptyState('Sem licença');
    this.broadcast();
    return this.getState();
  }
  async set(key) {
    if (!key || typeof key !== 'string') throw new Error('Chave de licença vazia');
    const normalized = key.trim();
    const result = verifyLicenseKey(normalized, this.publicKey, Date.now());
    if (!result.ok) { this.state = { ...result, key: null, machine: this.machine }; this.broadcast(); throw new Error(result.reason || 'Licença inválida'); }
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, normalized, 'utf8');
    this.state = { ...result, key: normalized, machine: this.machine };
    this.broadcast();
    return this.getState();
  }
  async reset() {
    await fs.rm(this.filePath, { force: true });
    this.state = this.emptyState('Sem licença');
    this.broadcast();
  }
}
module.exports = { LicenseService };
