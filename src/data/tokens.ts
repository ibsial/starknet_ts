import { Token, Amm, LpToken } from '../interfaces/Types'
import { jediswap_abi, jediswap_lp_abi } from '../abi/jediswap'
import { tenKSwap_abi, tenKSwap_lp_abi } from '../abi/10kswap'
import { erc20_abi } from '../abi/erc20'
export const starkTokens = {
    ETH: {
        name: 'ETH',
        address: '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
        decimals: 18n,
        abi: erc20_abi
    } as Token,
    USDC: {
        name: 'USDC',
        address: '0x53c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
        decimals: 6n,
        abi: erc20_abi
    } as Token,
    USDT: {
        name: 'USDT',
        address: '0x68f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8',
        decimals: 6n,
        abi: erc20_abi
    } as Token,
    DAI: {
        name: 'DAI',
        address: '0xda114221cb83fa859dbdb4c44beeaa0bb37c7537ad5ae66fe5e0efd20e6eb3',
        decimals: 18n,
        abi: erc20_abi
    } as Token
}
const jediswap_lp_entrypoints = {
    getReserves: {
        name: 'get_reserves',
        paramTypes: {}
    },
    totalSupply: {
        name: 'totalSupply',
        paramTypes: {}
    },
}
const jediswap: Amm = {
    name: 'jediswap',
    address: '0x041fd22b238fa21cfcf5dd45a8548974d8263b3a531a60388411c5e230f97023',
    tokens: starkTokens,
    lpTokens: {
        ETHUSDT: {
            dex: "jediswap",
            token: {
                name: 'ETHUSDT-LP',
                address: '0x45e7131d776dddc137e30bdd490b431c7144677e97bf9369f629ed8d3fb7dd6',
                decimals: 18n,
                abi: jediswap_lp_abi
            } as Token,
            entryPoints: jediswap_lp_entrypoints,
            components: {
                tokenA: starkTokens.ETH,
                tokenB: starkTokens.USDT,
            }
        } as LpToken,
        ETHUSDC: {
            dex: "jediswap",
            token: {
                name: 'ETHUSDC-LP',
                address: '0x4d0390b777b424e43839cd1e744799f3de6c176c7e32c1812a41dbd9c19db6a',
                decimals: 18n,
                abi: jediswap_lp_abi
            } as Token,
            entryPoints: jediswap_lp_entrypoints,
            components: {
                tokenA: starkTokens.ETH,
                tokenB: starkTokens.USDC,
            }
        } as LpToken,
        ETHDAI: {
            dex: "jediswap",
            token: {
                name: 'ETHDAI-LP',
                address: '0x7e2a13b40fc1119ec55e0bcf9428eedaa581ab3c924561ad4e955f95da63138',
                decimals: 18n,
                abi: jediswap_lp_abi
            } as Token,
            entryPoints: jediswap_lp_entrypoints,
            components: {
                tokenA: starkTokens.ETH,
                tokenB: starkTokens.DAI,
            }
        } as LpToken,
        // USDTUSDC: {
        //     dex: "jediswap",
        //     token: {
        //         name: 'USDTUSDC-LP',
        //         address: '0x5801bdad32f343035fb242e98d1e9371ae85bc1543962fedea16c59b35bd19b',
        //         decimals: 18n,
        //         abi: jediswap_lp_abi
        //     } as Token,
        //     entryPoints: {
        //         getReserves: {
        //             name: 'get_reserves',
        //             paramTypes: {}
        //         },
        //         totalSupply: {
        //             name: 'totalSupply',
        //             paramTypes: {}
        //         },
        //     },
        //     components: {
        //         tokenA: {
        //             name: 'USDT',
        //             address: '0x68f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8',
        //             decimals: 6n,
        //             abi: erc20_abi
        //         } as Token,
        //         tokenB: {
        //             name: 'USDC',
        //             address: '0x53c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
        //             decimals: 6n,
        //             abi: erc20_abi
        //         } as Token
        //     }
        // } as LpToken,
    },
    entryPoints: {
        getAmountsOut: {
            name: 'get_amounts_out',
            paramTypes: {
                amountIn: 1n,
                amountOut: 0n,
                path: ['', ''],
                toAddress: '',
                deadline: 0
            }
        },
        swapTokensForTokens: {
            name: 'swap_exact_tokens_for_tokens'
        },
        addLiquidity: {
            name: 'add_liquidity'
        },
        removeLiquidity: {
            name: 'remove_liquidity'
        }
    },
    abi: jediswap_abi
}
const tenKSwap_lp_entrypoints = {
    getReserves: {
        name: 'getReserves',
        paramTypes: {}
    },
    totalSupply: {
        name: 'totalSupply',
        paramTypes: {}
    },
}
const tenKSwap: Amm = {
    name: '10Kswap',
    address: '0x07a6f98c03379b9513ca84cca1373ff452a7462a3b61598f0af5bb27ad7f76d1',
    tokens: starkTokens,
    lpTokens: {
        ETHUSDT: {
            dex: "10Kswap",
            token: {
                name: 'ETHUSDT-LP',
                address: '0x5900cfa2b50d53b097cb305d54e249e31f24f881885aae5639b0cd6af4ed298',
                decimals: 18n,
                abi: tenKSwap_lp_abi
            } as Token,
            entryPoints: tenKSwap_lp_entrypoints,
            components: {
                tokenA: starkTokens.ETH,
                tokenB: starkTokens.USDT,
            }
        } as LpToken,
        ETHUSDC: {
            dex: "10Kswap",
            token: {
                name: 'ETHUSDC-LP',
                address: '0x23c72abdf49dffc85ae3ede714f2168ad384cc67d08524732acea90df325',
                decimals: 18n,
                abi: tenKSwap_lp_abi
            } as Token,
            entryPoints: tenKSwap_lp_entrypoints,
            components: {
                tokenA: starkTokens.ETH,
                tokenB: starkTokens.USDC,
            }
        } as LpToken,
        ETHDAI: {
            dex: "10Kswap",
            token: {
                name: 'ETHDAI-LP',
                address: '0x017e9e62c04b50800d7c59454754fe31a2193c9c3c6c92c093f2ab0faadf8c87',
                decimals: 18n,
                abi: tenKSwap_lp_abi
            } as Token,
            entryPoints: tenKSwap_lp_entrypoints,
            components: {
                tokenA: starkTokens.ETH,
                tokenB: starkTokens.DAI,
            }
        } as LpToken,
        // USDTUSDC: {
        //     dex: "jediswap",
        //     token: {
        //         name: 'USDTUSDC-LP',
        //         address: '0x5801bdad32f343035fb242e98d1e9371ae85bc1543962fedea16c59b35bd19b',
        //         decimals: 18n,
        //         abi: tenKSwap_lp_abi
        //     } as Token,
        //     entryPoints: {
        //         getReserves: {
        //             name: 'getReserves',
        //             paramTypes: {}
        //         },
        //         totalSupply: {
        //             name: 'totalSupply',
        //             paramTypes: {}
        //         },
        //     },
        //     components: {
        //         tokenA: {
        //             name: 'USDC',
        //             address: '0x53c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
        //             decimals: 6n,
        //             abi: erc20_abi
        //         } as Token,
        //         tokenB: {
        //             name: 'USDT',
        //             address: '0x68f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8',
        //             decimals: 6n,
        //             abi: erc20_abi
        //         } as Token
        //     }
        // } as LpToken,
    },
    entryPoints: {
        getAmountsOut: {
            name: 'getAmountsOut',
            paramTypes: {
                amountIn: 1n,
                amountOut: 0n,
                path: ['', ''],
                toAddress: '',
                deadline: 0
            }
        },
        swapTokensForTokens: {
            name: 'swapExactTokensForTokens'
        },
        addLiquidity: {
            name: 'addLiquidity'
        },
        removeLiquidity: {
            name: 'removeLiquidity'
        }
    },
    abi: tenKSwap_abi
}
export const amms: { [key: string]: Amm } = { jediswap, tenKSwap }
