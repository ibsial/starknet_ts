import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import * as stream from 'stream'
import { once } from 'events'
import { Mnemonic } from 'ethers'
import { log, c } from './implementations/helpers'
// const __dirname = path.resolve();
export const importOkxAddresses = async () => {
    let accs = []
    let instream = fs.createReadStream(path.join(__dirname, '../okx_addresses.txt'))
    let outstream = new stream.Stream()
    let rl = readline.createInterface(instream, outstream)
    rl.on('line', (line) => {
        accs.push(line)
    })
    await once(rl, 'close')
    return accs
}
export const importETHWallets = async () => {
    let accs = []
    let instream = fs.createReadStream(path.join(__dirname, '../privates.txt'))
    let outstream = new stream.Stream()
    let rl = readline.createInterface(instream, outstream)
    rl.on('line', (line) => {
        accs.push(line)
    })
    await once(rl, 'close')
    return accs
}
export const getTripples = async () => {
    let initialData = await importETHWallets()
    let wallets = []
    for (let [index, data] of initialData.entries()) {
        let wallet = data.split(';')
        if (!Mnemonic.isValidMnemonic(wallet[0])) {
            log(c.red('INVALID MNEMONIC FORMAT'), `\n[ ${index + 1} ] ${wallet[0]}`)
            return
        }
        if (wallet[1] == '') {
            wallet[1] = undefined
        }
        if (wallet[2] == '') {
            wallet[2] = 0
        }
        wallets.push(wallet)
    }
    return wallets
}
export const appendResultsToFile = async (file, data) => {
    fs.appendFile(`./${file}`, data + '\n', (err) => {
        if (err) throw err
    })
}
