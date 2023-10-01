import { Account, CallData, Provider, SignerInterface, constants, ec, getChecksumAddress, hash } from 'starknet'
import { Wallet, HDNodeWallet, ethers, toBeArray } from 'ethers'
import { appendResultsToFile, getDoubles } from './fs_manipulations.js'

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
    let date = Date.now()
    appendResultsToFile(`starknet_wallets_${date}.csv`, `phrase,index,address,key`)
    for (let i = 0; i < amount; i++) {
        let keyPair
        if (cairoVer == 0) {
            keyPair = generateWalletCairo0(phrase, start + i)
        } else {
            keyPair = generateWalletCairo1(phrase, start + i)
        }
        keyPair[2] = getChecksumAddress(keyPair[2])
        let pasta = keyPair.toString()
        appendResultsToFile(`starknet_wallets_${date}.csv`, pasta!)
    }
}
async function generateManyFromMany(phrases: string[]) {
    let date = Date.now()
    appendResultsToFile(`starknet_wallets_${date}.csv`, `phrase,index,key,address`)
    for (let phrase of phrases) {
        let keyPair = generateWalletCairo0(phrase)
        let pasta = keyPair.toString()
        appendResultsToFile(`starknet_wallets_${date}.csv`, pasta!)
    }
}
async function generate(cairoVersion?: number) {
    if(!cairoVersion) cairoVersion = 1
    let seed = 'forest bounce rotate cake village front song nature color manage eye horse' // your seed
    let amount = 5 // how many wallets we generate
    let startingIndex = 0 // index wich we start from
    await generateManyFromOne(seed, amount, startingIndex, cairoVersion)
}
let cairoVersion = 1 // выберите версию каиро: 0 или 1
generate(cairoVersion)
export { generateManyFromMany, generateManyFromOne }
