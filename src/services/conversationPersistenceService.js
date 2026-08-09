const fs = require('fs/promises');
const path = require('path');

const EMPTY_DATABASE = Object.freeze({ version: 1, sessions: {}, contacts: {} });

class ConversationPersistenceService {
  constructor({ userDataPath, historyLimit = 100, log = () => {} }) {
    this.filePath = path.join(userDataPath, 'conversations.json');
    this.historyLimit = historyLimit;
    this.log = log;
    this.database = this.emptyDatabase();
    this.writeQueue = Promise.resolve();
  }

  emptyDatabase() { return { version: EMPTY_DATABASE.version, sessions: {}, contacts: {} }; }

  async load() {
    try {
      const parsed = JSON.parse(await fs.readFile(this.filePath, 'utf8'));
      this.database = {
        version: 1,
        sessions: parsed?.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {},
        contacts: parsed?.contacts && typeof parsed.contacts === 'object' ? parsed.contacts : {},
      };
    } catch (error) {
      if (error.code !== 'ENOENT') this.log(`⚠️ Histórico de conversas inválido; uma nova base será criada: ${error.message}`);
      this.database = this.emptyDatabase();
      await this.persist();
    }
    return this.database;
  }

  getSession(contactId) {
    const session = this.database.sessions[contactId];
    return session ? structuredClone(session) : null;
  }

  getContact(contactId) {
    const contact = this.database.contacts[contactId];
    return contact ? structuredClone(contact) : { data: {}, history: [] };
  }

  async saveSession(contactId, session) {
    this.database.sessions[contactId] = structuredClone(session);
    await this.persist();
  }

  async removeSession(contactId) {
    delete this.database.sessions[contactId];
    await this.persist();
  }

  async setContactData(contactId, field, value) {
    const contact = this.ensureContact(contactId);
    contact.data[field] = value;
    contact.updatedAt = Date.now();
    await this.persist();
  }

  async appendHistory(contactId, entry) {
    const contact = this.ensureContact(contactId);
    contact.history.push({ timestamp: Date.now(), ...entry });
    if (contact.history.length > this.historyLimit) contact.history.splice(0, contact.history.length - this.historyLimit);
    contact.updatedAt = Date.now();
    await this.persist();
  }

  ensureContact(contactId) {
    if (!this.database.contacts[contactId]) this.database.contacts[contactId] = { data: {}, history: [], updatedAt: Date.now() };
    return this.database.contacts[contactId];
  }

  persist() {
    const snapshot = JSON.stringify(this.database, null, 2);
    this.writeQueue = this.writeQueue.then(async () => {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const temporaryPath = `${this.filePath}.tmp`;
      await fs.writeFile(temporaryPath, snapshot, 'utf8');
      await fs.rename(temporaryPath, this.filePath);
    });
    return this.writeQueue;
  }
}

module.exports = { ConversationPersistenceService };
