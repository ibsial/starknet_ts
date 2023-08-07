// можно задать любое названиие вашей консоли
process.title = "Best starknet script" // если не нужно, закомментируйте
export const tg_token = 'number_string:SomE-SYmboL-String'
export const tg_id = 123456 // your id

export const max_retries = 5
// задержка между действиями одного кошелька
export const action_sleep_interval = [3 * 60, 5 * 60] // в секундах
// не ставьте задержку между аккаунтами меньше 10-15 минут, тк не будет выводить
export const wallet_sleep_interval = [10 * 60, 20 * 60] // в секундах
export const good_gwei = 30 // ограничитель гвея

export const okx_config = {
    need_withdraw: true,
    amount_from: "0.1",
    amount_to: "0.15",

    // фи можно сделать и меньше, но не ручаюсь, что окекс не спалит
    fee: '0.0005',
    apiKey: '',
    apiSecret: '',
    password: ''
}
export const eth_bridge = {
    need_bridge: true,
    // сколько хотите оставить в мейннете
    amount_to_leave_from: '0.003',
    amount_to_leave_to: '0.0035'
}

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
    // не советую 45n, тк мы добавляем много ликвидности
    // 20n можно поменять на 30n-35n
    swap_percent: [20n, 45n],
    // сколько оставить в старкнете после вывода на окекс
    amount_to_leave_from: '0.0075',
    amount_to_leave_to: '0.01',
    // Можно разделить отправление на биржу на несколько случайных частей
    // чтобы этого не делать, ставьте [1,1]
    split_transfer: [2, 4],
    // когда скрипт кидает эфир на окекс, нужно ли его ждать?
    // если средств с запасом, можно и не ждать
}

