## Запуск

`npm run serve` - запустится цикл с объемом (свапалки, zklend, nostra)  
`npm run cheap` -  Запустится бомж скрипт  
`npm run generate *seed_amount* *wallets_per_seed*` - запустится генератор кошельков  
`npm run restore *wallets_per_seed*` - восстановит адреса и приватники из сидов в файле seeds.txt  
**Для запуска через приватники см. пункт про смену и запуск с приватниками**

## О смене приватников и запуске кошельков с приватниками
Для запуска нужно указать кошельки в таком формате:
`address,valid_key,compromised_key(?)`
- address - Адрес кошелька
- valid_key - Ключ, на который хотите сменить текущий (Если же запускаете просто скрипт не для смены, указывайте текущий)
- compromised_key - Ключ, который в кошельке сейчас и вы хотите его сменить (После успешной смены его можно будет удалить и не использовать)  

> Важно! При этом нужно обязательно хранить адрес!

Как работает скрипт:
1. Смотрит какой ключ установлен сейчас
2. Сравнивает этот ключ с теми, что заданы пользователем
3. Обновляет кошелек до Cairo 1.0
4. При необходимости меняет ключ на указанный

### Запуск:  
Так же, как и обычный скрипт, но нужно добавить keys в конце:  
- npm run serve keys
- npm run cheap keys

> **Пока что скрипт смены не тестировался на многих кошельках, используйте с осторожностью**

## О дешевом скрипте:
Настройка происходит в этих параметрах:  
`export const maxCount = [2, 5] ` - здесь задаётся сколько кошелек сделает транзакций  
в следующих настройках указывается количество конкретных модулей. Например, можно поставить везде нули кроме dmail и будет делаться только он.  
```
export const modulesCount: {[key: string]: number[]} = { 
    mintStarknetId: [1, 3],
    mintStarkverseGenesisNft: [1,3],
    unframedBidNCancel: [0,2], // bid + cancel = 2 tx
    zkLendAllowOrDisable: [1,2],
    sendDmail: [2,4],
}
```

Также можно выводить с окекса напрямую в старкнет (`need_withdraw = true, network: "starknet"`).  
Если кошельки чистые, **вайтлистить надо cairo v1 кошельки**. Они сразу будут деплоиться с cairo v1 версией.  
Если кошельки старые и с cairo v0, вайтлистить надо существующие адреса, скрипт обновит кошелек до v1 версии.  

Запуск дешевого круга: `npm run cheap`  

## О круговом скрипте:
Этот скрипт гоняет средства okx -> wallet -> okx.  
Можно включить вывод с OKX в сеть Ethereum и Starknet. Для этого настройте okx_config.
> В случае вывода в сеть Ethereum, надо включить мост в eth_bridge config. Также не забудьте заполнить приватники. Amount to leave можно оставлять 0, скрипт постарается вывести весь баланс.  

> Если вы напрямую выводите в Starknet, не забудьте отключить eth_bridge  

> Можно отключить депозит на биржу по завершению работы с кошельком. Для этого настройте need_deposit в circle_config (поставив false)

Модули в старкнете:
- свапы: eth --> token --> addLP --> removeLP --> eth
- zklend: deposit --> withdraw  
- nostra: deposit --> withdraw  

Между "круговыми" транзакциями скрипт иногда делает дешевые. Если не хотите этого, задайте везде нули в конфиге. **Параметр `maxCount` в этом случае не имеет значения.**  


После установки скрипта пропишите: `npm i`  
- создайте `config.ts`, `okx_addresses.txt`, `eth_privates.txt`, `seeds.txt`  
- заполните эти файлы по указанному формату  
- задать данные от акка окекса в конфиге (даже если не нужно)  
- настроить остальные данные в конфиге  

#### Прогоняйте сначала немного, чтобы убедиться в корректности настроек и работы скрипта
запуск:  
`npm run serve`

## О получении кошельков
- `npm run generate *seed_amount* *wallets_per_seed*`  
    *seed_amount* - количество сидов, которое нужно сгенерировать
    *wallets_per_seed* - количество кошельков на один сид. Можно не указывать и будет создаваться 1  

    Примеры вызова:  
    `npm run generate 10 10` - создаст 10 сидов и на каждый 10 кошельков. Суммарно 100 кошельков  
    `npm run generate 10` - создаст 10 сидов и на каждый 1 кошелек. Суммарно 10 кошельков  
- `npm run restore *wallets_per_seed*`  
    Функция чтобы получить адреса из уже имеющихся сидов  
    *wallets_per_seed* - количество кошельков на один сид. Можно не указывать и будет создаваться 1  
    
    Примеры вызова:  
    `npm run restore 10` - восстановит 10 кошельков на каждый сид  
    `npm run restore` - восстановит 1 кошелек на каждый сид  

#### О формате мнемоников, приватников и индексов  
Я рассматриваю 2 варианта:
1. все кошельки сделаны на один мнемоник. Тогда задаем мнемоник для старкнета, приватник от адреса эфира, индекс аккаунта старкнета.  
Например, хочу сделать пятый аккаунт. Тогда данные выглядят так:
    - файл seeds.txt: `mnemonic,4` (тк начинаем с нуля)
    - файл eth_privates.txt `prv_key_5`
    - файл okx_addresses.txt `okx_STARKNET_address`

2. Все кошельки сделаны на разные мнемоники. Тогда можно задать:  
    - файл seeds.txt: `mnemonic,`
    - файл eth_privates.txt `prv_key_5` (но можно и не указывать, если акк сделан на эту же фразу)
    - файл okx_addresses.txt `okx_STARKNET_address`

В начале работы программа соберет введенные данные в файл combined.csv. Скрипт можно остановить, убедиться, что всё прочиталось как надо и запустить снова. Открывать файл можно через эксель, и разбить по столбцам выбрав разделителем "," 


## Замечения и комментарии
> **Этот скрипт работает с checksum адресами**, то есть теми, что используются в Argent и эксплорерах. Если у вас кошельки не checksum, вывести с окекса не получится.
