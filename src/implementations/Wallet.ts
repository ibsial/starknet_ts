import { ethereum, starknet } from '../data/networks'
import { starknet_bridge_abi } from '../abi/starknet_bridge'
import { eth_bridge, good_gwei } from '../../config'
import { RandomHelpers, NumbersHelpers, sleep, log, c, retry, getTxStatus, gweiEthProvider } from './helpers'
import { erc20_abi } from '../abi/erc20'
import { ActionResult, Token, Amm, ReadResponse, LpToken } from '../interfaces/Types'
import { Wallet, JsonRpcProvider, HDNodeWallet, formatEther, ethers } from 'ethers'
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
    provider
} from 'starknet'
import axios from 'axios'

class StarknetWallet {
    // init Account here
    mnemonic: string
    ethProvider: JsonRpcProvider
    ethSigner: Wallet

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
        this.ethProvider = new JsonRpcProvider(ethereum.url, 1)
        this.mnemonic = mnemonic
        this.ethSigner = new Wallet(evmPrivateKey, this.ethProvider)
        this.starknetKey = groundKey
        this.starknetAddress = getChecksumAddress(addr)
        this.starknetAccount = new Account(this.starkProvider, addr, groundKey)
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
            log('send eth to starknet cost:', formatEther(estimate * price), 'ETH')
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
            let amount = BigInt(balance - (estimate * price * 125n) / 100n) - amountToLeave

