const SDK = require("codechain-sdk");

const sdk = new SDK({ server: "http://localhost:8080" });

// sendTransaction() is a function to make transaction to be processed.
async function sendTransaction(tx) {
    const parcelSignerSecret = "ede1d4ccb4ec9a8bbbae9a13db3f4a7b56ea04189be86ac3a6a439d9a0a1addd";
    const parcelSignerAddress = SDK.util.getAccountIdFromPrivate(parcelSignerSecret);
    const parcel = sdk.core.createChangeShardStateParcel({
        transactions: [tx],
    }).sign({
        secret: parcelSignerSecret,
        nonce: await sdk.rpc.chain.getNonce(parcelSignerAddress),
        fee: 10,
    })
    return await sdk.rpc.chain.sendSignedParcel(parcel);
}

(async () => {
    const keyStore = await sdk.key.createMemoryKeyStore();
    const p2pkh = await sdk.key.createP2PKH({ keyStore });

    const aliceAddress = await p2pkh.createAddress();
    const bobAddress = "ccaqqqap7lazh5g84jsfxccp686jakdy0z9v4chrq4vz8pj4nl9lzvf7rs2rnmc0";

    // Create asset named Gold. Total amount of Gold is 10000. The registrar is set
    // to null, which means this type of asset can be transferred freely.
    const goldAssetScheme = sdk.core.createAssetScheme({
        metadata: JSON.stringify({
            name: "Gold",
            description: "An asset example",
            icon_url: "https://gold.image/",
        }),
        amount: 10000,
        registrar: null,
    })

    const mintTx = goldAssetScheme.createMintTransaction({ recipient: aliceAddress });

    await sendTransaction(mintTx);
    const mintTxInvoice = await sdk.rpc.chain.getTransactionInvoice(mintTx.hash(), { timeout: 5 * 60 * 1000 });
    if (!mintTxInvoice.success) {
        throw "AssetMintTransaction failed";
    }

    const firstGold = await sdk.rpc.chain.getAsset(mintTx.hash(), 0);

    const transferTx = sdk.core.createAssetTransferTransaction()
        .addInput(firstGold)
        .addOutput({
            recipient: bobAddress,
            amount: 3000,
            assetType: firstGold.assetType
        })
        .addOutput({
            recipient: aliceAddress,
            amount: 7000,
            assetType: firstGold.assetType
        });
    await transferTx.sign(0, { signer: p2pkh });

    await sendTransaction(transferTx);
    const transferTxInvoice = await sdk.rpc.chain.getTransactionInvoice(transferTx.hash(), { timeout: 5 * 60 * 1000 });
    if (!transferTxInvoice.success) {
        throw "AssetTransferTransaction failed";
    }

    // Unspent Bob's 3000 golds
    console.log(await sdk.rpc.chain.getAsset(transferTx.hash(), 0));
    // Unspent Alice's 7000 golds
    console.log(await sdk.rpc.chain.getAsset(transferTx.hash(), 1));
})().catch((err) => {
    console.error(`Error:`, err);
});