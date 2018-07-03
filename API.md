# Install package

`npm install codechain-sdk` or `yarn add codechain-sdk`

# Usage example
Make sure that your CodeChain RPC server is listening. In the examples, we assume it is localhost:8080

## Send 10000 CCC using PaymentTransaction
This example involves sending CCC from one party to another. 
First, make sure to import the correct sdk and use the proper server port.
```javascript
const SDK = require("codechain-sdk");
// import { Parcel, U256, H256, H160 } from "codechain-sdk";
const { Parcel, U256, H256, H160 } = SDK;

// Create SDK object with CodeChain RPC server URL
const sdk = new SDK("http://localhost:8080");
```
The parcel signer must pay the transaction fees. Parcels are basically a group of transactions used in CodeChain. They are the smallest unit that can be processed on the blockchain. To read more about parcels in general, click here.

In order for the parcel to be valid, the nonce must match the nonce of the parcel signer. Once the parcel is confirmed, the nonce of the signer is increased by 1. When specifying the receiver, make sure the correct address is used for the recipient. In addition, the parcel must be signed with the secret key of the address.
```javascript
const parcelSignerNonce = new U256(0);
// Parcel signer pays 10 CCC as fee.
const fee = new U256(10);
// Network ID prevents replay attacks or confusion among different CodeChain networks.
const networkId = 17;
// Recipient of the payment
const receiver = new H160("744142069fe2d03d48e61734cbe564fcc94e6e31");
// Amount of the payment. The parcel signer's balance must be at least 10010.
const value = new U256(10000);
// Create the Parcel for the payment
const parcel = Parcel.payment(parcelSignerNonce, fee, networkId, receiver, value);

const parcelSignerSecret = new H256("ede1d4ccb4ec9a8bbbae9a13db3f4a7b56ea04189be86ac3a6a439d9a0a1addd");
const signedParcel = parcel.sign(parcelSignerSecret);
```
After signing the parcel, send the parcel off to the CodeChain node. The node is responsible for propagating the parcels properly. sendSignedParcel returns a promise that resolves with a parcel hash if the parcel has been verified and queued successfully. It doesn't mean that the parcel was confirmed, however. getParcel returns a promise that resolves with a parcel. Only confirmed parcels contain blockNumber/blockHash/parcelIndex fields. 
```javascript
sdk.sendSignedParcel(signedParcel).then((hash) => {
    console.log(`Parcel sent:`, hash);
    return sdk.getParcel(hash);
}).then((parcel) => {
    console.log(`Parcel`, parcel);
}).catch((err) => {
    console.error(`Error:`, err);
});

```
To view entire example, click [here]("https://gist.github.com/ScarletBlue/143e667269b4f2cb596e75ee948ce686.js).

## Mint 10000 Gold and send 3000 Gold using AssetMintTransaction, AssetTransferTransaction

This example involves creating new assets and sending them amongst users. It largely involves three steps. First, create key pairs for each users. Then create the asset(in this case, Gold). Finally, execute the transaction.

```javascript
const SDK = require("codechain-sdk");
const { AssetMintTransaction, H256, blake256, signEcdsa, privateKeyToPublic,
    privateKeyToAddress, H160, Parcel, U256, AssetTransferTransaction,
    AssetTransferInput, AssetOutPoint, AssetTransferOutput, Transaction, AssetScheme, AssetTransferAddress } = SDK;

const sdk = new SDK("http://localhost:8080");

// CodeChain opcodes for P2PK(Pay to Public Key)
const OP_PUSHB = 0x32;
const OP_CHECKSIG = 0x80;
```
Create a key pair for both Alice and Bob. There should also be lock scripts created for each key pairs.
```javascript
// Alice's key pair
const alicePrivate = "37a948d2e9ae622f3b9e224657249259312ffd3f2d105eabda6f222074608df3";
const alicePublic = privateKeyToPublic(alicePrivate);
// Alice's P2PK script
const aliceLockScript = Buffer.from([OP_PUSHB, 64, ...Buffer.from(alicePublic, "hex"), OP_CHECKSIG]);
// Hash of the Alice's script
const aliceLockScriptHash = new H256(blake256(aliceLockScript));
// Alice's asset transfer address of given lock script hash.
const aliceAddress = AssetTransferAddress.fromLockScriptHash(aliceLockScriptHash);
console.log("Alice's lock script hash: ", aliceLockScriptHash.value);
console.log("Alice's address: ", aliceAddress.value);

// Bob's key pair
const bobPrivate = "f9387b3247c21e88c656490914f4598a3b52b807517753b4a9d7a51d54a6260c";
const bobPublic = privateKeyToPublic(bobPrivate);
// Bob's P2PK script
const bobLockScript = Buffer.from([OP_PUSHB, 64, ...Buffer.from(bobPublic, "hex"), OP_CHECKSIG]);
// Hash of the Bob's script
const bobLockScriptHash = new H256(blake256(bobLockScript));
// Bob's asset transfer address of given lock script hash.
const bobAddress = AssetTransferAddress.fromLockScriptHash(bobLockScriptHash);
console.log("Bob's lock script hash: ", bobLockScriptHash.value);
console.log("Bob's address: ", bobAddress.value);
```
In this example, it is assumed that there is something that created a parcel out of the transactions. sendTransaction has been declared for later use.

```javascript
// sendTransaction() is a function to make transaction to be processed.
async function sendTransaction(tx) {
    const parcelSignerSecret = new H256("ede1d4ccb4ec9a8bbbae9a13db3f4a7b56ea04189be86ac3a6a439d9a0a1addd");
    const parcelSignerAddress = new H160(privateKeyToAddress("ede1d4ccb4ec9a8bbbae9a13db3f4a7b56ea04189be86ac3a6a439d9a0a1addd"));
    const parcelSignerNonce = await sdk.getNonce(parcelSignerAddress);
    const parcel = Parcel.transactions(parcelSignerNonce, new U256(10), 17, tx);
    const signedParcel = parcel.sign(parcelSignerSecret);
    return await sdk.sendSignedParcel(signedParcel);
}
```
In this example, we want to create an asset called "Gold". Thus, we define a new asset scheme for the asset that will be named Gold. In schemes, the amount to be minted, and the registrar, if any, should be defined. If there is no registrar, it means that AssetTransfer of Gold can be done through any parcel. If the registrar is present, the parcel must be signed by the registrar. In this example, the registrar is set to null.

```javascript
(async () => {
    // Define a new asset scheme for the asset named "Gold"
    const goldAssetScheme = new AssetScheme({
        // Put name, description and imageUrl to metadata.
        metadata: JSON.stringify({
            name: "Gold",
            imageUrl: "https://gold.image/",
        }),
        // Mints 10000 golds
        amount: 10000,
        registrar: null,
    });
    
```
After Gold has been defined in the scheme, the amount that is minted but belong to someone initially. In this example, we create 10000 gold for Alice.
```javascript
    const mintTx = goldAssetScheme.mint(aliceAddress);
```
Then, the AssetMintTransaction is processed with the following code:
```javascript
    // Process the AssetMintTransaction
    await sendTransaction(mintTx);

    // AssetMintTransaction creates Asset and AssetScheme object
    console.log("minted asset scheme: ", await sdk.getAssetScheme(mintTx.hash()));
    const firstGold = await sdk.getAsset(mintTx.hash(), 0);
    console.log("alice's gold: ", firstGold);
```
Alice then sends 3000 gold to Bob. In CodeChain, users must follow the [UTXO](https://codechain.readthedocs.io/en/latest/what-is-codechain.html#what-is-utxo) standard, and make a transaction that spends an entire UTXO balance, and receive the change back through another transaction.
```javascript
    // Spend Alice's 10000 golds. In this case, Alice pays 3000 golds to Bob. Alice
    // is paid the remains back.
    // The sum of amount must equal to the amount of firstGold.
    const transferTx = firstGold.transfer([{
        address: bobAddress,
        amount: 3000
    }, {
        address: aliceAddress,
        amount: 7000
    }]);
```
By using Alice's signature, the 10000 Gold that was first minted can now be transferred to other users like Bob.
```javascript
    // Calculate Alice's signature for the transaction.
    const { r, s, v } = signEcdsa(transferTx.hashWithoutScript().value, alicePrivate);
    const aliceSigBuffer = new Buffer(65);
    aliceSigBuffer.write(r.padStart(64, "0"), 0, 32, "hex");
    aliceSigBuffer.write(s.padStart(64, "0"), 32, 32, "hex");
    aliceSigBuffer.write(v.toString(16).padStart(2, "0"), 64, 1, "hex");

    // Create unlock script for the input of the transaction
    const aliceUnlockScript = Buffer.from([OP_PUSHB, 65, ...aliceSigBuffer]);
    // Put unlock script to the transaction
    transferTx.setLockScript(0, aliceLockScript);
    transferTx.setUnlockScript(0, aliceUnlockScript);

    // Process the AssetTransferTransaction
    await sendTransaction(transferTx);

    // Spent asset will be null
    console.log(await sdk.getAsset(mintTx.hash(), 0));

    // Unspent Bob's 3000 golds
    console.log(await sdk.getAsset(transferTx.hash(), 0));
    // Unspent Alice's 7000 golds
    console.log(await sdk.getAsset(transferTx.hash(), 1));
})();

```
The entire example can be viewed [here](https://gist.github.com/ScarletBlue/c2ce044b4a0fb38766b4e05cc7b4dcc6.js).

# [SDK](classes/sdk.html) methods
 * [getAsset](classes/sdk.html#getasset)
 * [getAssetScheme](classes/sdk.html#getassetscheme)
 * [getBalance](classes/sdk.html#getbalance)
 * [getBlock](classes/sdk.html#getblock)
 * [getBlockHash](classes/sdk.html#getblockhash)
 * [getBestBlockNumber](classes/sdk.html#getbestblocknumber)
 * [getNonce](classes/sdk.html#getnonce)
 * [getParcel](classes/sdk.html#getparcel)
 * [getParcelInvoices](classes/sdk.html#getparcelinvoices)
 * [getPendingParcels](classes/sdk.html#getpendingparcels)
 * [getRegularKey](classes/sdk.html#getregularkey)
 * [getTransactionInvoice](classes/sdk.html#gettransactioninvoice)
 * [ping](classes/sdk.html#ping)
 * [sendSignedParcel](classes/sdk.html#sendsignedparcel)

# Transactions
 * [PaymentTransaction](classes/paymenttransaction.html)
 * [SetRegularKeyTransaction](classes/setregularkeytransaction.html)
 * [AssetMintTransaction](classes/assetminttransaction.html)
 * [AssetTransferTransaction](classes/assettransfertransaction.html)
