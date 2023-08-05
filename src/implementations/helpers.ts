import { max_retries, max_wait_time, okx_config } from '../../config'
import { formatUnits, parseUnits, ethers, Wallet, JsonRpcProvider } from 'ethers'
import { SingleBar, Presets } from 'cli-progress'
import { okx } from 'ccxt'
import c from 'chalk'
import { ethereum } from '../data/networks'
import { progressTracker } from './ProgressTracker'
import { ActionResult, AccData } from '../interfaces/Types'

const log = console.log
const timeout = 5 * 60

class Numbers {
    bigIntToFloatStr(amount: bigint, decimals: bigint): string {
        return formatUnits(amount, decimals)
    }
    bigIntToPrettyFloatStr(amount: bigint, decimals: bigint): string {
        return parseFloat(formatUnits(amount, decimals)).toFixed(5)
    }
    floatStringToBigInt(floatString: string, decimals: bigint): bigint {
        return parseUnits(floatString, decimals)
    }
}
const NumbersHelpers = new Numbers()

class Random {
    getRandomInt(max: number): number {
        return Math.floor(Math.random() * max)
    }
    getRandomIntFromTo(min: number, max: number): number {
        const delta = max - min
        return Math.round(min + Math.random() * delta)
    }
    getRandomBnFromTo(min: bigint, max: bigint): bigint {
        const delta = max - min
        const random = BigInt(Math.round(Math.random() * 100))
        return min + (delta * random) / 100n
    }
    getRandomValue(min: string, max: string): bigint {
        const from = NumbersHelpers.floatStringToBigInt(min, 18n)
        const to = NumbersHelpers.floatStringToBigInt(max, 18n)
        return this.getRandomBnFromTo(from, to)
    }
    getRandomDeadline(): number {
        let hour = 3600
        let tsNow = Date.now() / 1000 // timestamp in sec
        // deadline from +1 day to +6 days
        let tsRandom = Math.round(tsNow + hour * (Math.random() * this.getRandomInt(3) + 1))
        return tsRandom
    }
    shuffleArray(oldArray: any[]): any[] {
        let array = oldArray.slice()
        let buf
        for (let i = 0; i < array.length; i++) {
            buf = array[i]
            let randNum = Math.floor(Math.random() * array.length)
            array[i] = array[randNum]
            array[randNum] = buf
        }
        return array
    }
    chooseKeyFromStruct(struct: { [key: string]: any }): string {
        const keys = Object.keys(struct)
        return keys[Math.floor(Math.random() * keys.length)]
    }
    chooseElementFromArray(array: any[]): any {
        return array[Math.floor(Math.random() * array.length)]
    }
}
const RandomHelpers = new Random()

