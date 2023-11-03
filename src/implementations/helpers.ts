import { max_retries, max_wait_time, okx_config } from '../../config'
import { formatUnits, parseUnits, ethers, Wallet, JsonRpcProvider } from 'ethers'
import { SingleBar, Presets } from 'cli-progress'
import { okx } from 'ccxt'
import c from 'chalk'
import { ethereum } from '../data/networks'
import { progressTracker } from './ProgressTracker'
import { ActionResult, AccData } from '../interfaces/Types'
import { Account, SequencerProvider, constants } from 'starknet'

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
    chooseKeyFromStruct(struct: { [key: string]: any }, notKey = ""): string {
        const keys = Object.keys(struct)
        let res = keys[Math.floor(Math.random() * keys.length)]
        while(res == notKey) {
            res = keys[Math.floor(Math.random() * keys.length)]
        }
        return res
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
                log(c.green(`withdrew ${value} ETH from Okx to Ethereum mainnet`))
                return true
            } catch (e) {
                log(e)
                log(c.red(`error on OKX withdraw`))
            }
            counter++
            await sleep(90, 'waiting OKX balance')
        }
        return false
    }
    async withdrawStarknet(amount: bigint, toAddress?: string): Promise<boolean> {
        let value: any = parseFloat(NumbersHelpers.bigIntToFloatStr(amount, 18n))
        value = value.toFixed(5)
        let counter: number = 0
        while (counter * 90 < max_wait_time) {
            try {
                    await this.okex.withdraw('ETH', value, toAddress, {
                        fee: okx_config.fee,
                        network: 'Starknet',
                        password: okx_config.password
                    })
                    log(c.green(`withdrew ${value} ETH from Okx to Starknet`))
                return true
            } catch (e) {
                log(e)
                log(c.red(`error on OKX withdraw`))
            }
            counter++
            await sleep(90, 'waiting OKX balance')
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
function generateEmailAddress(length: number) {
    let symbols = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let domains = ["@gmail.com", "@yahoo.com", "@outlook.com", "@hotmail.com", "@proton.me"];
    let str = "";
    for (let i = 0; i < length; i++) {
        str = str + symbols.charAt(Math.floor(Math.random() * symbols.length));
    }
    str = str + domains[Math.floor(Math.random() * domains.length)];
    return str;
}
function generateRandomText(length: number) {
    let start = ["We are writing to inform you that", "Thank you for contacting us!", "In reply to your request", "I am writing to tell you about", "Further to our meeting last week", "Could you please send me", "We are pleased to announce that", "You will be pleased to learn that", "I am writing to complain about", "We regret to inform you that", "Unfortunately we cannot/we are unable to", "We are sorry for the delay in replying", "I would like to apologize for", "Please confirm receipt of our order!", "We wish to remind you that"]
    let nouns = ["people", "history", "way", "art", "world", "map", "family", "government", "health", "system", "computer", "meat", "year", "thanks", "music", "person", "reading", "method", "data", "food", "understanding", "theory", "law", "bird", "literature", "problem", "software", "control", "knowledge", "power", "ability", "economics", "love", "internet", "television", "science", "library", "nature", "fact", "product", "idea", "temperature", "investment", "area", "society", "activity", "story", "industry", "media", "thing", "oven", "community", "definition", "safety", "quality", "development", "language", "management", "player", "variety", "video", "week", "security", "country", "exam", "movie", "organization", "equipment", "physics", "analysis", "policy", "series", "thought", "basis", "boyfriend"]
    let verbs = ["ask", "be", "become", "begin", "call", "can", "come", "could", "do", "feel", "find", "get", "give", "go", "have", "hear", "help", "keep", "know", "leave", "let", "like", "live", "look", "make", "may", "mean", "might", "move", "need", "play", "put", "run", "say", "see", "seem", "should", "show", "start", "take", "talk", "tell", "think", "try", "turn", "use", "want", "will", "work", "would"]
    let adverbs = ["not", "also", "very", "often", "however", "too", "usually", "really", "early", "never", "always", "sometimes", "together", "likely", "simply", "generally", "instead", "actually", "again", "rather", "almost", "especially", "ever", "quickly", "probably", "already", "below", "directly", "therefore", "else", "thus", "easily", "eventually", "exactly", "certainly", "normally", "currently", "extremely", "finally", "constantly", "properly", "soon", "specifically", "ahead", "daily", "highly", "immediately", "relatively", "slowly", "fairly", "primarily", "completely", "ultimately", "widely", "recently", "seriously", "frequently", "fully", "mostly", "naturally", "nearly", "occasionally", "carefully", "clearly", "essentially", "possibly", "slightly", "somewhat", "equally", "greatly", "necessarily", "personally", "rarely", "regularly", "similarly", "basically", "closely", "effectively", "initially", "literally", "gently", "hopefully", "originally", "roughly", "significantly", "totally", "elsewhere", "everywhere", "obviously", "perfectly", "physically", "successfully", "suddenly", "truly", "virtually", "altogether", "anyway", "automatically", "deeply", "definitely", "deliberately", "hardly", "readily", "terribly", "unfortunately", "forth", "briefly", "moreover", "strongly", "honestly", "previously", "as", "there", "when", "how", "so", "up", "out", "no", "only", "well", "then", "first", "where", "why", "now", "around", "once", "down", "off", "here", "tonight", "away", "today", "far", "quite", "later", "above", "yet", "maybe", "otherwise", "near", "forward", "somewhere", "anywhere", "please", "forever", "somehow", "absolutely", "abroad", "yeah", "nowhere", "tomorrow", "yesterday", "the", "to", "in", "more", "about", "such", "through", "new", "just", "any", "each", "much", "before", "between", "free", "right", "best", "since", "both", "sure", "without", "back", "better", "enough", "lot", "small"]
    let ending = ["Sincerely", "Sincerely yours", "all the best", "best wishes", "Best regards", "Speak to you soon", "talk to you later", "looking forward to speaking with you soon", "Thanks", "Yours truly", "Cheers"]
    let message = start[Math.floor(Math.random() * start.length)] + "\n"
    for (let i = 0; i < length; i++) {
        let sentence = nouns[Math.floor(Math.random() * nouns.length)] + " " + verbs[Math.floor(Math.random() * verbs.length)] + " " + adverbs[Math.floor(Math.random() * adverbs.length)] + " "+
        adverbs[Math.floor(Math.random() * adverbs.length)] + " " + nouns[Math.floor(Math.random() * nouns.length)] + ". "
        message = message + sentence
    }
    message = message + "\n" + ending[Math.floor(Math.random() * ending.length)] + "!" + "\n"
    return message
}
async function getTxStatus(account: Account, hash: string, pasta: string): Promise<ActionResult> {
    try {
        await account.waitForTransaction(hash)
        const status: any = (await account.getTransactionReceipt(hash)).status
        // log(status)
        if (status == undefined ||status == 'REJECTED' || status == 'REVERTED') {
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
    process.stdout.clearLine(0);
}
async function defaultSleep(sec: number, needProgress = true) {
    if (needProgress) {
        let newpaste = ["-", `\\`, `|`, `/`];
        for (let i = 0; i < sec * 2; i++) {
            process.stdout.clearLine(0); // clear current text
            process.stdout.cursorTo(0);
            process.stdout.write(`${newpaste[i % 4]}`);
            await await new Promise((resolve) => setTimeout(resolve, 500));
        }
        process.stdout.clearLine(0); // clear current text
        process.stdout.cursorTo(0);
        return;
    }
    return await new Promise((resolve) => setTimeout(resolve, sec * 1000));
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
        console.log(result.transactionHash ?? result)
        console.log(`action failed for some reason, retrying... [${tries} / ${maxRetries}]`)
        await defaultSleep(retryInterval)
        return await retry(fn, { retries: tries, retryInterval, maxRetries, backoff }, ...args)
    } catch (e) {
        console.log(e)
        console.log(`catched error, retrying... [${tries}]`)
        console.log(c.magenta('if you see this, please contact the author and tell about error above'))
        await defaultSleep(retryInterval * 2)
    }
    return await retry(fn, { retries: tries, retryInterval, maxRetries, backoff }, ...args)
}
const gweiEthProvider = new JsonRpcProvider(ethereum.url)
const gweiStarkProvider = new SequencerProvider({
    baseUrl: constants.BaseUrl.SN_MAIN
})

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
    defaultSleep,
    getTxStatus,
    gweiEthProvider,
    gweiStarkProvider,
    evmTransactionPassed,
    generateEmailAddress,
    generateRandomText
}
