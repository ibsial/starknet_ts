import { Account, CallData, Provider, SignerInterface, constants, ec, getChecksumAddress, hash } from 'starknet'
import { Wallet, HDNodeWallet, ethers, toBeArray } from 'ethers'
import { appendResultsToFile } from './fs_manipulations.js'

const accountClassHash = '0x033434ad846cdd5f23eb73ff09fe6fddd568284a0fb7d1be20ee482f044dabe2'
const argentProxyClassHash = '0x25ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918'

function generateWallet(phrase: string, index?: number): string[] {
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

async function generateManyFromOne(phrase: string, amount: number, start = 0) {
    let date = Date.now()
    appendResultsToFile(`starknet_wallets_${date}.csv`, `phrase,index,address,key`)
    for (let i = 0; i < amount; i++) {
        let keyPair = generateWallet(phrase, start + i)
        keyPair[2] = getChecksumAddress(keyPair[2])
        let pasta = keyPair.toString()
        appendResultsToFile(`starknet_wallets_${date}.csv`, pasta!)
    }
}
async function generateManyFromMany(phrases: string[]) {
    let date = Date.now()
    appendResultsToFile(`starknet_wallets_${date}.csv`, `phrase,index,key,address`)
    for (let phrase of phrases) {
        let keyPair = generateWallet(phrase)
        let pasta = keyPair.toString()
        appendResultsToFile(`starknet_wallets_${date}.csv`, pasta!)
    }
}
let seed = "any word that is in the dictionary and there are twelve words" // your seed
let amount = 100 // how many wallets we generate
let startingIndex = 0 // index wich we start from
await generateManyFromOne(seed, amount, startingIndex)

export { generateManyFromMany, generateManyFromOne }
