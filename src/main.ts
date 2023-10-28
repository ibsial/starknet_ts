import { amms, starkTokens } from './data/tokens'
import { progressTracker } from './implementations/ProgressTracker'
import {
    sleep,
    retry,
    Okex,
    log,
    c,
    RandomHelpers,
    timeout,
    NumbersHelpers,
    getTxStatus,
    gweiEthProvider,
    defaultSleep
} from './implementations/helpers'
import { assembleAndRandomizeData } from './fs_manipulations'
import { action_sleep_interval, circle_config, eth_bridge, okx_config, wallet_sleep_interval } from '../config'
import { Contract } from 'starknet'
import { ActionResult, ReadResponse, AccData, Token } from './interfaces/Types'
import { checkGas } from './implementations/Wallet'

async function executeRandomCheapModule(wallet: progressTracker) {
    let module = RandomHelpers.chooseKeyFromStruct(wallet.modulesCount, 'sum')
    if (wallet.modulesCount[module] <= 0) {
        return
    }
    await checkGas()
    log(`executing random module: ${module}`)
    let res
    switch (module) {
        case 'mintStarknetId':
            res = await wallet.mintStarknetId()

            wallet.modulesCount[module] -= 1
            wallet.updateProgress(res.transactionHash)
            break
        case 'mintStarkverseGenesisNft':
            res = await wallet.mintStarkverseGenesisNft()

            wallet.modulesCount[module] -= 1
            wallet.updateProgress(res.transactionHash)
            break
        case 'unframedBidNCancel':
            let res1 = await wallet.approve()

            await defaultSleep(RandomHelpers.getRandomIntFromTo(15, 30))
            let res2 = await wallet.cancelOrder()

            wallet.modulesCount[module] -= 1
            wallet.updateProgress(res1.transactionHash)
            wallet.updateProgress(res2.transactionHash)
            break
        case 'zkLendAllowOrDisable':
            let randTokenName: string = RandomHelpers.chooseKeyFromStruct(starkTokens)
            let randToken: Token = starkTokens[randTokenName]
            let isAllowed = await wallet.isRegisteredZkLend(randToken)
            if (isAllowed.result <= 0n) {
                res = await wallet.registerZkLend(randToken)
            } else {
                res = await wallet.unregisterZkLend(randToken)
            }

            wallet.modulesCount[module] -= 1
            wallet.updateProgress(res.transactionHash)
            break
        case 'sendDmail':
            res = await wallet.sendDmail()

            wallet.modulesCount[module] -= 1
            wallet.updateProgress(res.transactionHash)
            break
    }
    await defaultSleep(RandomHelpers.getRandomIntFromTo(action_sleep_interval[0], action_sleep_interval[1]))
}
async function executeRandomVolumeModule(wallet: progressTracker, index: number, fromTokenName: any): Promise<void> {
    if (wallet.volumeModulesCount.sum() > 0) {
        let module = RandomHelpers.chooseKeyFromStruct(wallet.volumeModulesCount, 'sum')
        while (wallet.volumeModulesCount[module] <= 0) {
            module = RandomHelpers.chooseKeyFromStruct(wallet.volumeModulesCount, 'sum')
        }
        await checkGas()
        log(`selected module: ${module}`)
        let res
        switch (module) {
            case 'dex':
                res = await dex_circle(wallet, index, fromTokenName)
                while (res == 0) {
                    log(c.red('dex circle failed, retrying'))
                    await defaultSleep(20)
                    res = await dex_circle(wallet, index, fromTokenName)
                }
                wallet.volumeModulesCount[module] -= 1
                break
            case 'zklend':
                res = await wallet.depositZklend()
                wallet.updateProgress(res.transactionHash)
                await defaultSleep(
                    RandomHelpers.getRandomIntFromTo(action_sleep_interval[0], action_sleep_interval[1]) / 2
                )
                res = await wallet.withdrawZklend()
                wallet.updateProgress(res.transactionHash)
                wallet.volumeModulesCount[module] -= 1
                break
            case 'nostra':
                res = await wallet.depositNostra()
                wallet.updateProgress(res.transactionHash)
                await defaultSleep(
                    RandomHelpers.getRandomIntFromTo(action_sleep_interval[0], action_sleep_interval[1]) / 2
                )
                res = await wallet.withdrawNostra()
                wallet.updateProgress(res.transactionHash)
                wallet.volumeModulesCount[module] -= 1
                break
            default:
                break
        }
        await defaultSleep(RandomHelpers.getRandomIntFromTo(action_sleep_interval[0], action_sleep_interval[1]))
    }
}
async function dex_circle(wallet: progressTracker, index: number, fromTokenName: any): Promise<number> {
    let fromToken = starkTokens.ETH
    // choose dex: [jedi, 10k, avnu, myswap?]
    let ammName = RandomHelpers.chooseElementFromArray(circle_config.dex)
    let amm
    let dex: Contract
    if (ammName != 'avnu') {
        amm = amms[ammName as keyof typeof amms]
    } else {
        amm = amms['jediswap']
    }
    dex = new Contract(amm.abi, amm.address, wallet.starkProvider)
    // choose to token [USDC, USDT, DAI]
    let toTokenName = RandomHelpers.chooseElementFromArray(circle_config.tokens)
    let toToken = starkTokens[toTokenName as keyof typeof starkTokens]
    if (circle_config.tokens.length == 0) {
        log(c.red(`collision found`, c.bold(`can't have 0 tokens in cfg`)))
        wallet.updateProgress(`❌❌❌ *you cant have 0 tokens in config! Restart the script*`)
        await wallet.sendProgress()
        await sleep(timeout * 2)
        return 0
    }
    await checkGas()
    // get amountIn
    let amountIn: bigint = 100n
    let resp = await wallet.getBalance(starkTokens[fromTokenName as keyof typeof starkTokens])
    if (resp.success) {
        if (fromTokenName == 'ETH') {
            amountIn =
                (resp.result *
                    RandomHelpers.getRandomBnFromTo(circle_config.swap_percent[0], circle_config.swap_percent[1])) /
                100n
            amountIn = amountIn
        }
    } else {
        log(c.red(`[ ${index + 1} ] ${wallet.starknetAddress}`))
        await sleep(timeout, `something wrong with rpc`)
        return 0
    }
    //// get amountOut
    let amountOut: bigint = 1n
    let estimateResp: ReadResponse = await retry(
        wallet.getAmountsOut.bind(wallet),
        { maxRetries: 10, backoff: 1.5 },
        dex,
        amm,
        fromToken,
        toToken,
        amountIn!
    )
    if (estimateResp.success) {
        amountOut = estimateResp.result
    } else {
        log(c.red(`[ ${index + 1} ] ${wallet.starknetAddress}`))
        await sleep(timeout, `something wrong with rpc`)
        return 0
    }
    await checkGas()
    // perform swap
    let swapResp: ActionResult
    if (ammName == 'jediswap' || ammName == 'tenKSwap' || ammName == 'myswap') {
        swapResp = await retry(
            wallet.swapDex.bind(wallet),
            {},
            amm,
            fromToken,
            toToken,
            amountIn,
            RandomHelpers.getRandomBnFromTo(8n, 30n) // slippage from 1% to 3%
        )
    } else if (ammName == 'avnu') {
        swapResp = await retry(wallet.swapAvnu.bind(wallet), {}, fromToken, toToken, amountIn)
    }
    if (swapResp!.success) {
        // log(swapResp!)
        wallet.updateProgress(swapResp!.transactionHash)
        await sleep(RandomHelpers.getRandomIntFromTo(action_sleep_interval[0], action_sleep_interval[1]))
    } else {
        // log(c.red(`[ ${index} ] ${wallet.starknetAddress}`))
        // wallet.updateProgress(`*something really failed on ${index} ${wallet.starknetAddress}*`)
        // wallet.updateProgress(`*turn off the script and start again..*`)
        // await wallet.sendProgress()
        wallet.updateProgress(swapResp!.transactionHash)
        await sleep(timeout, `something wrong with rpc`)
        return -1
    }
    if (RandomHelpers.getRandomInt(3) == 2) {
        await executeRandomCheapModule(wallet)
    }
    resp = await wallet.getBalance(toToken)
    if (resp.success) {
        amountOut = resp.result
    } else {
        log(c.red(`[ ${index + 1} ] ${wallet.starknetAddress}`))
        await sleep(timeout, `something wrong with rpc`)
        return -1
    }
    // get correct amount of eth to add later
    let addLpResp: ActionResult
    estimateResp = await retry(
        wallet.getAmountsOut.bind(wallet),
        { maxRetries: 10, backoff: 1.5 },
        dex,
        amm,
        toToken,
        fromToken,
        amountOut!
    )
    if (estimateResp.success) {
        amountIn = estimateResp.result
    } else {
        log(c.red(`[ ${index + 1} ] ${wallet.starknetAddress}`))
        await sleep(timeout, `something wrong with rpc`)
        return -1
    }
    await checkGas()
    if (RandomHelpers.getRandomInt(3) == 2) {
        await executeRandomCheapModule(wallet)
    }
    addLpResp = await retry(wallet.addLp.bind(wallet), {}, amm, starkTokens.ETH, toToken, amountIn, amountOut)
    if (addLpResp.success) {
        // log(addLpResp)
        wallet.updateProgress(addLpResp!.transactionHash)
        await sleep(RandomHelpers.getRandomIntFromTo(action_sleep_interval[0], action_sleep_interval[1]))
    } else {
        log(c.red(`[ ${index + 1} ] ${wallet.starknetAddress}`))
        wallet.updateProgress(addLpResp!.transactionHash)
        await sleep(timeout, `something wrong with rpc`)
        return -1
    }
    await checkGas()
    if (RandomHelpers.getRandomInt(3) == 2) {
        await executeRandomCheapModule(wallet)
    }
    // remove lp
    let removeLpResp: ActionResult
    let lpToken = wallet.getLpTokenByComponents(amm, starkTokens.ETH, toToken)
    if (lpToken == undefined) {
        log(c.red(`selected not existing token pair: ${fromToken.name}|${toToken.name}`))
        log(`[ ${index + 1} ] ${wallet.starknetAddress}`)
        log(c.magenta(`tell about this to the author`))
        await sleep(timeout, `Bug encountered :(`)
        return -1
    }
    let lpTokenAmount = await wallet.getBalance(lpToken.token)
    // log(lpTokenAmount)
    // переделать?
    removeLpResp = await retry(wallet.removeLp.bind(wallet), {}, amm, lpToken, lpTokenAmount.result)
    if (removeLpResp.success) {
        // log(removeLpResp)
        wallet.updateProgress(removeLpResp!.transactionHash)
        await sleep(RandomHelpers.getRandomIntFromTo(action_sleep_interval[0], action_sleep_interval[1]))
    } else {
        log(c.red(`[ ${index + 1} ] ${wallet.starknetAddress}`))
        wallet.updateProgress(removeLpResp!.transactionHash)
        await sleep(timeout, `something wrong with rpc`)
        return -1
    }
    if (RandomHelpers.getRandomInt(3) == 2) {
        await executeRandomCheapModule(wallet)
    }
    // swap token for eth
    let tokenAmountIn: bigint
    let lastResp = await wallet.getBalance(toToken)
    if (lastResp.success) {
        tokenAmountIn = lastResp.result
    } else {
        log(c.red(`[ ${index + 1} ] ${wallet.starknetAddress}`))
        wallet.updateProgress(lastResp!.result)
        await sleep(timeout, `something wrong with rpc`)
        return -1
    }
    await checkGas()
    let lastSwapResp: ActionResult
    if (ammName == 'jediswap' || ammName == 'tenKSwap' || ammName == 'myswap') {
        lastSwapResp = await retry(
            wallet.swapDex.bind(wallet),
            {},
            amm,
            toToken,
            starkTokens.ETH,
            tokenAmountIn,
            RandomHelpers.getRandomBnFromTo(8n, 30n) // slippage from 1% to 3%
        )
    } else if (ammName == 'avnu') {
        lastSwapResp = await retry(wallet.swapAvnu.bind(wallet), {}, toToken, starkTokens.ETH, tokenAmountIn)
    }
    if (lastSwapResp!.success) {
        // log(lastSwapResp!)
        wallet.updateProgress(lastSwapResp!.transactionHash)
        await sleep(RandomHelpers.getRandomIntFromTo(action_sleep_interval[0], action_sleep_interval[1]))
    } else {
        log(c.red(`[ ${index + 1} ] ${wallet.starknetAddress}`))
        wallet.updateProgress(lastSwapResp!.transactionHash)
        await sleep(timeout, `something wrong with rpc`)
        return -1
    }
    if (RandomHelpers.getRandomInt(3) == 2) {
        await executeRandomCheapModule(wallet)
    }
    return 1
}
async function volumeCircle(walletTripples: any[]) {
    for (let [index, walletTripple] of walletTripples.entries()) {
        let exch = new Okex()
        let wallet = new progressTracker(walletTripple[0], walletTripple[1], walletTripple[2])
        wallet.updateProgress(`acc: [${index + 1} / ${walletTripples.length}] ${wallet.starknetAddress}`)
        // withdraw from OKX
        if (!(await wallet.init()).success) {
            wallet.updateProgress(
                `something went wrong with getting correct address for wallet: \n${walletTripple[0]}, ${walletTripple[2]}`
            )
            wallet.updateProgress(`this is undefined behavior, please restart the script and contact author`)
            await wallet.sendProgress()
            log(
                c.red(`something went wrong with getting correct address for wallet:`),
                `\n${walletTripple[0]}, ${walletTripple[2]}`
            )
            log(c.red(`this is undefined behavior, please restart the script and contact author`))
            throw 'Something went wrong with getting acc address'
        }
        await checkGas()
        if (okx_config.need_withdraw) {
            if (okx_config.network == 'eth') {
                try {
                    let randAmountFrom = NumbersHelpers.floatStringToBigInt(okx_config.amount_from, 18n)
                    let randAmountTo = NumbersHelpers.floatStringToBigInt(okx_config.amount_to, 18n)
                    let randAmount = RandomHelpers.getRandomBnFromTo(randAmountFrom, randAmountTo)
                    let toPrivate
                    if (walletTripple[1] == undefined) {
                        toPrivate = wallet.ethSigner.privateKey
                    } else {
                        toPrivate = walletTripple[1]
                    }
                    while (!(await exch.withdrawEth(randAmount, undefined, toPrivate))) {
                        wallet.updateProgress(
                            `acc: [${index + 1} / ${walletTripples.length}] ${
                                wallet.starknetAddress
                            } \nwithdraw from okx failed, check it`
                        )
                        await wallet.sendProgress()
                        await sleep(600, 'wait okx withdrawal')
                    }
                    while (!(await wallet.waitEvmBalance())) {
                        wallet.updateProgress(
                            `acc: [${index + 1} / ${walletTripples.length}] ${
                                wallet.starknetAddress
                            } \nfunds did not arrive to ETH`
                        )
                        await wallet.sendProgress()
                        log(
                            c.red(
                                `acc: [${index + 1} / ${walletTripples.length}] ${
                                    wallet.starknetAddress
                                } \nfunds did not arrive to ETH`
                            )
                        )
                        await sleep(600, 'wait ETH balance')
                    }
                } catch (e) {
                    log(e)
                    log('something prevented from withdrawing, check everything and start again, please')
                    wallet.updateProgress(
                        '*something prevented from withdrawing, check everything and start again, please*'
                    )
                    await wallet.sendProgress()
                    await sleep(timeout * 3, 'okx withdraw fail')
                    continue
                }
            } else {
                try {
                    let randAmountFrom = NumbersHelpers.floatStringToBigInt(okx_config.amount_from, 18n)
                    let randAmountTo = NumbersHelpers.floatStringToBigInt(okx_config.amount_to, 18n)
                    let randAmount = RandomHelpers.getRandomBnFromTo(randAmountFrom, randAmountTo)
                    console.log(wallet.starknetAddress)
                    while (!(await exch.withdrawStarknet(randAmount, wallet.starknetAddress))) {
                        wallet.updateProgress(`acc: ${wallet.starknetAddress} \nwithdraw from okx failed, check it`)
                        await wallet.sendProgress()
                        await sleep(600, 'wait okx withdrawal')
                    }
                    while (!(await wallet.waitBalance(starkTokens.ETH))) {
                        wallet.updateProgress(`acc: ${wallet.starknetAddress} \nfunds did not arrive to ETH`)
                        await wallet.sendProgress()
                        log(c.red(`acc: ${wallet.starknetAddress} \nfunds did not arrive to ETH`))
                        await sleep(600, 'wait ETH balance')
                    }
                } catch (e) {
                    log(e)
                    log('something prevented from withdrawing, check everything and start again, please')
                    wallet.updateProgress(
                        '*something prevented from withdrawing, check everything and start again, please*'
                    )
                    await wallet.sendProgress()
                    await sleep(timeout * 3, 'okx withdraw fail')
                }
            }
        }
        await checkGas()
        if (eth_bridge.need_bridge) {
            let bridgeRes = await retry(wallet.bridgeMainnet.bind(wallet), {})
            wallet.updateProgress(bridgeRes.transactionHash)
            while (!(await wallet.waitBalance(starkTokens.ETH))) {
                wallet.updateProgress(
                    `acc: [${index + 1} / ${walletTripples.length}] ${
                        wallet.starknetAddress
                    } \nfunds did not arrive to STARK`
                )
                await wallet.sendProgress()
                log(
                    c.red(
                        `acc: [${index + 1} / ${walletTripples.length}] ${
                            wallet.starknetAddress
                        } \nfunds did not arrive to STARK`
                    )
                )
                await sleep(600, 'wait ETH balance')
            }
        }
        await checkGas()
        // deploy
        let deployRes = await wallet.checkAndDeployWallet()
        if (!deployRes.success) {
            log(c.red('failed to deploy account'))
            wallet.updateProgress(deployRes.transactionHash + '\n*Moving to next wallet or restart script*')
            await wallet.sendProgress()
            await sleep(timeout * 3, 'fail on deploy')
            continue
        }
        wallet.updateProgress(deployRes.transactionHash)

        if (RandomHelpers.getRandomInt(6) == 2) {
            await executeRandomCheapModule(wallet)
        }
        // set random amount of circles
        // let circleAmount: number = RandomHelpers.getRandomIntFromTo(
        //     circle_config.circles_count[0],
        //     circle_config.circles_count[1]
        // )
        let circleAmount: number = wallet.volumeMaxModulesCount
        log(c.bold('circles to perform:'), c.magenta(circleAmount))
        let fromTokenName: string = 'ETH'
        // fromToken = starkTokens['ETH']
        ////////////////////
        for (let i = 0; i < circleAmount; i++) {
            wallet.updateProgress(`circle: [ ${i + 1} / ${circleAmount} ]`)
            await executeRandomVolumeModule(wallet, i, fromTokenName)
        }
        //////////
        await wallet.sendProgress()
        // transfer to OKX
        if (circle_config.need_deposit) {
            let finalEthBalance = await wallet.getBalance(starkTokens.ETH)
            let amountToLeaveFrom = NumbersHelpers.floatStringToBigInt(circle_config.amount_to_leave_from, 18n)
            let amountToLeaveTo = NumbersHelpers.floatStringToBigInt(circle_config.amount_to_leave_to, 18n)
            let amountToTransfer =
                finalEthBalance.result - RandomHelpers.getRandomBnFromTo(amountToLeaveFrom, amountToLeaveTo)
            if (amountToTransfer <= 0n) {
                log(c.yellow('amount to transfer to OKX <= 0, is that OK?'))
                wallet.updateProgress('amount to transfer to OKX <= 0, is that OK? \n*Check the script, please*')
                await wallet.sendProgress()
                await sleep(timeout * 3)
                continue
            }
            let transferCounter: bigint = BigInt(
                RandomHelpers.getRandomIntFromTo(circle_config.split_transfer[0], circle_config.split_transfer[1])
            )
            let sendRes: ActionResult[] = await wallet.splitTransfer(
                starkTokens.ETH,
                walletTripple[3],
                transferCounter,
                amountToTransfer
            )
            for (let result of sendRes) {
                wallet.updateProgress(result.transactionHash)
            }
            await wallet.sendProgress()
            let nonZeroAccs: AccData[] = []
            let oldBalance = await exch.getMainBalance()
            while (nonZeroAccs.length == 0) {
                // если не хотим ждать и достаточно денег, идём дальше
                if (oldBalance > NumbersHelpers.floatStringToBigInt(okx_config.amount_to, 18n)) {
                    log(c.yellow(`OKX balance is sufficient not to wait for deposit, continuing..`))
                    break
                }
                try {
                    if (oldBalance > NumbersHelpers.floatStringToBigInt(okx_config.amount_to, 18n)) {
                        log(`OKX balance: ${NumbersHelpers.bigIntToFloatStr(oldBalance, 18n)}, enough to go further`)
                        break
                    } else {
                        log(
                            `OKX balance: ${NumbersHelpers.bigIntToFloatStr(oldBalance, 18n)}, not enough to go further`
                        )
                    }
                    nonZeroAccs = await exch.getNonZeroSubacc()
                    oldBalance = await exch.getMainBalance()
                    await sleep(30, 'wait okx balance')
                } catch (e) {
                    log(e)
                }
            }
            if (nonZeroAccs.length > 0) {
                await exch.transferToMain('ETH', nonZeroAccs)
                await sleep(30, 'wait okx balance')
            }
        }
        let sleepTime = RandomHelpers.getRandomIntFromTo(wallet_sleep_interval[0], wallet_sleep_interval[0])
        await sleep(sleepTime, 'sleep between acc')
    }
}

async function main() {
    let wallets = await assembleAndRandomizeData()
    if (!wallets) return
    await volumeCircle(wallets)
}
main()
