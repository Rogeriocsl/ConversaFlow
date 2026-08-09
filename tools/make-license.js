#!/usr/bin/env node
/**
 * Gerador de licença (uso do "dono" apenas).
 *
 * Requer: Node.js e um arquivo de chave privada RSA (ex.: private_key.pem).
 * Gera licenseKey no formato: base64url(bodyJSON) + '.' + base64url(assinatura)
 *
 * Exemplo:
 *   node tools/make-license.js --name "Cliente ACME" --machine 3a4f... --days 30 --key ./private_key.pem --features core,bulk --out ./acme.lic
 *
 * Para expiração fixa:
 *   node tools/make-license.js --name "Cliente" --machine <fp> --exp 2025-12-31T23:59:59Z --key ./private_key.pem
 * 
 * node tools/make-license.js --name "Cliente ACME" --machine "50213c594a28112bb4fe488188c72561d3db389cfcf2ab288dd7f67b93ee140d" --days 30 --key ./private_key.pem --features core,bulk --out ./acme.lic

 */


const fs = require('fs');
const crypto = require('crypto');

function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const next = args[i+1];
    if (a === '--name') out.name = next, i++;
    else if (a === '--machine') out.machine = next, i++;
    else if (a === '--days') out.days = Number(next), i++;
    else if (a === '--exp') out.exp = next, i++;
    else if (a === '--key') out.keyPath = next, i++;
    else if (a === '--features') out.features = next, i++;
    else if (a === '--out') out.out = next, i++;
  }
  return out;
}

function toIsoDateInUtc(date) {
  return new Date(date.getTime() - date.getTimezoneOffset()*60000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

(async function main(){
  const { name, machine, days, exp, keyPath, features, out } = parseArgs();
  if (!name || !machine || !keyPath || (!days && !exp)) {
    console.error('Uso: --name "Cliente" --machine <fingerprint> (--days N | --exp ISO) --key private_key.pem [--features core,bulk] [--out arquivo.lic]');
    process.exit(1);
  }
  const priv = fs.readFileSync(keyPath, 'utf8');

  let expIso = exp;
  if (!expIso) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + Number(days));
    expIso = toIsoDateInUtc(d);
  }

  const payload = {
    name,
    machine,
    exp: expIso,
    issued_at: toIsoDateInUtc(new Date()),
    features: features ? String(features).split(',').map(s => s.trim()).filter(Boolean) : ['core']
  };
  const bodyStr = JSON.stringify(payload);
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(Buffer.from(bodyStr, 'utf8'));
  const sig = sign.sign(priv);

  const licenseKey = `${base64url(Buffer.from(bodyStr,'utf8'))}.${base64url(sig)}`;

  if (out) fs.writeFileSync(out, licenseKey, 'utf8');
  console.log('\n=== LICENSE KEY (cole no app) ===\n');
  console.log(licenseKey + '\n');
  if (out) console.log('Salvo em:', out);
})();
