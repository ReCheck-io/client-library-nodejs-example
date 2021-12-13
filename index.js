const { encrypt } = require("aes256");
const { init, login, store, newKeyPair, getHash } = require("recheck-clientjs-library");

const { writeBinaryFile, loadWallet, checkPassword, readBinaryFile } = require("./helpers");

const network = "eth";
const apiUrl = "https://beta.recheck.io";

let userPublicAddress = null;
let userPublicEncrKey = null;


async function go() {
  // For demo purposes we will use static password for every operation -> 123123
  const password = '123123';

  // First we need to init library to know where to send the request and which blockchain network to use
  init(apiUrl, network)

  // Now after selectin blockchain network with init we can create identity
  await createIdentity(password);

  await doLogin(password);

  await doUploadData(password);
}

async function createIdentity(password) {
  // keyPair contains everything for identity
  const keyPair = await newKeyPair(null);

  // Assign some data to a global variables for later usage
  userPublicAddress = keyPair.address;
  userPublicEncrKey = keyPair.publicEncKey;

  // Now identity should be encrypted with the user's password and stored securely
  // the cli tool creates and stores encrypted identity file on File System (we will use the same here for the example)

  // How we are doing it
  const keyPairStr = JSON.stringify(keyPair);
  const encryptedWallet = encrypt(password, keyPairStr);

  // Creating final object
  const walletObject = {
    encryptedWallet: encryptedWallet, // encrypted wallet string
    publicAddress: keyPair.address, // users public address

    // hash of stringified keyPair object 
    // this will be used later for password validation
    walletSha3: getHash(keyPairStr),
  };

  // Store securely this walletObject
  // In this example we will store files on the File System like Hammer CLI
  try {
    const bytesWritten = writeBinaryFile('user.re', JSON.stringify(walletObject));
    if (bytesWritten < 1) {
      throw new Error("Unable to write account data.");
    } else {
      console.log("Identity created!");
    }

  } catch (error) {
    console.log("createIdentity error:", error);
  }
}

async function doLogin(password) {
  if (!(await checkPassword(password))) {
    console.log("Invalid password");
    return false;
  }
  
  try {
    // Here we will use helper function to get and decrypt wallet from storage
    // This example function gets and returns decrypted wallet object
    const wallet = await loadWallet(password);

    console.log('wallet', wallet);

    const loginResponse = await login(wallet.keyPair);
    console.log('loginResponse', loginResponse);

    if (loginResponse) {
      console.log('Login successfull!');
    }

  } catch (error) {
    console.log('doLogin error', error)
  }
}

async function doUploadData(password) {
  // If we want password for uploading data uncomment password validation
  // if (!(await checkPassword(password))) {
  //   console.log("Invalid password");
  //   return false;
  // }
  
  // 1. Read file
  // For the example again we will read files from FS 
  // We've created data folder with few examples 
  // (if you run same file without any changes you will receive errors that it's already uploaded)
  const file = await readBinaryFile('./data/file1.txt');
  
  // 2. Validate file size - max 5mb (For the )
  if (!file || !file.name) {
    throw new Error("Error while reading the file!");
  }

  // 3. Validate file size - max 5mb (For the example we will skip this step)
  // ......
  
  // 4. Create file object these keys below are the required ones
  // Get base64 string from the file payload and name/extension of the file

  const fileExtension = file.name.substring(file.name.lastIndexOf("."));
  const fileName = file.name.substring(0, file.name.lastIndexOf("."));

  let fileObject = {
    payload: file.binary.toString("base64"),
    dataName: fileName,
    dataExtension: fileExtension,
  };

  // Here we can use global variables for userPublicAddress and userPublicEncrKey
  // or we can run loadWallet function which will require user to enter password again
  // const wallet = await loadWallet(password)

  try {
    // Run store function which actually stores file
    let response = await store(fileObject, userPublicAddress, userPublicEncrKey);
    console.log('response', response);
  } catch (error) {
    console.log('doUploadData error:', error);
  }
}

go();