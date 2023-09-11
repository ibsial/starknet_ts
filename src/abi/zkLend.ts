export const zkLend = {
    address: '0x04c0a5193d58f74fbace4b74dcf65481e734ed1714121bdc571da345540efa05',
    abi: [
        {
            name: 'is_collateral_enabled',
            type: 'function',
            inputs: [
                {
                    name: 'user',
                    type: 'felt'
                },
                {
                    name: 'token',
                    type: 'felt'
                }
            ],
            outputs: [
                {
                    name: 'enabled',
                    type: 'felt'
                }
            ],
            stateMutability: 'view'
        },
        {
            name: 'enable_collateral',
            type: 'function',
            inputs: [
                {
                    name: 'token',
                    type: 'felt'
                }
            ],
            outputs: []
        },
        {
            name: 'disable_collateral',
            type: 'function',
            inputs: [
                {
                    name: 'token',
                    type: 'felt'
                }
            ],
            outputs: []
        }
    ]
}
