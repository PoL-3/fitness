/**
 * SSH helpers (OpenSSH / PuTTY PPK) based on Digital Bazaar Forge.
 *
 * Source inspiration: Forge project (BSD or GPLv2).
 * See license in upstream Forge repo:
 * https://github.com/digitalbazaar/forge/blob/cbebca3780658703d925b61b2caffb1d263a6c1d/LICENSE
 *
 * This module is intended to run on the backend (Node.js).
 */

const forge = require('node-forge');

/**
 * Encodes (and optionally encrypts) a private RSA key as a PuTTY PPK file.
 *
 * @param {object} privateKey forge.pki RSA private key object
 * @param {string} passphrase passphrase to protect the key (falsy for no encryption)
 * @param {string} comment comment to include
 * @returns {string} PPK file contents
 */
function privateKeyToPutty(privateKey, passphrase, comment) {
  comment = comment || '';
  passphrase = passphrase || '';
  const algorithm = 'ssh-rsa';
  const encryptionAlgorithm = passphrase === '' ? 'none' : 'aes256-cbc';

  let ppk = `PuTTY-User-Key-File-2: ${algorithm}\r\n`;
  ppk += `Encryption: ${encryptionAlgorithm}\r\n`;
  ppk += `Comment: ${comment}\r\n`;

  // public key into buffer for ppk
  const pubbuffer = forge.util.createBuffer();
  _addStringToBuffer(pubbuffer, algorithm);
  _addBigIntegerToBuffer(pubbuffer, privateKey.e);
  _addBigIntegerToBuffer(pubbuffer, privateKey.n);

  // write public key
  const pub = forge.util.encode64(pubbuffer.bytes(), 64);
  let length = Math.floor(pub.length / 66) + 1; // 66 = 64 + \r\n
  ppk += `Public-Lines: ${length}\r\n`;
  ppk += pub;

  // private key into a buffer
  const privbuffer = forge.util.createBuffer();
  _addBigIntegerToBuffer(privbuffer, privateKey.d);
  _addBigIntegerToBuffer(privbuffer, privateKey.p);
  _addBigIntegerToBuffer(privbuffer, privateKey.q);
  _addBigIntegerToBuffer(privbuffer, privateKey.qInv);

  // optionally encrypt the private key
  let priv;
  if (!passphrase) {
    // use the unencrypted buffer
    priv = forge.util.encode64(privbuffer.bytes(), 64);
  } else {
    // encrypt RSA key using passphrase
    let encLen = privbuffer.length() + 16 - 1;
    encLen -= encLen % 16;

    // pad private key with sha1-d data -- needs to be a multiple of 16
    const padding = _sha1(privbuffer.bytes());
    padding.truncate(padding.length() - encLen + privbuffer.length());
    privbuffer.putBuffer(padding);

    const aeskey = forge.util.createBuffer();
    aeskey.putBuffer(_sha1('\x00\x00\x00\x00', passphrase));
    aeskey.putBuffer(_sha1('\x00\x00\x00\x01', passphrase));

    // encrypt some bytes using CBC mode
    // key is 40 bytes, so truncate *by* 8 bytes => 32 bytes (AES-256)
    const cipher = forge.aes.createEncryptionCipher(aeskey.truncate(8), 'CBC');
    cipher.start(forge.util.createBuffer().fillWithByte(0, 16));
    cipher.update(privbuffer.copy());
    cipher.finish();
    const encrypted = cipher.output;

    // due to padding we finish as an exact multiple of 16
    encrypted.truncate(16); // all padding

    priv = forge.util.encode64(encrypted.bytes(), 64);
  }

  // output private key
  length = Math.floor(priv.length / 66) + 1; // 64 + \r\n
  ppk += `\r\nPrivate-Lines: ${length}\r\n`;
  ppk += priv;

  // MAC
  const mackey = _sha1('putty-private-key-file-mac-key', passphrase);

  const macbuffer = forge.util.createBuffer();
  _addStringToBuffer(macbuffer, algorithm);
  _addStringToBuffer(macbuffer, encryptionAlgorithm);
  _addStringToBuffer(macbuffer, comment);
  macbuffer.putInt32(pubbuffer.length());
  macbuffer.putBuffer(pubbuffer);
  macbuffer.putInt32(privbuffer.length());
  macbuffer.putBuffer(privbuffer);

  const hmac = forge.hmac.create();
  hmac.start('sha1', mackey);
  hmac.update(macbuffer.bytes());

  ppk += `\r\nPrivate-MAC: ${hmac.digest().toHex()}\r\n`;
  return ppk;
}

/**
 * Encodes a public RSA key as an OpenSSH file.
 *
 * @param {object} key forge.pki RSA public key object
 * @param {string} comment comment
 * @returns {string} OpenSSH public key line
 */
function publicKeyToOpenSSH(key, comment) {
  const type = 'ssh-rsa';
  comment = comment || '';

  const buffer = forge.util.createBuffer();
  _addStringToBuffer(buffer, type);
  _addBigIntegerToBuffer(buffer, key.e);
  _addBigIntegerToBuffer(buffer, key.n);

  return `${type} ${forge.util.encode64(buffer.bytes())} ${comment}`;
}

/**
 * Encodes a private RSA key as an OpenSSH PEM file.
 *
 * @param {object} privateKey forge.pki RSA private key object
 * @param {string} passphrase passphrase (falsy for no encryption)
 * @returns {string} PEM
 */
function privateKeyToOpenSSH(privateKey, passphrase) {
  if (!passphrase) {
    return forge.pki.privateKeyToPem(privateKey);
  }
  // OpenSSH private key is just a legacy format in Forge terms
  return forge.pki.encryptRsaPrivateKey(privateKey, passphrase, {
    legacy: true,
    algorithm: 'aes128',
  });
}

/**
 * Gets the SSH fingerprint for the given public key.
 *
 * @param {object} key forge.pki RSA public key object
 * @param {object} options
 * @returns {any}
 */
function getPublicKeyFingerprint(key, options) {
  options = options || {};
  const md = options.md || forge.md.md5.create();

  const type = 'ssh-rsa';
  const buffer = forge.util.createBuffer();
  _addStringToBuffer(buffer, type);
  _addBigIntegerToBuffer(buffer, key.e);
  _addBigIntegerToBuffer(buffer, key.n);

  md.start();
  md.update(buffer.getBytes());
  const digest = md.digest();
  if (options.encoding === 'hex') {
    const hex = digest.toHex();
    if (options.delimiter) {
      return hex.match(/.{2}/g).join(options.delimiter);
    }
    return hex;
  } else if (options.encoding === 'binary') {
    return digest.getBytes();
  } else if (options.encoding) {
    throw new Error(`Unknown encoding "${options.encoding}".`);
  }
  return digest;
}

function _addBigIntegerToBuffer(buffer, val) {
  let hexVal = val.toString(16);
  // ensure 2s complement +ve
  if (hexVal[0] >= '8') {
    hexVal = `00${hexVal}`;
  }
  const bytes = forge.util.hexToBytes(hexVal);
  buffer.putInt32(bytes.length);
  buffer.putBytes(bytes);
}

function _addStringToBuffer(buffer, val) {
  buffer.putInt32(val.length);
  buffer.putString(val);
}

function _sha1() {
  const sha = forge.md.sha1.create();
  for (let i = 0; i < arguments.length; ++i) {
    sha.update(arguments[i]);
  }
  return sha.digest();
}

module.exports = {
  privateKeyToPutty,
  publicKeyToOpenSSH,
  privateKeyToOpenSSH,
  getPublicKeyFingerprint,
};