            tx = await bridge.deposit(amount, this.starknetAddress, {
                value: BigInt(res.overall_fee) + amount,
                gasPrice: price,
                gasLimit: (estimate * 13n) / 10n
            })
            // log(tx)
            log(`sent ${formatEther(amount)} ETH from ${this.ethSigner.address} to ${this.starknetAddress}`)
            log(`[ ${this.starknetAddress} ]`)
            log(c.green(ethereum.explorer.tx + tx.hash))
            return {
                success: true,
                statusCode: 1,
                transactionHash: `✔️ sent ${formatEther(amount)} ETH from ${this.ethSigner.address} to ${
                    this.starknetAddress
                }`
            }
        } catch (e: any) {
            log(e)
            // log(c.red('error', e))
            log(c.red('error', e.code))
            if (e.code == 'INSUFFICIENT_FUNDS') {
                return {
                    success: false,
                    statusCode: -1,
                    transactionHash: '❌ INSUFFICIENT_FUNDS'
                }
            } else {
                return {
                    success: false,
                    statusCode: 0,
                    transactionHash: '❌ bridge failed'
                }
            }
        }
    }
    async isAccountDeployed(): Promise<ReadResponse> {
        try {
            let nonce: string = await this.starkProvider.getNonceForAddress(this.starknetAddress)
            if (nonce != '0x0') {
                return { success: true, statusCode: 1, result: true }
            } else {
                return { success: true, statusCode: 1, result: false }
            }
        } catch (e) {
            return { success: false, statusCode: 0, result: false }
        }
    }
    /**
     * not retried checkAndDeployWallet
     * взято с https://www.starknetjs.com/docs/guides/create_account
     * @returns 
     */
    
    async checkAndDeployWallet(): Promise<ActionResult> {
        let deployed: ReadResponse = await retry(this.isAccountDeployed.bind(this), { maxRetries: 10, retryInterval: 5 })
        if (deployed.success && deployed.result) {
            return { success: true, statusCode: 1, transactionHash: `${this.starknetAddress} already deployed` }
        }
        let pubKey = ec.starkCurve.getStarkKey(this.starknetKey)
        let AXproxyConstructorCallData = CallData.compile({
            implementation: this.accountClassHash,
            selector: hash.getSelectorFromName('initialize'),
            calldata: CallData.compile({ signer: pubKey, guardian: '0' })
        })
        const AXcontractAddress = hash.calculateContractAddressFromHash(
            pubKey,
            this.argentProxyClassHash,
            AXproxyConstructorCallData,
            0
        )
        const deployAccountPayload = {
            classHash: this.argentProxyClassHash,
            constructorCalldata: AXproxyConstructorCallData,
            contractAddress: AXcontractAddress,
            addressSalt: pubKey
        }
        try {
            const tx = await this.starknetAccount.deployAccount(deployAccountPayload)
            log(tx)
            return { success: true, statusCode: 1, transactionHash: `✔️ deployed ${this.starknetAddress}` }
        } catch (e: any) {
            log(e)
            return { success: false, statusCode: 0, transactionHash: `❌ failed to deploy ${this.starknetAddress}`  }
        }
    }
    async transfer(token: Token, to: string, amount: bigint): Promise<ActionResult> {
        let tokenContract = new Contract(token.abi, token.address, this.starkProvider)
        let transferCallData = tokenContract.populate('transfer', [to, uint256.bnToUint256(amount)])
        let multicall
        try {
        multicall = await this.starknetAccount.execute([transferCallData])
        let pasta = `✔️ transferred ${NumbersHelpers.bigIntToFloatStr(amount, token.decimals)} ${token.name} from ${this.starknetAccount} to OKX: ${to}`
        log(pasta)
        log(`[ ${this.starknetAddress} ]`)
        log(c.green(starknet.explorer.tx + multicall.transaction_hash))
        return await this.retryGetTxStatus(multicall.transaction_hash, pasta)
        }catch (e: any) {
            let msg: any = e.message?.split('Error in the called contract')
            log(c.red(`error on transfer`), msg[msg.length - 1])
            log(c.red(`[ ${this.starknetAddress} ]`))
            return { success: false, statusCode: 0, transactionHash: `❌failed to transfer to OKX` }
        }
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
        try {
            const approveCallData: Call = token.populate('approve', [amm.address, uint256.bnToUint256(amountIn)])
            const swapCallData: Call = dex.populate(amm.entryPoints['swapTokensForTokens'].name, [
                uint256.bnToUint256(amountIn),
                uint256.bnToUint256(amountOut.result),
                [tokenIn.address, tokenOut.address],
                this.starknetAddress,
                RandomHelpers.getRandomDeadline()
            ])
            const multicall = await this.starknetAccount.execute([approveCallData, swapCallData])
            let pasta = `✔️ swapped ${NumbersHelpers.bigIntToFloatStr(amountIn, tokenIn.decimals)} ${
                tokenIn.name
            } for ${NumbersHelpers.bigIntToFloatStr(amountOut.result, tokenOut.decimals)} ${tokenOut.name}`

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
            let pasta = `✔️ added LP ${NumbersHelpers.bigIntToFloatStr(amountA, tokenA.decimals)} ${
                tokenA.name
            } | ${NumbersHelpers.bigIntToFloatStr(amountB, tokenB.decimals)} ${tokenB.name} to ${amm.name}`

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
        return amm.lpTokens[tokenA.name+tokenB.name as keyof typeof amm.lpTokens]
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
            let amounts: ReadResponse = await retry(this.getRemoveLpAmounts.bind(this), {} ,token, lpToken, amount)
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
         } catch(e) {
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
            let pasta = `✔️ removed ${lpToken.token.name} from ${amm.name}, got \n${NumbersHelpers.bigIntToFloatStr(
                amounts.result[0],
                lpToken.components.tokenA.decimals
            )} ${lpToken.components.tokenA.name} and ${NumbersHelpers.bigIntToFloatStr(
                amounts.result[1],
                lpToken.components.tokenB.decimals
            )} ${lpToken.components.tokenB.name}`

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
            log(e)
            return { success: false, statusCode: 0, transactionHash: '/quotes request failed' }
        }
        let call: any
        try {
            let req: any = await axios.post('https://starknet.api.avnu.fi/swap/v1/build', {
                quoteId: reqId,
                takerAddress: this.starknetAddress,
                slippage: 0.1
            })
            call = {
                contractAddress: req.data.contractAddress,
                entrypoint: req.data.entrypoint,
                calldata: req.data.calldata
            }
        } catch (e) {
            log(e)
            return { success: false, statusCode: 0, transactionHash: '/build request failed' }
        }
        const token = new Contract(tokenIn.abi, tokenIn.address, this.starkProvider)
        const approveCallData: Call = token.populate('approve', [call.contractAddress, uint256.bnToUint256(amountIn)])
        try {
            const multicall: any = await this.starknetAccount.execute([approveCallData, call])
            let pasta = `✔️ swapped on AVNU ${NumbersHelpers.bigIntToFloatStr(amountIn, tokenIn.decimals)} ${
                tokenIn.name
            } for ${NumbersHelpers.bigIntToFloatStr(BigInt(buyAmount), tokenOut.decimals)} ${tokenOut.name}`
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
     * retried getTxStatus
     * @param hash 
     * @param pasta 
     * @returns 
     */
    async retryGetTxStatus(hash: string, pasta: string): Promise<ActionResult> {
            return await retry(getTxStatus, {maxRetries: 10}, this.starkProvider, hash, pasta)
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
