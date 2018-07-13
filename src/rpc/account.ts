import { H160 } from "../core/H160";
import { H256 } from "../core/H256";

import { Rpc } from ".";

export class AccountRpc {
    private rpc: Rpc;

    /**
     * @hidden
     */
    constructor(rpc: Rpc) {
        this.rpc = rpc;
    }

    getAccountList(): Promise<string[]> {
        return this.rpc.sendRpcRequest("account_getAccountList", []);
    }

    createAccount(passphrase?: string): Promise<string> {
        return this.rpc.sendRpcRequest("account_createAccount", [passphrase]);
    }

    createAccountFromSecret(secret: H256 | string, passphrase?: string): Promise<string> {
        return this.rpc.sendRpcRequest("account_createAccountFromSecret", [
            `0x${H256.ensure(secret).value}`,
            passphrase
        ]);
    }

    sign(messageDigest: H256 | string, account: H160 | string, passphrase?: string): Promise<string> {
        return this.rpc.sendRpcRequest("account_sign", [
            `0x${H256.ensure(messageDigest).value}`,
            `0x${H160.ensure(account).value}`,
            passphrase
        ]);
    }
}
