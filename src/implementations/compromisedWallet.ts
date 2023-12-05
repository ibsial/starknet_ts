import { StarknetWallet } from './Wallet'
import { argentAbi } from '../abi/argent'
import {
    RandomHelpers,
    NumbersHelpers,
    sleep,
    log,
    c,
    retry,
    getTxStatus,
    gweiEthProvider,
    gweiStarkProvider,
    evmTransactionPassed,
    defaultSleep
} from './helpers'
import { ActionResult, Token, Amm, ReadResponse, LpToken } from '../interfaces/Types'
import { Wallet, JsonRpcProvider, HDNodeWallet, formatEther, ethers, keccak256, getBytes, parseEther } from 'ethers'
import {
    Account,
    CallData,
    ec,
    hash,
    SequencerProvider,
    constants,
    uint256,
    Contract,
    Call,
    getChecksumAddress,
    EstimateFee,
    stark,
    Result,
    selector
} from 'starknet'
import { importData } from '../fs_manipulations'
import { SignatureType } from 'ccxt/js/src/static_dependencies/noble-curves/abstract/weierstrass'
import { starknet } from '../data/networks'

class CompromisedWallet extends StarknetWallet {
    publicKey: string | undefined
    compromisedKey: string
    validKey: string
    constructor(address: string, validKey: string, compromisedKey?: string, evmKey?: string) {
        super(undefined, evmKey) // a fake wallet will be created
        // now we need to overwrite key and account
        this.starknetAddress = getChecksumAddress(address)
        this.compromisedKey = compromisedKey ? compromisedKey : validKey
        this.validKey = validKey
    }
    /**
     * change compromised signing key to new one
     * source: https://github.com/argentlabs/argent-contracts-starknet/blob/main/tests/account.test.ts#L105
     * @returns
     */
    async changePrivateKey(): Promise<ActionResult> {
        let compromisedPubKey = ec.starkCurve.getStarkKey(this.compromisedKey)
        let msg = hash.computeHashOnElements([
            selector.getSelectorFromName('change_owner'),
            constants.StarknetChainId.SN_MAIN,
            this.starknetAccount.address,
            compromisedPubKey
        ])
        let signature: SignatureType = ec.starkCurve.sign(msg, this.validKey)
        let validPubKey = ec.starkCurve.getStarkKey(this.validKey)
        const argent = new Contract(argentAbi, this.starknetAddress, this.starknetAccount)
        let changePubKeyCallData: Call = argent.populate('change_owner', [validPubKey, signature.r, signature.s])
        try {
            let changeKeyTx = await this.starknetAccount.execute([changePubKeyCallData])
            log(c.green(starknet.explorer.tx + changeKeyTx.transaction_hash))
            let txPassed = await this.retryGetTxStatus(changeKeyTx.transaction_hash, '')
            if (!txPassed.success) {
                log('❌ private key change failed')
                return { success: false, statusCode: 0, transactionHash: '❌ private key change failed' }
            }
            this.starknetAccount = new Account(this.starkProvider, this.starknetAddress, this.validKey, '1')
            log(c.green.bold('Changed private key succesfully!'))
            return { success: true, statusCode: 1, transactionHash: '✅ Changed private key succesfully!' }
        } catch (e) {
            log(e)
            return { success: false, statusCode: 0, transactionHash: '❌ private key change failed' }
        }
    }
    /**
     * check if this account is deployed
     * get current public key and compare to the valid one
     * change private key if it's compromised
     * @returns
     */
    async setupAccount(): Promise<ActionResult> {
        let isWalletDeployed: ReadResponse = await retry(this.isAccountDeployed.bind(this), {}, this.starknetAddress)
        if (isWalletDeployed.result) {
            let currentPubKey: ReadResponse = await retry(this.getOwner.bind(this), {})
            if (currentPubKey.result != '') {
                // compare current accounts pub key to the ones supplied by the user
                let validPubKey = ec.starkCurve.getStarkKey(this.validKey)
                let compromisedPubKey = ec.starkCurve.getStarkKey(this.compromisedKey)
                if (currentPubKey.result != validPubKey) {
                    // account is probably stolen...
                    if (currentPubKey.result != compromisedPubKey) {
                        log(`${c.bold(this.starknetAddress)} account's private key is not the one you've supplied`)
                        log(c.red(`make sure it has not been stolen :(`))
                        return { success: false, statusCode: -1, transactionHash: '' }
                    }
                    log(c.red(`account ${this.starknetAddress} has compromised private key, let's change`))
                    this.starknetAccount = new Account(
                        this.starkProvider,
                        this.starknetAddress,
                        this.compromisedKey,
                        '0'
                    )
                    this.publicKey = currentPubKey.result
                    // need upgrade to make sure the right cairo version is set
                    let res: ActionResult = await this.upgradeWallet(this.compromisedKey)
                    if (res.statusCode <= 0) return res
                    return await this.changePrivateKey()
                }
                log(c.green(`${this.starknetAddress} has a valid private key`))
                this.publicKey = currentPubKey.result
                this.starknetAccount = new Account(this.starkProvider, this.starknetAddress, this.validKey, '0')
                await this.upgradeWallet(this.validKey)
                return { success: true, statusCode: 1, transactionHash: '' }
            }
        }
        if (this.validKey == this.compromisedKey) {
            log(`${this.starknetAddress} is not deployed yet`)
            return { success: true, statusCode: 1, transactionHash: '' }
        } else {
            log(`${this.starknetAddress} is not deployed yet`)
            log(
                c.red(
                    `you probably don't want it to be deployed, since both ${c.italic('valid')} and ${c.italic(
                        'compromised'
                    )} keys are provided`
                )
            )
            return { success: false, statusCode: -1, transactionHash: '' }
        }
    }
    async getOwner() {
        const argent = new Contract(argentAbi, this.starknetAddress, this.starkProvider)
        try {
            const res: Result = await argent.call('get_owner', [])
            if (typeof res !== 'bigint') {
                return { success: false, statusCode: 0, result: '' }
            }
            let currentPubKey = '0x' + res.toString(16) // there's probably a better way to do this..
            return { success: true, statusCode: 1, result: currentPubKey }
        } catch (e) {
            log(e)
            log(c.red('this is an unexpected error...'))
            return { success: false, statusCode: 0, result: '' }
        }
    }
}

export { CompromisedWallet }
