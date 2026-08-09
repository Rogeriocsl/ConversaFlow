#!/usr/bin/env node
/**
 * Gera um par de chaves RSA (2048) em PEM, sem precisar de OpenSSL.
 * Saída: ./private_key.pem e ./public_key.pem
 *
 * Uso:
 *   node tools/gen-keys.js
 *   (opções)
 *   --force        sobrescreve arquivos se já existirem
 *   --outdir DIR   muda a pasta de saída (default: diretório do projeto)
 */

const fs = require('fs');
const path = require('path');
const { generateKeyPairSync } = require('crypto');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { force: false, outdir: process.cwd() };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const n = args[i + 1];
    if (a === '--force') opts.force = true;
    else if (a === '--outdir' && n) { opts.outdir = path.resolve(n); i++; }
  }
  return opts;
}

function main() {
  const opts = parseArgs();
  const outPriv = path.join(opts.outdir, 'private_key.pem');
  const outPub  = path.join(opts.outdir, 'public_key.pem');

  // Segurança: evita sobrescrever sem --force
  if (!opts.force) {
    if (fs.existsSync(outPriv) || fs.existsSync(outPub)) {
      console.error('❌ Já existe private_key.pem/public_key.pem. Use --force para sobrescrever.');
      process.exit(1);
    }
  }

  // Gera o par de chaves RSA 2048 em PEM (PKCS#1 p/ privada, SPKI p/ pública)
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding:  { type: 'spki',  format: 'pem'  },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem'  },
  });

  fs.mkdirSync(opts.outdir, { recursive: true });
  fs.writeFileSync(outPriv, privateKey, 'utf8');
  fs.writeFileSync(outPub,  publicKey,  'utf8');

  console.log('\n✅ Chaves geradas com sucesso!\n');
  console.log('• Privada :', outPriv);
  console.log('• Pública :', outPub);
  console.log('\nCole o conteúdo de public_key.pem no PUBLIC_KEY_PEM do main.js.');
  console.log('Guarde a private_key.pem em segurança (ela assina as licenças).\n');
}

main();
