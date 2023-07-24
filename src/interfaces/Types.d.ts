import { uint256 } from 'starknet'
export interface EstimateResult {
    success: boolean
    statusCode: number
    gasLimit: bigint
}
export interface ActionResult {
    success: boolean
    statusCode: number
    transactionHash: string
}
export interface ReadResponse {
    success: boolean
    statusCode: number
    result: any
}
export interface Token {
    name: string
    address: string
    decimals: bigint
    abi: []
}
export interface LpToken {
        dex: string,
        token: Token,
        entryPoints: {
            [key: string]: {
                name: string
                [key: string]: any
            }
        }
    components: {
        tokenA: Token
        tokenB: Token
    }
}
export interface Amm {
    name: string
    address: string
    tokens: {
        [key: string]: Token
    }
    lpTokens: {
        [key: string]: LpToken
    }
    entryPoints: {
        [key: string]: {
            name: string
            [key: string]: any
        }
    }
    abi: any
}
export interface Chain {
    name: string
    explorer: {
        base: string
        tx: string
        address: string
    }
    url: string
}
export interface AccData {'name': string, 'balance': string}