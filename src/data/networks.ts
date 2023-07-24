import { Chain } from "../interfaces/Types";
export const ethereum: Chain = {
    name: "ETH",
    explorer: {
        base: "https://etherscan.io/",
        tx: "https://etherscan.io/tx/",
        address: "https://etherscan.io/address/",
    },
    url: "https://eth-mainnet.g.alchemy.com/v2/yYnYHf2mCXCRDlDW0LDTVYxhxh2qNIs8"
};
export const starknet: Chain = {
    name: "STRK",
    explorer: {
        base: "https://starkscan.co/",
        tx: "https://starkscan.co/tx/",
        address: "https://starkscan.co/contract/",
    },
    url: "",
};
