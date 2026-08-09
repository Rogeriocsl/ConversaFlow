class PrivacyService {
  constructor({ settingsService, onEvent = () => {}, log = () => {} }) {
    this.settingsService = settingsService;
    this.onEvent = onEvent;
    this.log = log;
  }
  list() { return this.settingsService.get().blacklist.slice(); }
  has(id) { return this.settingsService.get().blacklist.includes(id); }
  async add(id) {
    if (!id || this.has(id)) return this.list();
    await this.settingsService.save({ blacklist: [...new Set([...this.list(), id])] });
    this.onEvent('blacklist:add', { id });
    this.log(`🛑 Opt-out cadastrado: ${id}`);
    return this.list();
  }
  async remove(id) {
    await this.settingsService.save({ blacklist: this.list().filter(item => item !== id) });
    this.onEvent('blacklist:remove', { id });
    return this.list();
  }
  async clear() {
    await this.settingsService.save({ blacklist: [] });
    this.onEvent('blacklist:clear');
    return [];
  }
}
module.exports = { PrivacyService };
