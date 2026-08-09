// license.js
// Utilitários de licença: verificação RSA, fingerprint da máquina, base64url.

const crypto = require('crypto');
const { machineIdSync } = require('node-machine-id');

function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function unbase64url(s) {
  s = String(s || '').replace(/-/g,'+').replace(/_/g,'/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}

function getMachineFingerprint() {
  // ID único da máquina → SHA-256 (não expõe o ID original)
  const raw = machineIdSync({ original: true });
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Formato do licenseKey:
 *   base64url(JSON_sem_assinatura) + '.' + base64url(assinatura_RSA_SHA256)
 * Campos do payload JSON: { name, machine, exp, issued_at, features? }
 */
function verifyLicenseKey(licenseKey, publicKeyPem, nowMs = Date.now()) {
  if (!licenseKey || typeof licenseKey !== 'string' || !licenseKey.includes('.')) {
    return { ok: false, reason: 'Formato inválido' };
  }
  const [bodyB64, sigB64] = licenseKey.split('.');
  try {
    const bodyBuf = unbase64url(bodyB64);
    const sigBuf = unbase64url(sigB64);

    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(bodyBuf);
    const valid = verify.verify(publicKeyPem, sigBuf);
    if (!valid) return { ok: false, reason: 'Assinatura inválida' };

    const payload = JSON.parse(bodyBuf.toString('utf8'));
    const { name, machine, exp, issued_at, features } = payload || {};
    if (!name || !machine || !exp) return { ok: false, reason: 'Campos obrigatórios ausentes' };

    const expMs = Date.parse(exp);
    if (!Number.isFinite(expMs)) return { ok: false, reason: 'Data de expiração inválida' };
    if (nowMs > expMs) return { ok: false, reason: 'Licença expirada', exp };

    const localMachine = getMachineFingerprint();
    if (String(machine).toLowerCase() !== String(localMachine).toLowerCase()) {
      return { ok: false, reason: 'Licença não corresponde a esta máquina', exp, name, machine };
    }

    return { ok: true, reason: 'ok', exp, name, machine, issued_at, features: Array.isArray(features) ? features : [] };
  } catch (e) {
    return { ok: false, reason: 'Erro ao verificar licença: ' + e.message };
  }
}

module.exports = { verifyLicenseKey, getMachineFingerprint, base64url, unbase64url };
