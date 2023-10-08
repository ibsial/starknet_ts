import { ethereum, starknet } from '../data/networks'
import { starknet_bridge_abi } from '../abi/starknet_bridge'
import {
    eth_bridge,
    good_gwei,
    action_sleep_interval,
    wallet_sleep_interval,
    modulesCount,
    maxCount
} from '../../config'
import {
    RandomHelpers,
    NumbersHelpers,
    sleep,
    log,
    c,
    retry,
    getTxStatus,
    gweiEthProvider,
    evmTransactionPassed,
    defaultSleep
} from './helpers'
import { erc20_abi } from '../abi/erc20'
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
    stark
} from 'starknet'
import axios from 'axios'
import { starknetId } from '../abi/starknetId'
import { starkverse } from '../abi/starkverse'
import { dmail } from '../abi/dmail'
import { starkTokens } from '../data/tokens'
import { unframed } from '../abi/unframed'
import { zkLend } from '../abi/zkLend'
class StarknetWallet {
    // init Account here
    mnemonic: string
    index: string
    groundKey: string

    ethProvider: JsonRpcProvider
    ethSigner: Wallet
    modulesCount: any
    maxModulesCount: number
    starkProvider = new SequencerProvider({
        baseUrl: constants.BaseUrl.SN_MAIN
    })
    starknetKey: string
    starknetAddress: string
    starknetAccount: Account
    // tokens for future selections
    nonZeroTokens: Token[] = []
    nonZeloLps: LpToken[] = []

