import { amms, starkTokens } from './data/tokens'
import { progressTracker, progressTrackerFromKey } from './implementations/ProgressTracker'
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
import { assembleAndRandomizeData, assembleAndRandomizeDataFromKeys } from './fs_manipulations'
import { action_sleep_interval, okx_config, wallet_sleep_interval } from '../config'
import { Contract } from 'starknet'
import { ActionResult, ReadResponse, AccData, Token } from './interfaces/Types'
import { checkGas } from './implementations/Wallet'

async function executeModules(wallet: progressTracker) {
    // withdraw from okx
    // wait balance
    if (okx_config.need_withdraw) {
        let exch = new Okex()
        try {
            let randAmountFrom = NumbersHelpers.floatStringToBigInt(okx_config.amount_from, 18n)
            let randAmountTo = NumbersHelpers.floatStringToBigInt(okx_config.amount_to, 18n)
            let randAmount = RandomHelpers.getRandomBnFromTo(randAmountFrom, randAmountTo)
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
            wallet.updateProgress('*something prevented from withdrawing, check everything and start again, please*')
            await wallet.sendProgress()
            await sleep(timeout * 3, 'okx withdraw fail')
        }
    }
    // run modules
    let initialState: { [key: string]: number } = {}
    Object.assign(initialState, wallet.modulesCount)
    let initialPlan = '| '
    for (let key in wallet.modulesCount) {
        if (key == 'sum') continue
        // if (wallet.modulesCount[key] == 0) continue
        initialPlan += `${key}: ${wallet.modulesCount[key]} | `
    }
    log(c.yellow(initialPlan))
    log(c.bgMagenta(`max modules to do: ${wallet.maxModulesCount}`))
    while (wallet.modulesCount.sum() > 0) {
        if (wallet.maxModulesCount > 0) {
            let module = RandomHelpers.chooseKeyFromStruct(wallet.modulesCount, 'sum')
            if (wallet.modulesCount[module] <= 0) {
                continue
            }
            await checkGas()
            log(module)
            let res
            switch (module) {
                case 'mintStarknetId':
                    res = await wallet.mintStarknetId()
                    log(
                        `${initialState[module] - wallet.modulesCount[module] + 1}/${initialState[module]}`,
                        res.transactionHash
                    )
                    wallet.modulesCount[module] -= 1
                    wallet.updateProgress(res.transactionHash)
                    break
                case 'mintStarkverseGenesisNft':
                    res = await wallet.mintStarkverseGenesisNft()
                    log(
                        `${initialState[module] - wallet.modulesCount[module] + 1}/${initialState[module]}`,
                        res.transactionHash
                    )
                    wallet.modulesCount[module] -= 1
                    wallet.updateProgress(res.transactionHash)
                    break
                case 'unframedBidNCancel':
                    let res1 = await wallet.approve()
                    log(
                        `${initialState[module] - wallet.modulesCount[module] + 1}/${initialState[module]}`,
                        res1.transactionHash
                    )
                    await defaultSleep(RandomHelpers.getRandomIntFromTo(15, 30))
                    let res2 = await wallet.cancelOrder()
                    log(
                        `${initialState[module] - wallet.modulesCount[module] + 1}/${initialState[module]}`,
                        res2.transactionHash
                    )
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
                    log(
                        `${initialState[module] - wallet.modulesCount[module] + 1}/${initialState[module]}`,
                        res.transactionHash
                    )
                    wallet.modulesCount[module] -= 1
                    wallet.updateProgress(res.transactionHash)
                    break
                case 'sendDmail':
                    res = await wallet.sendDmail()
                    log(
                        `${initialState[module] - wallet.modulesCount[module] + 1}/${initialState[module]}`,
                        res.transactionHash
                    )
                    wallet.modulesCount[module] -= 1
                    wallet.updateProgress(res.transactionHash)
                    break
            }
            wallet.maxModulesCount--
            await defaultSleep(RandomHelpers.getRandomIntFromTo(action_sleep_interval[0], action_sleep_interval[1]))
        } else {
            break
        }
    }
    await wallet.sendProgress()
    await sleep(RandomHelpers.getRandomIntFromTo(wallet_sleep_interval[0], wallet_sleep_interval[1]))
}
async function main() {
    let args = process.argv.slice(2)
    let wallets
    if (args[0] == 'keys') {
        wallets = await assembleAndRandomizeDataFromKeys(false)
    } else {
        wallets = await assembleAndRandomizeData(false)
    }
    if (!wallets) return
    for (let i = 0; i < wallets.length; i++) {
        let wallet
        if (args[0] == 'keys') {
            wallet = new progressTrackerFromKey(wallets[i][0], wallets[i][1], wallets[i][2])
            if (!(await wallet.setupAccount()).success) {
                wallet.updateProgress(`something went wrong with changing PK for wallet: \n${wallets[0]}`)
                await wallet.sendProgress()
                log(c.red(`something went wrong with changing PK for wallet: \n${wallets[0]}`))
                continue
            }
        } else {
            wallet = new progressTracker(wallets[i][0], wallets[i][1], wallets[i][2])
            if (!(await wallet.init()).success) {
                wallet.updateProgress(
                    `something went wrong with getting correct address for wallet: \n${wallets[i][0]}, ${wallets[i][2]}`
                )
                wallet.updateProgress(`this is undefined behavior, please restart the script and contact author`)
                await wallet.sendProgress()
                log(
                    c.red(`something went wrong with getting correct address for wallet:`),
                    `\n${wallets[i][0]}, ${wallets[i][2]}`
                )
                log(c.red(`this is undefined behavior, please restart the script and contact author`))
                throw 'Something went wrong with getting acc address'
            }
            // deploy wallet
            let deployRes = await wallet.checkAndDeployWallet()
            if (!deployRes.success) {
                log(c.red('failed to deploy account'))
                wallet.updateProgress(deployRes.transactionHash + '\n*Restart script*')
                await wallet.sendProgress()
                await sleep(timeout * 3, 'fail on deploy')
                return
            }
            await defaultSleep(15)
        }
        if (args[0] != 'keys') {
            wallet.updateProgress(
                `acc: [${i + 1}/${wallets.length}] mnemonic_index: ${
                    wallets[i][2] !== undefined ? wallets[i][2] : 0
                } address: ${wallet.starknetAddress}`
            )
        } else {
            wallet.updateProgress(`acc: [${i + 1}/${wallets.length}] address: ${wallet.starknetAddress}`)
        }
        await executeModules(wallet)
    }
}
main()
