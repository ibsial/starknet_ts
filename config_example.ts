// можно задать любое названиие вашей консоли
process.title = "Best starknet script" // если не нужно, закомментируйте  или оставьте как есть
export const tg_token = '123:aaa'
export const tg_id = 0

export const max_retries = 15
export const max_wait_time = 20 * 60 // максмальное время ожидания на мосте
// задержка между действиями одного кошелька
export const action_sleep_interval = [3 * 60, 5 * 60] // в секундах

export const wallet_sleep_interval = [30 * 60, 60 * 60] // в секундах
export const good_gwei = 25 // ограничитель гвея

export const okx_config = {
    need_withdraw: true,
    network: "starknet", // "starknet" or "eth"
    amount_from: "0.002",
    amount_to: "0.003",

    fee: '0.0001', // starknet: 0.0001 Eth: 0.000344
    apiKey: '',
    apiSecret: '',
    password: ''
}
export const eth_bridge = {
    need_bridge: false,
    // сколько хотите оставить в мейннете
    amount_to_leave_from: '0.003',
    amount_to_leave_to: '0.0035'
}
// настройка дешевого скрипта
export const modulesCount: {[key: string]: number[]} = {
    mintStarknetId: [3, 10],
    mintStarkverseGenesisNft: [1,5],
    unframedBidNCancel: [3,6], // bid + cancel = 2 tx
    zkLendAllowOrDisable: [3,7],
    sendDmail: [2,8],
}
// настройка кругового, дорогого скрипта
export const circle_config = {
    // circle:
    // eth -rand_dex-> token -rand_dex-> add lp -->
    // --> remove LP -rand_dex-> new token -->...
    circles_count: [1, 2],
    tokens: [
        'USDC',
        'USDT',
        'DAI'
    ],
    dex: [
        'jediswap',
        'tenKSwap',
        'avnu',
        // 'myswap', // пока что нет
    ],
    // какую долю эфира свапаем в процессе. Не забываете n в конце чисел
    // пока что не советую менять
    swap_percent: [5n, 20n],
    // сколько оставить в старкнете после вывода на окекс
    amount_to_leave_from: '0.007',
    amount_to_leave_to: '0.009',
    // Можно разделить отправление на биржу на несколько случайных частей
    // чтобы этого не делать, ставьте [1,1]
    split_transfer: [2, 4],
    // когда скрипт кидает эфир на окекс, нужно ли его ждать?
    // если средств с запасом, можно и не ждать
}
