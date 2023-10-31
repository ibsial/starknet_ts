import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import * as stream from 'stream'
import { once } from 'events'
import { Mnemonic } from 'ethers'
import { log, c, RandomHelpers, sleep } from './implementations/helpers'
import { circle_config, okx_config } from '../config'

// const __dirname = path.resolve(),

export const importData = async (filename) => {
    let data = []
    let instream = fs.createReadStream(path.join(__dirname, `${filename}`))
    let outstream = new stream.Stream()
    let rl = readline.createInterface(instream, outstream)
    rl.on('line', (line) => {
        data.push(line)
    })
    await once(rl, 'close')
    return data
}
export const appendResultsToFile = (file, data) => {
    fs.appendFileSync(`${file}`, data + '\n', (err) => {
        if (err) throw err
    })
}
export const writeToFile = async (file, data) => {
    await fs.writeFile(`${file}`, data + '\n', (err) => {
        if (err) throw err
    })
}
export async function shuffleAndOverwriteKeys() {
    let privates = await importETHWallets()
    let newPrivates = RandomHelpers.shuffleArray(privates)
    await writeToFile('../privates.txt', newPrivates.join('\n'))
    console.log(`shuffled ${privates.length} wallets successfully!`)
    await sleep(5, 'sleep after shuffle a bit')
}
// read (mnemonic,index) file
export const getDoubles = async () => {
    let initialData = await importData('../private_files/seeds.txt')
    let wallets = []
    for (let [index, data] of initialData.entries()) {
        let wallet = data.split(',')
        if (!Mnemonic.isValidMnemonic(wallet[0])) {
            log(c.red('INVALID MNEMONIC FORMAT'), `\n[ ${index + 1} ] ${wallet[0]}`)
            return
        }
        if (wallet[1] == '') {
            wallet[1] = undefined
        }
        wallets.push([wallet[0], wallet[1]])
    }
    return wallets
}
export const importOkxAddresses = async () => {
    let accs = []
    let instream = fs.createReadStream(path.join(__dirname, '../private_files/okx_addresses.txt'))
    let outstream = new stream.Stream()
    let rl = readline.createInterface(instream, outstream)
    rl.on('line', (line) => {
        accs.push(line)
    })
    await once(rl, 'close')
    return accs
}
export const importEthPrivates = async () => {
    let accs = []
    let instream = fs.createReadStream(path.join(__dirname, '../private_files/eth_privates.txt'))
    let outstream = new stream.Stream()
    let rl = readline.createInterface(instream, outstream)
    rl.on('line', (line) => {
        accs.push(line)
    })
    await once(rl, 'close')
    return accs
}
export const assembleAndRandomizeData = async () => {
    let [doubles, ethPrivates, okxAddresses] = await Promise.all([
        getDoubles(),
        importEthPrivates(),
        importOkxAddresses()
    ])
    // log(doubles, ethPrivates, okxAddresses)
    // check okx addresses validity
    if(circle_config.need_deposit && okxAddresses.length == 0) {
        log(c.red('did you forget to paste OKX addresses?'))
        throw Error("no OKX address")
    }
    for (let acc of okxAddresses) {
        if (acc.length != 66 && acc.length != 64) {
            log(c.red('invalid OKX address!'))
            log(c.red(`[ ${acc} ]`))
            return
        }
    }
    // validate key length (kinda validity)
    for (let keys of ethPrivates) {
        if (keys.length != 66 && keys.length != 64) {
            log(c.red('invalid eth private key!'))
            log(c.red(`[ ${keys} ]`))
            return
        }
    }
    for (let wallet of doubles) {
        if (!Mnemonic.isValidMnemonic(wallet[0])) {
            log(c.red(`INVALID MNEMONIC FORMAT \n[ ${wallet[0]} ]`))
            return
        }
        if (wallet[1] == '') {
            wallet[1] = undefined
        }
    }
    let finalArray = []
    while (doubles.length > ethPrivates) {
        ethPrivates.push(undefined)
    }
    for (let i = 0; i < doubles.length; i++) {
        let temp = []
        temp.push(doubles[i][0], ethPrivates[i], doubles[i][1], okxAddresses[i % okxAddresses.length])
        finalArray.push(temp)
    }
    let shuffledFinalArray = RandomHelpers.shuffleArray(finalArray)
    await writeToFile('./private_files/combined.csv', shuffledFinalArray.join('\n'))
    log(c.underline`shuffled ${doubles.length} wallets, ${ethPrivates.length} eth privates, ${okxAddresses.length} OKX addresses!`)
    log(c.magenta.bold('check if it`s correct! If so, just wait'))
    await sleep(15, 'sleep after shuffle a bit')
    return shuffledFinalArray
}
