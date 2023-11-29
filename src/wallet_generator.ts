import { Account, CallData, Provider, SignerInterface, constants, ec, getChecksumAddress, hash } from 'starknet'
import { Wallet, HDNodeWallet, ethers, toBeArray } from 'ethers'
import { appendResultsToFile, getDoubles, importData } from './fs_manipulations.js'

const accountClassHash = '0x033434ad846cdd5f23eb73ff09fe6fddd568284a0fb7d1be20ee482f044dabe2'
const argentProxyClassHash = '0x25ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918'
const argentClassHash_cairo1 = '0x1a736d6ed154502257f02b1ccdf4d9d1089f80811cd6acad48e6b6a9d1f2003'

function generateWalletCairo0(phrase: string, index?: number): string[] {
    if (index == undefined) index = 0
    let keyPair: string[] = []
    const signer = Wallet.fromPhrase(phrase)
    const masterNode = HDNodeWallet.fromSeed(signer.privateKey)
    const childNode = masterNode.derivePath(`m/44'/9004'/0'/0/${index}`)
    const groundKey = '0x' + ec.starkCurve.grindKey(childNode.privateKey)
    const publicKey = ec.starkCurve.getStarkKey(groundKey)
    const constructorCallData = CallData.compile({
        implementation: accountClassHash,
        selector: hash.getSelectorFromName('initialize'),
        calldata: CallData.compile({
            signer: publicKey,
            guardian: '0'
        })
    })
    let addr = hash.calculateContractAddressFromHash(publicKey, argentProxyClassHash, constructorCallData, 0)
    keyPair.push(phrase)
    keyPair.push(index.toString())
    keyPair.push(getChecksumAddress(addr))
    keyPair.push(groundKey)
    console.log(keyPair)
    return keyPair
}
function generateWalletCairo1(phrase: string, index?: number): string[] {
    if (index == undefined) index = 0
    let keyPair: string[] = []
    const signer = Wallet.fromPhrase(phrase)
    const masterNode = HDNodeWallet.fromSeed(signer.privateKey)
    const childNode = masterNode.derivePath(`m/44'/9004'/0'/0/${index}`)
    const groundKey = '0x' + ec.starkCurve.grindKey(childNode.privateKey)
    const publicKey = ec.starkCurve.getStarkKey(groundKey)
    const constructorCallData = CallData.compile({
        signer: publicKey,
        guardian: '0'
    })
    let addr = hash.calculateContractAddressFromHash(publicKey, argentClassHash_cairo1, constructorCallData, 0)
    keyPair.push(phrase)
    keyPair.push(index.toString())
    keyPair.push(getChecksumAddress(addr))
    keyPair.push(groundKey)
    console.log(keyPair)
    return keyPair
}

async function generateManyFromOne(phrase: string, amount: number, start = 0, cairoVer = 1) {
    // appendResultsToFile(`starknet_wallets_${date}.csv`, `phrase,index,address,key`)
    for (let i = 0; i < amount; i++) {
        let keyPair
        // let signer = Wallet.fromPhrase(phrase)
        // let masterNode = ethers.HDNodeWallet.fromPhrase(phrase)
        let wallet = HDNodeWallet.fromPhrase(phrase, "", `m/44'/60'/0'/0/${i}`)
        let ethAddress = wallet.address
        let ethPrivate = wallet.privateKey
        if (cairoVer == 0) {
            keyPair = generateWalletCairo0(phrase, start + i)
        } else {
            keyPair = generateWalletCairo1(phrase, start + i)
        }
        keyPair[2] = getChecksumAddress(keyPair[2])
        let pasta = keyPair.toString()
        pasta += ',' + ethAddress + ',' + ethPrivate
        appendResultsToFile(`starknet_wallets_${date}.csv`, pasta!)
    }
}

async function restore(cairoVersion?: number, amount = 1) {
    if (cairoVersion != 0 && cairoVersion != 1) cairoVersion = 1
    // let seed = 'any word that is in the dictionary and there are twelve words' // your seed
    let seeds = await getDoubles()
    appendResultsToFile(`starknet_wallets_${date}.csv`, `phrase,index,stark_address,stark_key,eth_address,eth_key`)
    for (let i = 0; i < seeds!.length; i++) {
        let startingIndex = 0 // index wich we start from
        await generateManyFromOne(seeds![i][0], amount, startingIndex, cairoVersion)
    }
}
async function generate(cairoVersion?: number, seedAmount = 1, walletPerSeedAmount = 1) {
    if (cairoVersion === undefined) cairoVersion = 1
    appendResultsToFile(`starknet_wallets_${date}.csv`, `phrase,index,stark_address,stark_key,eth_address,eth_key`)
    for (let i = 0; i < seedAmount; i++) {
        let wallet = ethers.Wallet.createRandom()
        let seed = wallet.mnemonic?.phrase
        await generateManyFromOne(seed!, walletPerSeedAmount, 0, cairoVersion)
    }
}

let date: Date | string = new Date(Date.now())
date = date.toISOString()
date = date.replace(new RegExp(':', 'g'), '-')
date = date.replace('.', '-')
console.log(date)
async function main() {
    let args = process.argv.slice(2)
    let script = args[0]
    let seedAmount = parseInt(args[1])
    let walletPerSeedAmount = 1
    if (args[2] !== undefined) {
        walletPerSeedAmount = parseInt(args[2])
    }
    let cairoVersion = 1 // выберите версию каиро: 0 или 1
    switch (script) {
        case 'generate':
            return await generate(cairoVersion, seedAmount, walletPerSeedAmount)
        case 'restore':
            return await restore(cairoVersion, seedAmount)
    }
}
main()

export { generateManyFromOne }
