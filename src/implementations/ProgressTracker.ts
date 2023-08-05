import { tg_token, tg_id, max_wait_time } from '../../config'
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
    async waitBalance(token: Token, amount?: bigint): Promise<boolean> {
        if (!amount) amount = 10n
        let balanceResponse = await this.getBalance(token)
        if (!balanceResponse.success) return false
        let balanceBefore = balanceResponse.result
        let balanceAfter = balanceBefore
        let counter: number = 0
        while (balanceAfter <= balanceBefore + amount) {
            balanceAfter = (await this.getBalance(token)).result
            await sleep(90, 'wait balance')
            counter++
            if (counter * 90 > max_wait_time) {
                this.updateProgress(
                    `wait balance time is > ${max_wait_time / 60} minutes, _check the script and stop_ or _wait more_`
                )
                await this.sendProgress()
            }
        }
        return true
    }
    async sendProgress(): Promise<ActionResult> {
        const url: string = `https://api.telegram.org/bot${tg_token}/sendMessage`
        try {
            let req: any = await axios.get(url, {
                data: {
                    chat_id: tg_id,
                    parse_mode: 'markdown',
                    text: this.telegramPaste
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