class Okex {
    okex: okx
    constructor() {
        let okx_creditentials = {}
        this.okex = new okx({
            enableRateLimit: true,
            // okx_creditentials
            apiKey: okx_config.apiKey,
            secret: okx_config.apiSecret,
            password: okx_config.password
        })
        this.okex.hostname = 'www.okx.cab'
    }
    async withdrawEth(amount: bigint, toAddress?: string, toPrivateKey?: string): Promise<boolean> {
        let value: any = parseFloat(NumbersHelpers.bigIntToFloatStr(amount, 18n))
        value = value.toFixed(5)
        let counter: number = 0
        while (counter * 90 < max_wait_time) {
            try {
                if (toAddress) {
                    await this.okex.withdraw('ETH', value, toAddress, {
                        fee: okx_config.fee,
                        network: 'ERC20',
                        password: okx_config.password
                    })
                } else if (toPrivateKey) {
                    let wallet = new Wallet(toPrivateKey)
                    await this.okex.withdraw('ETH', value, wallet.address, {
                        fee: okx_config.fee,
                        network: 'ERC20',
                        password: okx_config.password
                    })
                }
                return true
            } catch (e) {
                log(e)
                log(c.red(`error on OKX withdraw`))
            }
            counter++
            await sleep(90, "waiting OKX balance")
        }
        return false
    }
    async getMainBalance(): Promise<bigint> {
        let balance: any = await this.okex.fetchBalance({ type: 'funding' })
        balance = balance['free']['ETH'].toString()
        return NumbersHelpers.floatStringToBigInt(balance, 18n)
    }
    async getNonZeroSubacc(currency: string = 'ETH'): Promise<AccData[]> {
        // get acc list
        let resp = await this.okex.privateGetUsersSubaccountList()
        // get accs names
        let accs: string[] = []
        for (let acc of resp['data']) {
            accs.push(acc['subAcct'])
        }
        // get non zero balance accs
        let nonZeroAccs: AccData[] = []
        for (let acc of accs) {
            let resp = await this.okex.privateGetAssetSubaccountBalances({ subAcct: acc, currency: currency })
            if (resp.data.length > 0) {
                for (let balances of resp.data) {
                    if (balances.ccy == currency) {
                        nonZeroAccs.push({ name: acc, balance: balances['availBal'] })
                    }
                }
            }
        }
        log(`accs with nonZero ${currency} balance:`, nonZeroAccs)
        return nonZeroAccs
    }
    async transferToMain(currency: string = 'ETH', subAccounts: AccData[]): Promise<void> {
        for (let acc of subAccounts) {
            log(
                await this.okex.transfer(currency, acc.balance, 'funding', 'funding', {
                    type: '2',
                    subAcct: acc.name
                })
            )
        }
    }
}
function removeElementFromArray(arr: any[], element: any): void {
    const index = arr.indexOf(element)
    if (index > -1) {
        // only splice array when item is found
        arr.splice(index, 1) // 2nd parameter means remove one item only
    }
}
async function getTxStatus(provider: any, hash: string, pasta: string): Promise<ActionResult> {
    try {
        const status: any = await provider.waitForTransaction(hash)
        if (status == undefined || status == 'REJECTED') {
            return { success: false, statusCode: 0, transactionHash: 'tx rejected' }
        }
        return { success: true, statusCode: 1, transactionHash: pasta }
    } catch (e) {
        return { success: false, statusCode: 0, transactionHash: hash }
    }
}
async function evmTransactionPassed(provider: any, hash: string): Promise<any> {
    let txReceipt
    // if provider != lite_provider
    try {
        txReceipt = await provider.getTransactionReceipt(hash)
        // console.log(txReceipt);
        if (txReceipt) {
            return txReceipt.status
        } else {
            return await evmTransactionPassed(provider, hash)
        }
        // if provider == lite_provider
    } catch (e) {
        txReceipt = await provider.getTxReceipt(hash)
        // console.log(txReceipt);
        if (txReceipt) {
            return txReceipt
        } else {
            return await evmTransactionPassed(provider, hash)
        }
    }
}
async function sleep(sec: number, reason = 'Sleep') {
    if (sec > 1) {
        sec = Math.round(sec)
    }
    let bar = new SingleBar(
        { format: `${reason} | ${c.blueBright('{bar}')} | {percentage}% | {value}/{total} sec` },
        Presets.rect
    )
    bar.start(sec, 0)
    for (let i = 0; i < sec; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1 * 1000))
        bar.increment()
    }
    bar.stop()
}
const retry = async (
    fn: any,
    { retries = 0, maxRetries = max_retries, retryInterval = 15, backoff = 1 },
    ...args: any
): Promise<any> => {
    retryInterval = retryInterval * backoff
    if (retries >= maxRetries) {
        console.log('retry limit exceeded, marking action as false')
        return { success: false, statusCode: 0, result: undefined }
    }
    let tries = retries + 1
    // call function and work on error
    try {
        let result = await fn(...args)
        if (result.statusCode == undefined) {
            return result
        }
        if (result.statusCode == 1) {
            return result
        } else if (result.statusCode < 0) {
            return result
        }
        console.log(result)
        console.log(`action failed for some reason, retrying... [${tries} / ${maxRetries}]`)
        await sleep(retryInterval, 'Sleep before retry')
        return await retry(fn, { retries: tries, retryInterval, maxRetries, backoff }, ...args)
    } catch (e) {
        console.log(e)
        console.log(`catched error, retrying... [${tries}]`)
        console.log(c.magenta('if you see this, please contact the author and tell about error above'))
        await sleep(retryInterval * 2)
    }
    return await retry(fn, { retries: tries, retryInterval, maxRetries, backoff }, ...args)
}
const gweiEthProvider = new JsonRpcProvider(ethereum.url)

export {
    log,
    c,
    timeout,
    NumbersHelpers,
    RandomHelpers,
    Okex,
    removeElementFromArray,
    retry,
    sleep,
    getTxStatus,
    gweiEthProvider,
    evmTransactionPassed
}