    private accountClassHash = '0x033434ad846cdd5f23eb73ff09fe6fddd568284a0fb7d1be20ee482f044dabe2'
    private argentProxyClassHash = '0x25ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918'
    private argentClassHash_cairo1 = '0x1a736d6ed154502257f02b1ccdf4d9d1089f80811cd6acad48e6b6a9d1f2003'
    /**
     *
     * @param mnemonic starknet seed phrase
     * @param evmPrivateKey eth private key
     * @param index
     */
    constructor(mnemonic?: string, evmPrivateKey?: string, index?: string) {
        if (!mnemonic) mnemonic = 'spin garbage trend design rack fork damage laundry bottom tumble pistol grief'
        if (index == undefined) index = '0'
        const signer = Wallet.fromPhrase(mnemonic)
        if (evmPrivateKey == undefined) evmPrivateKey = signer.privateKey
        const masterNode = HDNodeWallet.fromSeed(signer.privateKey)
        const childNode = masterNode.derivePath(`m/44'/9004'/0'/0/${index}`)
        const groundKey = '0x' + ec.starkCurve.grindKey(childNode.privateKey)
        this.groundKey = groundKey
        const publicKey = ec.starkCurve.getStarkKey(groundKey)
        const constructorCallData = CallData.compile({
            implementation: this.accountClassHash,
            selector: hash.getSelectorFromName('initialize'),
            calldata: CallData.compile({
                signer: publicKey,
                guardian: '0'
            })
        })
        let addr = hash.calculateContractAddressFromHash(publicKey, this.argentProxyClassHash, constructorCallData, 0)
        // log(addr)
        this.ethProvider = new JsonRpcProvider(ethereum.url, 1)
        this.mnemonic = mnemonic
        this.index = index
        this.ethSigner = new Wallet(evmPrivateKey, this.ethProvider)
        this.starknetKey = groundKey
        this.starknetAddress = getChecksumAddress(addr)
        this.starknetAccount = new Account(this.starkProvider, addr, groundKey)

        this.maxModulesCount = RandomHelpers.getRandomIntFromTo(maxCount[0], maxCount[1])
        this.modulesCount = {}
        for (let key in modulesCount) {
            this.modulesCount[key] = RandomHelpers.getRandomIntFromTo(modulesCount[key][0], modulesCount[key][1])
        }
        this.modulesCount.sum = () => {
            let sum = 0
            for (let key in modulesCount) {
                if (key == 'sum') continue
                sum += this.modulesCount[key]
            }
            return sum
        }
    }
    async init(): Promise<ReadResponse> {
        return await this.findDeployedAddress(this.mnemonic, this.index)
    }
    async bridgeMainnet(): Promise<ActionResult> {
        const bridge = new ethers.Contract(
            '0xae0Ee0A63A2cE6BaeEFFE56e7714FB4EFE48D419',
            starknet_bridge_abi,
            this.ethSigner
        )
        let balance: any = await this.ethProvider.getBalance(this.ethSigner.address)
        const payload: string[] = [
            this.starknetAddress.toLowerCase(),
            uint256.bnToUint256(balance).low.toString(),
            uint256.bnToUint256(balance).high.toString()
        ]
        let res: any = await this.starkProvider.estimateMessageFee({
            from_address: '0xae0ee0a63a2ce6baeeffe56e7714fb4efe48d419', // eth bridge address
            to_address: '0x073314940630fd6dcda0d772d4c972c4e0a9946bef9dabf4ef84eda8ef542b82', // starknet bridge addr
            entry_point_selector: 'handle_deposit',
            payload
        })
        let estimate: bigint
        let price: any
        try {
            estimate = await bridge.deposit.estimateGas('1000000', this.starknetAddress, {
                value: BigInt(res.overall_fee) + 1000000n
            })
            price = (await this.ethProvider.getFeeData()).gasPrice
            log('send eth to starknet cost:~', formatEther(estimate * price * 13n), 'ETH')
        } catch (e: any) {
            log(c.red('error:', e.code))
            if (e.code == 'INSUFFICIENT_FUNDS') {
                return {
                    success: false,
                    statusCode: -1,
                    transactionHash: ''
                }
            } else {
                return {
                    success: false,
                    statusCode: 0,
                    transactionHash: ''
                }
            }
        }
        let tx: any
        try {
            let amountFrom: bigint = NumbersHelpers.floatStringToBigInt(eth_bridge.amount_to_leave_from, 18n)
            let amountTo: bigint = NumbersHelpers.floatStringToBigInt(eth_bridge.amount_to_leave_to, 18n)
            let amountToLeave: bigint = RandomHelpers.getRandomBnFromTo(amountFrom, amountTo)
            let amount = BigInt(balance - (estimate * price * 150n) / 100n) - amountToLeave - BigInt(res.overall_fee)

            tx = await bridge.deposit(amount, this.starknetAddress, {
                value: BigInt(res.overall_fee) + amount,
                gasPrice: (price * 12n) / 10n,
                gasLimit: (estimate * 12n) / 10n
            })
            // log(tx)
            log(
                `bridged ${NumbersHelpers.bigIntToPrettyFloatStr(amount, 18n)} ETH from ${this.ethSigner.address} to ${
                    this.starknetAddress
                }`
            )
            log(`[ ${this.starknetAddress} ]`)
            log(c.green(ethereum.explorer.tx + tx.hash))
            log(c.yellow(`wait tx status...`))
            if (await evmTransactionPassed(this.ethProvider, tx.hash)) {
                log(c.green(`success`))
                return {
                    success: true,
                    statusCode: 1,
                    transactionHash: `✅ sent ${formatEther(amount)} ETH from ${this.ethSigner.address} to ${
                        this.starknetAddress
                    }`
                }
            } else {
                log(c.red(`Tx failed :(`))
                return { success: false, statusCode: 0, transactionHash: '❌ bridge failed' }
            }
        } catch (e: any) {
            log(e)
            // log(c.red('error', e))
            log(c.red('error', e.code))
            if (e.code == 'INSUFFICIENT_FUNDS') {
                return { success: false, statusCode: -1, transactionHash: '❌ INSUFFICIENT_FUNDS' }
            } else {
                return { success: false, statusCode: 0, transactionHash: '❌ bridge failed' }
            }
        }
    }
    async findDeployedAddress(mnemonic: string, index: string): Promise<ReadResponse> {
        const signer = Wallet.fromPhrase(mnemonic)
        const masterNode = HDNodeWallet.fromSeed(signer.privateKey)
        const childNode = masterNode.derivePath(`m/44'/9004'/0'/0/${index}`)
        const groundKey = '0x' + ec.starkCurve.grindKey(childNode.privateKey)
        const publicKey = ec.starkCurve.getStarkKey(groundKey)

        const constructorCallDataCairo0 = CallData.compile({
            implementation: this.accountClassHash,
            selector: hash.getSelectorFromName('initialize'),
            calldata: CallData.compile({
                signer: publicKey,
                guardian: '0'
            })
        })
        const constructorCallDataCairo1 = CallData.compile({
            owner: publicKey,
            guardian: '0'
        })
        let cairo0Address = hash.calculateContractAddressFromHash(
            publicKey,
            this.argentProxyClassHash,
            constructorCallDataCairo0,
            0
        )
        let cairo1Address = hash.calculateContractAddressFromHash(
            publicKey,
            this.argentClassHash_cairo1,
            constructorCallDataCairo1,
            0
        )
        cairo0Address = getChecksumAddress(cairo0Address)
        cairo1Address = getChecksumAddress(cairo1Address)
        let isCairo0Deployed: ReadResponse = await retry(this.isAccountDeployed.bind(this), {}, cairo0Address)
        // log(isCairo0Deployed)
        let isCairo1Deployed: ReadResponse = await retry(this.isAccountDeployed.bind(this), {}, cairo1Address)
        // log(isCairo1Deployed)
        if (isCairo0Deployed.result) {
            this.starknetAddress = cairo0Address
            // suppose wallet is not upgraded, cairo check will be performed later
            this.starknetAccount = new Account(this.starkProvider, cairo0Address, groundKey, "0")
            return { success: true, statusCode: 1, result: cairo0Address }
        } else if (isCairo1Deployed.result) {
            this.starknetAddress = cairo1Address
            this.starknetAccount = new Account(this.starkProvider, cairo1Address, groundKey, "1")
            return { success: true, statusCode: 1, result: cairo1Address }
        } else {
            this.starknetAddress = cairo1Address
            this.starknetAccount = new Account(this.starkProvider, cairo1Address, groundKey, "1")
            return { success: true, statusCode: 1, result: cairo1Address }
        }
    }
    async isAccountDeployed(address?: string): Promise<ReadResponse> {
        if (!address) address = this.starknetAddress
        try {
            let nonce: string = await this.starkProvider.getNonceForAddress(address)
            // log(address, nonce)
            if (nonce != '0x0') {
                return { success: true, statusCode: 1, result: true }
            } else {
                return { success: true, statusCode: 1, result: false }
            }
        } catch (e) {
            return { success: false, statusCode: 0, result: false }
        }
    }
    async upgradeWallet(): Promise<ActionResult> {
        let currentClassHash = await retry(
            this.starkProvider.getClassHashAt.bind(this.starkProvider),
            {
                maxRetries: 10,
                retryInterval: 5
            },
            this.starknetAddress
        )
        if (currentClassHash != this.argentClassHash_cairo1) {
            // upgrade
            this.starknetAddress
            const callData: Call = {
                contractAddress: this.starknetAddress,
                entrypoint: 'upgrade',
                calldata: [this.argentClassHash_cairo1, '0x1', '0x0']
            }
            try {
                const tx: any = await this.starknetAccount.execute(callData)
                let txPassed = await this.retryGetTxStatus(tx.transaction_hash, '')
                if (!txPassed.success) {
                    log('❌ account upgrade failed')
                    return { success: false, statusCode: 0, transactionHash: '❌ account upgrade failed' }
                }
                this.starknetAccount = new Account(this.starkProvider, this.starknetAddress, this.groundKey, "1")
                log(c.green(`wallet upgraded to Cairo 1.0: ${starknet.explorer.tx}${tx.transaction_hash}`))
                await defaultSleep(RandomHelpers.getRandomIntFromTo(10, 30))
                return {
                    success: true,
                    statusCode: 1,
                    transactionHash: `✅ upgraded to Cairo 1.0 ${this.starknetAddress}`
                }
            } catch (e: any) {
                log(e)
                return { success: false, statusCode: 0, transactionHash: `❌ account upgrade failed` }
            }
        }
        this.starknetAccount = new Account(this.starkProvider, this.starknetAddress, this.groundKey, "1")
        return { success: true, statusCode: 1, transactionHash: `wallet version: Cairo 1.0` }
    }
    /**
     * not retried checkAndDeployWallet
     * взято с https://www.starknetjs.com/docs/guides/create_account
     * @returns
     */
    async checkAndDeployWallet(): Promise<ActionResult> {
        let deployed: ReadResponse = await retry(this.isAccountDeployed.bind(this), {
            maxRetries: 10,
            retryInterval: 5
        })
        // log(deployed)
        if (deployed.success && deployed.result) {
            return await this.upgradeWallet()
            // return { success: true, statusCode: 1, transactionHash: `${this.starknetAddress} already deployed` }
        }
        let pubKey = ec.starkCurve.getStarkKey(this.starknetKey)
        let AXproxyConstructorCallData = CallData.compile({ owner: pubKey, guardian: '0' })
        const AXcontractAddress = hash.calculateContractAddressFromHash(
            pubKey,
            this.argentClassHash_cairo1,
            AXproxyConstructorCallData,
            0
        )
        const deployAccountPayload = {
            classHash: this.argentClassHash_cairo1,
            constructorCalldata: AXproxyConstructorCallData,
            contractAddress: AXcontractAddress,
            addressSalt: pubKey
        }
        try {
            const tx = await this.starknetAccount.deployAccount(deployAccountPayload)
            let txPassed = await this.retryGetTxStatus(tx.transaction_hash, '')
            if (!txPassed.success) {
                log('❌ account deploy failed')
                return { success: false, statusCode: 0, transactionHash: '❌ account deploy failed' }
            }
            log(`✅ deployed ${this.starknetAddress}`)
            return { success: true, statusCode: 1, transactionHash: `✅ deployed ${this.starknetAddress}` }
        } catch (e: any) {
            log(e)
            return { success: false, statusCode: 0, transactionHash: `❌ failed to deploy ${this.starknetAddress}` }
        }
    }
    async transfer(token: Token, to: string, amount: bigint): Promise<ActionResult> {
        let tokenContract = new Contract(token.abi, token.address, this.starkProvider)
        let transferCallData = tokenContract.populate('transfer', [to, uint256.bnToUint256(amount)])
        let multicall
        try {
            multicall = await this.starknetAccount.execute([transferCallData])
            let pasta = `✅ transferred ${NumbersHelpers.bigIntToPrettyFloatStr(amount, token.decimals)} ${
                token.name
            } from ${this.starknetAddress} to OKX: ${to}`
            log(pasta)
            log(`[ ${this.starknetAddress} ]`)
            log(c.green(starknet.explorer.tx + multicall.transaction_hash))
            return await this.retryGetTxStatus(multicall.transaction_hash, pasta)
        } catch (e: any) {
            let msg: any = e.message?.split('Error in the called contract')
            log(c.red(`error on transfer`), msg[msg.length - 1])
            log(c.red(`[ ${this.starknetAddress} ]`))
            return { success: false, statusCode: 0, transactionHash: `❌failed to transfer to OKX` }
        }
    }
    /**
     * @param token
     * @param to
     * @param count
     * @param amount
     * @returns
     */
    async splitTransfer(token: Token, to: string, count: bigint, amount: bigint): Promise<ActionResult[]> {
        // randomize parts
        let sum: bigint = 0n
        let parts: bigint[] = []
        for (let i = 0; i < count; i++) {
            let val = RandomHelpers.getRandomBnFromTo(30n, 100n)
            parts.push(val)
            sum += val
        }
        let results: ActionResult[] = []
        let tokenContract = new Contract(token.abi, token.address, this.starkProvider)
        let multicall
        for (let i = 0; i < parts.length; i++) {
            try {
                // estimate send fee
                let transferCallData = tokenContract.populate('transfer', [
                    to,
                    uint256.bnToUint256((amount * parts[i]) / sum)
                ])
                let avgFee: EstimateFee = await this.starknetAccount.estimateInvokeFee(transferCallData)
                // substract send fee
                transferCallData = tokenContract.populate('transfer', [
                    to,
                    uint256.bnToUint256((amount * parts[i]) / sum - (avgFee.overall_fee * 12n) / 10n)
                ])
                multicall = await this.starknetAccount.execute([transferCallData])
                let pasta = `[${NumbersHelpers.bigIntToPrettyFloatStr(
                    (parts[i] * 100n) / sum,
                    0n
                )}%]\n✅ transferred ${NumbersHelpers.bigIntToPrettyFloatStr(
                    (amount * parts[i]) / sum - (avgFee.overall_fee * 12n) / 10n,
                    token.decimals
                )} ${token.name} from ${this.starknetAddress} to OKX: ${to}`
                log(pasta)
                log(`[ ${this.starknetAddress} ]`)
                let telegramPasta = `✅ transferred ${NumbersHelpers.bigIntToPrettyFloatStr(
                    (amount * parts[i]) / sum - (avgFee.overall_fee * 12n) / 10n,
                    token.decimals
                )} ${token.name} to OKX`
                log(c.green(starknet.explorer.tx + multicall.transaction_hash))
                results.push(await this.retryGetTxStatus(multicall.transaction_hash, telegramPasta))
            } catch (e: any) {
                log(e)
                let msg: any = e.message?.split('Error in the called contract')
                log(c.red(`error on transfer`), msg[msg.length - 1])
                log(c.red(`[ ${this.starknetAddress} ]`))
                results.push({ success: false, statusCode: 0, transactionHash: `❌failed to transfer to OKX` })
            }
            await sleep(RandomHelpers.getRandomIntFromTo(action_sleep_interval[0], action_sleep_interval[1]))
        }
        return results
    }
    /**
     * retriable getBalance
     * @param token
     * @returns
     */
    async getBalance(token: Token): Promise<ReadResponse> {
        let balance: bigint
        try {
            let tokenContract: Contract = new Contract(erc20_abi, token.address, this.starkProvider)
            balance = (await retry(tokenContract.balanceOf, {}, this.starknetAddress)).balance.low
            // log(this.starknetAddress)
            return { success: true, statusCode: 1, result: balance }
        } catch (e) {
            console.log(e)
            return { success: false, statusCode: 0, result: 0n }
        }
    }
    /**
     * not retried getAmountsOut
     * @param dex
     * @param amm
     * @param tokenIn
     * @param tokenOut
     * @param amountIn
     * @returns
     */
    async getAmountsOut(
        dex: Contract,
        amm: Amm,
        tokenIn: Token,
        tokenOut: Token,
        amountIn: bigint
    ): Promise<ReadResponse> {
        try {
            const res: any = await dex.call(amm.entryPoints['getAmountsOut'].name, [
                uint256.bnToUint256(amountIn),
                [tokenIn.address, tokenOut.address]
            ])
            const amountOut = res.amounts[1].low
            return { success: true, statusCode: 1, result: amountOut }
        } catch (e: any) {
            console.log(e)
            return { success: false, statusCode: 0, result: 0n }
        }
    }
    /**
     * not retried swapDex
     * @param amm
     * @param tokenIn
     * @param tokenOut
     * @param amountIn
     * @param slippage
     * @returns
     */
    async swapDex(
        amm: Amm,
        tokenIn: Token,
        tokenOut: Token,
        amountIn: bigint,
        slippage: bigint
    ): Promise<ActionResult> {
        slippage = RandomHelpers.getRandomBnFromTo(10n, 30n)
        try {
            const dex = new Contract(amm.abi, amm.address, this.starkProvider)
            const token = new Contract(tokenIn.abi, tokenIn.address, this.starkProvider)
            let amountOut: ReadResponse = await retry(
                this.getAmountsOut.bind(this),
                { maxRetries: 10 },
                dex,
                amm,
                tokenIn,
                tokenOut,
                amountIn
            )
            if (!amountOut.success) {
                return { success: amountOut.success, statusCode: 0, transactionHash: '' }
            }
            amountOut.result = amountOut.result - (amountOut.result * slippage) / 1000n
            const approveCallData: Call = token.populate('approve', [amm.address, uint256.bnToUint256(amountIn)])
            const swapCallData: Call = dex.populate(amm.entryPoints['swapTokensForTokens'].name, [
                uint256.bnToUint256(amountIn),
                uint256.bnToUint256(amountOut.result),
                [tokenIn.address, tokenOut.address],
                this.starknetAddress,
                RandomHelpers.getRandomDeadline()
            ])
            const multicall = await this.starknetAccount.execute([approveCallData, swapCallData])
            let pasta = `✅ swapped ${NumbersHelpers.bigIntToPrettyFloatStr(amountIn, tokenIn.decimals)} ${
                tokenIn.name
            } for ${NumbersHelpers.bigIntToPrettyFloatStr(amountOut.result, tokenOut.decimals)} ${tokenOut.name} on ${
                amm.name
            }`

            log(pasta)
            log(`[ ${this.starknetAddress} ]`)
            log(c.green(starknet.explorer.tx + multicall.transaction_hash))
            return await this.retryGetTxStatus(multicall.transaction_hash, pasta)
        } catch (e: any) {
            let msg: any = e.message?.split('Error in the called contract')
            log(c.red(`error on ${amm.name}`), msg[msg.length - 1])
            log(c.red(`[ ${this.starknetAddress} ]`))
            return { success: false, statusCode: 0, transactionHash: `❌failed to swap on ${amm.name}` }
        }
    }
    /**
     * not retried addLp
     * @param amm
     * @param tokenA
     * @param tokenB
     * @param amountA
     * @param amountB
     * @returns
     */
    async addLp(amm: Amm, tokenA: Token, tokenB: Token, amountA: bigint, amountB: bigint): Promise<ActionResult> {
        try {
            const dex = new Contract(amm.abi, amm.address, this.starkProvider)
            const tokenIn = new Contract(tokenA.abi, tokenA.address, this.starkProvider)
            const tokenOut = new Contract(tokenB.abi, tokenB.address, this.starkProvider)
            const amountAMin = (amountA * RandomHelpers.getRandomBnFromTo(900n, 950n)) / 1000n
            const amountBMin = (amountB * RandomHelpers.getRandomBnFromTo(900n, 950n)) / 1000n
            // build tx
            const approveCallDataA: Call = tokenIn.populate('approve', [amm.address, uint256.bnToUint256(amountA)])
            const approveCallDataB: Call = tokenOut.populate('approve', [amm.address, uint256.bnToUint256(amountB)])
            const addLpCallData: Call = dex.populate(amm.entryPoints['addLiquidity'].name, [
                tokenA.address,
                tokenB.address,
                uint256.bnToUint256(amountA), // amountA
                uint256.bnToUint256(amountB), // amountB
                uint256.bnToUint256(amountAMin), // amountA slippage
                uint256.bnToUint256(amountBMin), // amountB slippage
                this.starknetAddress, // to
                RandomHelpers.getRandomDeadline()
            ])
            const multicall = await this.starknetAccount.execute([approveCallDataA, approveCallDataB, addLpCallData])
            let pasta = `✅ added LP ${NumbersHelpers.bigIntToPrettyFloatStr(amountA, tokenA.decimals)} ${
                tokenA.name
            } | ${NumbersHelpers.bigIntToPrettyFloatStr(amountB, tokenB.decimals)} ${tokenB.name} to ${amm.name}`

            log(pasta)
            log(`[ ${this.starknetAddress} ]`)
            log(c.green(starknet.explorer.tx + multicall.transaction_hash))
            return await this.retryGetTxStatus(multicall.transaction_hash, pasta)
        } catch (e: any) {
            let msg: any = e.message?.split('Error in the called contract')
            log(c.red(`error on ${amm.name}`), msg[msg.length - 1])
            log(c.red(`[ ${this.starknetAddress} ]`))
            return { success: false, statusCode: 0, transactionHash: `❌failed to add lp on ${amm.name}` }
        }
    }
    getLpTokenByComponents(amm: Amm, tokenA: Token, tokenB: Token): LpToken {
        return amm.lpTokens[(tokenA.name + tokenB.name) as keyof typeof amm.lpTokens]
    }
    /**
     * not retried removeLp
     * @param amm
     * @param lpToken
     * @param amount
     * @returns
     */
    async removeLp(amm: Amm, lpToken: LpToken, amount: bigint): Promise<ActionResult> {
        let multicall
        try {
            const dex = new Contract(amm.abi, amm.address, this.starkProvider)
            const token = new Contract(lpToken.token.abi, lpToken.token.address, this.starkProvider)
            // get tokenA and tokenB amounts to remove
            let amounts: ReadResponse = await retry(this.getRemoveLpAmounts.bind(this), {}, token, lpToken, amount)
            // build and send tx
            const approveCallData: Call = token.populate('approve', [amm.address, uint256.bnToUint256(amount)])
            try {
                const removeLpCallData: Call = dex.populate(amm.entryPoints['removeLiquidity'].name, [
                    lpToken.components.tokenA.address,
                    lpToken.components.tokenB.address,
                    uint256.bnToUint256(amount), // LP amount
                    uint256.bnToUint256(amounts.result[0]), // amountA slippage
                    uint256.bnToUint256(amounts.result[1]), // amountB slippage
                    this.starknetAddress, // to
                    RandomHelpers.getRandomDeadline()
                ])
                multicall = await this.starknetAccount.execute([approveCallData, removeLpCallData])
                // flip tokenA and tokenB
            } catch (e) {
                const removeLpCallData: Call = dex.populate(amm.entryPoints['removeLiquidity'].name, [
                    lpToken.components.tokenB.address,
                    lpToken.components.tokenA.address,
                    uint256.bnToUint256(amount), // LP amount
                    uint256.bnToUint256(amounts.result[0]), // amountA slippage
                    uint256.bnToUint256(amounts.result[1]), // amountB slippage
                    this.starknetAddress, // to
                    RandomHelpers.getRandomDeadline()
                ])
                multicall = await this.starknetAccount.execute([approveCallData, removeLpCallData])
            }
            let pasta = `✅ removed ${lpToken.token.name} from ${
                amm.name
            }, got \n${NumbersHelpers.bigIntToPrettyFloatStr(amounts.result[0], lpToken.components.tokenA.decimals)} ${
                lpToken.components.tokenA.name
            } and ${NumbersHelpers.bigIntToPrettyFloatStr(amounts.result[1], lpToken.components.tokenB.decimals)} ${
                lpToken.components.tokenB.name
            }`

            log(pasta)
            log(`[ ${this.starknetAddress} ]`)
            log(c.green(starknet.explorer.tx + multicall.transaction_hash))
            return this.retryGetTxStatus(multicall.transaction_hash, pasta)
        } catch (e: any) {
            let msg: any = e.message?.split('Error in the called contract')
            log(msg)
            log(c.red(`error on ${amm.name} remove LP`))
            log(c.red(`[ ${this.starknetAddress} ]`))
            return { success: false, statusCode: 0, transactionHash: `❌failed to remove lp on ${amm.name}` }
        }
    }
    /**
     * not retried swapAvnu
     * @param tokenIn
     * @param tokenOut
     * @param amountIn
     * @returns
     */
    async swapAvnu(tokenIn: Token, tokenOut: Token, amountIn: bigint): Promise<ActionResult> {
        let amountInHex: string = '0x' + amountIn.toString(16)
        let reqId: string
        let buyAmount: string
        try {
            let req: any = await axios.get(
                `https://starknet.api.avnu.fi/swap/v1/quotes?sellTokenAddress=${tokenIn.address}&buyTokenAddress=${tokenOut.address}&sellAmount=${amountInHex}&size=1&integratorName=AVNU%20Portal`
            )
            reqId = req.data[0].quoteId
            buyAmount = req.data[0].buyAmount
        } catch (e) {
            // log(e)
            await sleep(30)
            return { success: false, statusCode: 0, transactionHash: '/quotes request failed' }
        }
        await sleep(30)
        let call: any
        try {
            let req: any = await axios.post('https://starknet.api.avnu.fi/swap/v1/build', {
                quoteId: reqId,
                takerAddress: this.starknetAddress,
                slippage: 0.5
            })
            call = {
                contractAddress: req.data.contractAddress,
                entrypoint: req.data.entrypoint,
                calldata: req.data.calldata
            }
        } catch (e) {
            // log(e)
            await sleep(30)
            return { success: false, statusCode: 0, transactionHash: '/build request failed' }
        }
        await sleep(30)
        const token = new Contract(tokenIn.abi, tokenIn.address, this.starkProvider)
        const approveCallData: Call = token.populate('approve', [call.contractAddress, uint256.bnToUint256(amountIn)])
        try {
            const multicall: any = await this.starknetAccount.execute([approveCallData, call])
            let pasta = `✅ swapped on AVNU ${NumbersHelpers.bigIntToPrettyFloatStr(amountIn, tokenIn.decimals)} ${
                tokenIn.name
            } for ${NumbersHelpers.bigIntToPrettyFloatStr(BigInt(buyAmount), tokenOut.decimals)} ${tokenOut.name}`
            log(pasta)
            log(`[ ${this.starknetAddress} ]`)
            log(c.green(starknet.explorer.tx + multicall.transaction_hash))
            return await this.retryGetTxStatus(multicall.transaction_hash, pasta)
        } catch (e) {
            log(e)
            return { success: false, statusCode: 0, transactionHash: '❌send avnu tx failed' }
        }
    }
    /**
     * retriable mint starknet id function
     * @returns
     */
    async mintStarknetId(): Promise<ActionResult> {
        // let randomId = RandomHelpers.getRandomInt(1000000000000)
        const starknetIdContract: Contract = new Contract(starknetId.abi, starknetId.address, this.starkProvider)
        const mintResult = async () => {
            try {
                const mint: Call = starknetIdContract.populate('mint', [RandomHelpers.getRandomInt(1000000000000)])
                const multicall: any = await this.starknetAccount.execute([mint])
                log(c.green(starknet.explorer.tx + multicall.transaction_hash))
                let txPassed = await this.retryGetTxStatus(multicall.transaction_hash, '')
                if (!txPassed.success) {
                    log('❌ starknet id mint tx rejected')
                    return { success: false, statusCode: 0, transactionHash: '❌ starknet id mint tx rejected' }
                }
                return { success: true, statusCode: 1, transactionHash: '✅ starknet id mint successfully' }
            } catch (e) {
                log(e)
                return { success: false, statusCode: 0, transactionHash: '❌ starknet id mint failed' }
            }
        }
        // let tx = await mintResult()
        return await retry(mintResult, { maxRetries: 30, retryInterval: 10 })
    }
    async mintStarkverseGenesisNft(): Promise<ActionResult> {
        const starkverseContract: Contract = new Contract(starkverse.abi, starkverse.address, this.starkProvider)
        const mintResult = async () => {
            try {
                const mint: Call = starkverseContract.populate('publicMint', [this.starknetAddress])
                const multicall: any = await this.starknetAccount.execute([mint])
                log(c.green(starknet.explorer.tx + multicall.transaction_hash))
                let txPassed = await this.retryGetTxStatus(multicall.transaction_hash, '')
                if (!txPassed.success) {
                    log('❌ starkverse mint tx rejected')
                    return { success: false, statusCode: 0, transactionHash: '❌ starkverse mint tx rejected' }
                }
                return { success: true, statusCode: 1, transactionHash: '✅ starkverse mint successfully' }
            } catch (e) {
                log(e)
                return { success: false, statusCode: 0, transactionHash: '❌ starkverse mint failed' }
            }
        }
        return await retry(mintResult, {})
    }
    async sendDmail(): Promise<ActionResult> {
        const dmailContract: Contract = new Contract(dmail.abi, dmail.address, this.starkProvider)
        const mintResult = async () => {
            try {
                const mint: Call = dmailContract.populate('transaction', [
                    keccak256(ethers.toBeArray(RandomHelpers.getRandomBnFromTo(1000n, 10000000000n))).substring(0, 65),
                    keccak256(ethers.toBeArray(RandomHelpers.getRandomBnFromTo(1000n, 10000000000n))).substring(0, 65)
                ])
                const multicall: any = await this.starknetAccount.execute([mint])
                log(c.green(starknet.explorer.tx + multicall.transaction_hash))
                let txPassed = await this.retryGetTxStatus(multicall.transaction_hash, '')
                if (!txPassed.success) {
                    log('❌ dmail send tx rejected')
                    return { success: false, statusCode: 0, transactionHash: '❌ dmail send tx rejected' }
                }
                return { success: true, statusCode: 1, transactionHash: '✅ dmail sent successfully' }
            } catch (e) {
                // log(e)
                return { success: false, statusCode: 0, transactionHash: '❌ dmail send failed' }
            }
        }
        return await retry(mintResult, {maxRetries:30, retryInterval: 1})
    }
    /**
     * retriable
     * increase allowance to Unframed
     * @returns
     */
    async approve(): Promise<ActionResult> {
        const tokenContract: Contract = new Contract(starkTokens.ETH.abi, starkTokens.ETH.address, this.starkProvider)
        const mintResult = async () => {
            try {
                const approveTx: Call = tokenContract.populate('increaseAllowance', [
                    unframed.address,
                    uint256.bnToUint256(RandomHelpers.getRandomValue('0.00000001', '0.00001'))
                ])
                const multicall: any = await this.starknetAccount.execute([approveTx])
                log(c.green(starknet.explorer.tx + multicall.transaction_hash))
                let txPassed = await this.retryGetTxStatus(multicall.transaction_hash, '')
                if (!txPassed.success) {
                    log('❌ increase allowance tx rejected')
                    return { success: false, statusCode: 0, transactionHash: '❌ increase allowance tx rejected' }
                }
                return { success: true, statusCode: 1, transactionHash: '✅ increased allowance successfully' }
            } catch (e) {
                log(e)
                return { success: false, statusCode: 0, transactionHash: '❌ increase allowance failed' }
            }
        }
        return await retry(mintResult, {})
    }
    /**
     * retriable
     * cancel random generated order id
     * @returns
     */
    async cancelOrder(): Promise<ActionResult> {
        const unframedContract: Contract = new Contract(unframed.abi, unframed.address, this.starkProvider)
        const cancelResult = async () => {
            try {
                const cancelTx: Call = unframedContract.populate('cancel_orders', [[stark.randomAddress()]])
                const multicall: any = await this.starknetAccount.execute([cancelTx])
                log(c.green(starknet.explorer.tx + multicall.transaction_hash))
                let txPassed = await this.retryGetTxStatus(multicall.transaction_hash, '')
                if (!txPassed.success) {
                    log('❌ cancel order tx rejected')
                    return { success: false, statusCode: 0, transactionHash: '❌ cancel order tx rejected' }
                }
                return { success: true, statusCode: 1, transactionHash: '✅ canceled order successfully' }
            } catch (e) {
                log(e)
                return { success: false, statusCode: 0, transactionHash: '❌ cancel order failed' }
            }
        }
        return await retry(cancelResult, {})
    }
    /**
     * retriable
     * is token registered on zkLend
     * @param token
     * @returns
     */
    async isRegisteredZkLend(token: Token): Promise<ReadResponse> {
        const zklendContract: Contract = new Contract(zkLend.abi, zkLend.address, this.starkProvider)
        const isRegisteredResult = async () => {
            let readRes: any
            try {
                readRes = await zklendContract.call('is_collateral_enabled', [this.starknetAddress, token.address])
                // log(readRes)
                return { success: true, statusCode: 1, result: readRes.enabled }
            } catch (e) {
                log(e)
                return { success: false, statusCode: 0, result: 0n }
            }
        }
        return await retry(isRegisteredResult, {})
    }
    /**
     * retriable
     * enable collateral for <Token> at zkLend
     * @returns
     */
    async registerZkLend(token: Token): Promise<ActionResult> {
        const zklendContract: Contract = new Contract(zkLend.abi, zkLend.address, this.starkProvider)
        const registerResult = async () => {
            try {
                const registerTx: Call = zklendContract.populate('enable_collateral', [token.address])
                const multicall: any = await this.starknetAccount.execute([registerTx])
                log(c.green(starknet.explorer.tx + multicall.transaction_hash))
                let txPassed = await this.retryGetTxStatus(multicall.transaction_hash, '')
                if (!txPassed.success) {
                    log(`❌ enable ${token.name} at zkLend tx rejected`)
                    return {
                        success: false,
                        statusCode: 0,
                        transactionHash: `❌ enable ${token.name} at zkLend tx rejected`
                    }
                }
                return {
                    success: true,
                    statusCode: 1,
                    transactionHash: `✅ enabled ${token.name} at zkLend successfully`
                }
            } catch (e) {
                log(e)
                return { success: false, statusCode: 0, transactionHash: `❌ enable ${token.name} at zkLend failed` }
            }
        }
        return await retry(registerResult, {})
    }
    /**
     * retriable
     * disable collateral for <Token> at zkLend
     * @returns
     */
    async unregisterZkLend(token: Token): Promise<ActionResult> {
        const zklendContract: Contract = new Contract(zkLend.abi, zkLend.address, this.starkProvider)
        const registerResult = async () => {
            try {
                const unregisterTx: Call = zklendContract.populate('disable_collateral', [token.address])
                const multicall: any = await this.starknetAccount.execute([unregisterTx])
                log(c.green(starknet.explorer.tx + multicall.transaction_hash))
                let txPassed = await this.retryGetTxStatus(multicall.transaction_hash, '')
                if (!txPassed.success) {
                    log(`❌ disable ${token.name} at zkLend tx rejected`)
                    return {
                        success: false,
                        statusCode: 0,
                        transactionHash: `❌ disable ${token.name} at zkLend tx rejected`
                    }
                }
                return {
                    success: true,
                    statusCode: 1,
                    transactionHash: `✅ disabled ${token.name} at zkLend successfully`
                }
            } catch (e) {
                log(e)
                return { success: false, statusCode: 0, transactionHash: `❌ disable ${token.name} at zkLend failed` }
            }
        }
        return await retry(registerResult, {})
    }
    /**
     * retried getTxStatus
     * @param hash
     * @param pasta
     * @returns
     */
    async retryGetTxStatus(hash: string, pasta: string): Promise<ActionResult> {
        return await retry(getTxStatus, { maxRetries: 10 }, this.starkProvider, hash, pasta)
    }
    /**
     * not retried getRemoveLpAmounts
     * @param token
     * @param lpToken
     * @param amount
     * @returns
     */
    private async getRemoveLpAmounts(token: Contract, lpToken: LpToken, amount: bigint): Promise<ReadResponse> {
        let totalSupply: any
        let reserves: any
        try {
            totalSupply = await token.call(lpToken.entryPoints['totalSupply'].name, [])
            reserves = await token.call(lpToken.entryPoints['getReserves'].name, [])
            let reserve0: bigint
            let reserve1: bigint
            reserves.reserve0?.low ? (reserve0 = reserves.reserve0?.low) : (reserve0 = reserves.reserve0)
            reserves.reserve1?.low ? (reserve1 = reserves.reserve1?.low) : (reserve1 = reserves.reserve1)
            const amountAMin: bigint =
                (((amount * reserve0) / totalSupply.totalSupply.low) * RandomHelpers.getRandomBnFromTo(980n, 995n)) /
                1000n
            const amountBMin: bigint =
                (((amount * reserve1) / totalSupply.totalSupply.low) * RandomHelpers.getRandomBnFromTo(980n, 995n)) /
                1000n
            return { success: true, statusCode: 1, result: [amountAMin, amountBMin] }
        } catch (e) {
            log(e)
            return { success: false, statusCode: 0, result: [0n, 0n] }
        }
    }
    async parseBalances(tokens: { [key: string]: Token }, amms: { [key: string]: Amm }): Promise<ReadResponse> {
        // get starkTokens balances
        for (let token of Object.keys(tokens)) {
            if ((await this.getBalance(tokens[token])).result > 0n) {
                this.nonZeroTokens.push(tokens[token])
                log(`nonZero token: ${token}`)
            }
        }
        // get kpTokens balances
        for (let ammStruct of Object.keys(amms)) {
            for (let lpToken of Object.entries(amms[ammStruct].lpTokens)) {
                if ((await this.getBalance(lpToken[1].token)).result > 0n) {
                    this.nonZeloLps.push(lpToken[1])
                    log(`nonZero lpToken: ${lpToken[1].token.name}`)
                }
            }
        }
        return { success: true, statusCode: 1, result: '' }
    }
    async checkGas() {
        while (true) {
            try {
                log(await this.starkProvider.getBlock())
                // let currentGwei = (await gweiEthProvider.getFeeData()).gasPrice
                // if (currentGwei == null || currentGwei > NumbersHelpers.floatStringToBigInt(good_gwei.toString(), 9n)) {
                //     await sleep(60, 'wait gas')
                // } else {
                //     return
                // }
            } catch (e) {
                log(e)
            }
        }
    }
}
// check gas decorator
async function checkGas() {
    while (true) {
        try {
            let currentGwei = (await gweiEthProvider.getFeeData()).gasPrice
            if (currentGwei == null || currentGwei > NumbersHelpers.floatStringToBigInt(good_gwei.toString(), 9n)) {
                await sleep(60, 'wait gas')
            } else {
                return
            }
        } catch (e) {
            log(e)
        }
    }
}

export { StarknetWallet, checkGas }
