const fs = require("fs");
const path = require("path");
const { decrypt } = require("aes256");
const { getHash } = require("recheck-clientjs-library");

function writeBinaryFile(fileName, data) {
  try {
    return fs.writeFileSync(fileName, data, "binary");
  } catch (error) {
    console.error("Unable to write file.");
    process.exit(1);
  }
}

async function readBinaryFile(fileName = 'user.re') {
  try {
    let binary = fs.readFileSync(fileName, "binary").toString("binary");
    return {name: path.basename(fileName), binary: binary}
  } catch (error) {
    console.error("Unable to read input file.");
    console.error(error);
    process.exit(1);
  }
}

async function getWallet() {
  let encryptedIdentity = await readBinaryFile();
  
  if (encryptedIdentity && encryptedIdentity.binary) {
    return JSON.parse(encryptedIdentity.binary) || {};
  }

  return false;
}

async function loadWallet(password) {
  if (!(await checkPassword(password))) {
    return false;
  }

  const wallet = await getWallet();

  let keyPair = {};
  if (wallet && wallet.publicAddress) {
    const decryptedWallet = decrypt(password, wallet.encryptedWallet);
    if (decryptedWallet) {
      keyPair = JSON.parse(decryptedWallet);
    }
  }

  return { ...wallet, keyPair };
}

async function checkPassword(password) {
  // Here we have custom helper function to get wallet from store you need your own to get it from where you stored it
  const wallet = await getWallet();

  // Decrypt wallet from stored wallet object
  const decryptedWallet = decrypt(password, wallet.encryptedWallet);

  // Check if decrypted string's hash is equal to the hash we got before encrypting the object
  // This way we are validating the password
  return getHash(decryptedWallet) === wallet.walletSha3;
}


module.exports = {
  getWallet,
  loadWallet,
  checkPassword,
  readBinaryFile, 
  writeBinaryFile,
}