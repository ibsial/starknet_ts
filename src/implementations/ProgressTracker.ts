import { tg_token, tg_id } from '../../config'
import { Account, num, uint256, getChecksumAddress, Contract } from 'starknet'
import { StarknetWallet } from './Wallet'
import axios from 'axios'
import { Token, Amm, ReadResponse } from '../interfaces/Types'
import { ActionResult, LpToken } from '../interfaces/Types'
import { NumbersHelpers, RandomHelpers, removeElementFromArray, sleep, log, c } from './helpers'
import { amms, starkTokens } from '../data/tokens'

class progressTracker extends StarknetWallet {
    // telegram results paste
    telegramPaste: string = ``

    constructor(mnemonic: string, evmPrivateKey?: string, index?: string) {
        super(mnemonic, evmPrivateKey, index)
    }
    updateProgress(pasta: string): void {
        this.telegramPaste = this.telegramPaste + pasta + '\n'
    }
    async sendProgress(): Promise<ActionResult> {
        const url: string = `https://api.telegram.org/bot${tg_token}/sendMessage`
        try {
            let req: any = await axios.get(url, {
                data: {
                    chat_id: tg_id,
                    parse_mode: 'markdown',
                    text: this.telegramPaste,
                }
            })
            if (await req.data.ok) {
                return { success: true, statusCode: 1, transactionHash: '' }
            }
            return { success: false, statusCode: 0, transactionHash: '' }
        } catch (e) {
            return { success: false, statusCode: 0, transactionHash: '' }
        }
    }
}

export { progressTracker }
