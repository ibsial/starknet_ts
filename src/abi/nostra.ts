
const nostra_abi = [
    {
      "members": [
        {
          "name": "low",
          "offset": 0,
          "type": "felt"
        },
        {
          "name": "high",
          "offset": 1,
          "type": "felt"
        }
      ],
      "name": "Uint256",
      "size": 2,
      "type": "struct"
    },
    {
      "data": [
        {
          "name": "debtToken",
          "type": "felt"
        },
        {
          "name": "optimalUtilizationRate",
          "type": "Uint256"
        }
      ],
      "keys": [],
      "name": "InterestRateConfigSetOptimalUtilizationRate",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "debtToken",
          "type": "felt"
        },
        {
          "name": "baseBorrowingRate",
          "type": "Uint256"
        }
      ],
      "keys": [],
      "name": "InterestRateConfigSetBaseBorrowingRate",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "debtToken",
          "type": "felt"
        },
        {
          "name": "rateSlope1",
          "type": "Uint256"
        }
      ],
      "keys": [],
      "name": "InterestRateConfigSetRateSlope1",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "debtToken",
          "type": "felt"
        },
        {
          "name": "rateSlope2",
          "type": "Uint256"
        }
      ],
      "keys": [],
      "name": "InterestRateConfigSetRateSlope2",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "debtToken",
          "type": "felt"
        },
        {
          "name": "generalProtocolFee",
          "type": "Uint256"
        }
      ],
      "keys": [],
      "name": "InterestRateConfigSetGeneralProtocolFee",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "debtToken",
          "type": "felt"
        },
        {
          "name": "interestBearingToken",
          "type": "felt"
        }
      ],
      "keys": [],
      "name": "InterestRateConfigSetInterestBearingToken",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "debtToken",
          "type": "felt"
        },
        {
          "name": "interestBearingCollateralToken",
          "type": "felt"
        }
      ],
      "keys": [],
      "name": "InterestRateConfigSetInterestBearingCollateralToken",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "debtToken",
          "type": "felt"
        },
        {
          "name": "lendingRate",
          "type": "Uint256"
        }
      ],
      "keys": [],
      "name": "InterestStateSetLendingRate",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "debtToken",
          "type": "felt"
        },
        {
          "name": "borrowingRate",
          "type": "Uint256"
        }
      ],
      "keys": [],
      "name": "InterestStateSetBorrowingRate",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "debtToken",
          "type": "felt"
        },
        {
          "name": "lastUpdateTimestamp",
          "type": "felt"
        }
      ],
      "keys": [],
      "name": "InterestStateSetLastUpdateTimestamp",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "debtToken",
          "type": "felt"
        },
        {
          "name": "lendingIndex",
          "type": "Uint256"
        }
      ],
      "keys": [],
      "name": "InterestStateSetLendingIndex",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "debtToken",
          "type": "felt"
        },
        {
          "name": "borrowingIndex",
          "type": "Uint256"
        }
      ],
      "keys": [],
      "name": "InterestStateSetBorrowingIndex",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "asset",
          "type": "felt"
        },
        {
          "name": "index",
          "type": "felt"
        },
        {
          "name": "collateralToken",
          "type": "felt"
        }
      ],
      "keys": [],
      "name": "CollateralDataSetCollateralToken",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "asset",
          "type": "felt"
        },
        {
          "name": "newCount",
          "type": "felt"
        }
      ],
      "keys": [],
      "name": "CollateralDataSetCollateralTokensCount",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "asset",
          "type": "felt"
        },
        {
          "name": "oldValue",
          "type": "Uint256"
        },
        {
          "name": "newValue",
          "type": "Uint256"
        },
        {
          "name": "startTime",
          "type": "felt"
        },
        {
          "name": "endTime",
          "type": "felt"
        }
      ],
      "keys": [],
      "name": "CollateralDataCollateralFactorSet",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "asset",
          "type": "felt"
        },
        {
          "name": "priceOracle",
          "type": "felt"
        }
      ],
      "keys": [],
      "name": "CollateralDataSetPriceOracle",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "debtToken",
          "type": "felt"
        },
        {
          "name": "debtTier",
          "type": "felt"
        }
      ],
      "keys": [],
      "name": "DebtDataSetDebtTier",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "debtToken",
          "type": "felt"
        },
        {
          "name": "index",
          "type": "felt"
        },
        {
          "name": "collateralToken",
          "type": "felt"
        }
      ],
      "keys": [],
      "name": "DebtDataSetWhitelistItems",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "debtToken",
          "type": "felt"
        },
        {
          "name": "newCount",
          "type": "felt"
        }
      ],
      "keys": [],
      "name": "DebtDataSetCollateralWhitelistCount",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "debtToken",
          "type": "felt"
        },
        {
          "name": "oldValue",
          "type": "Uint256"
        },
        {
          "name": "newValue",
          "type": "Uint256"
        },
        {
          "name": "startTime",
          "type": "felt"
        },
        {
          "name": "endTime",
          "type": "felt"
        }
      ],
      "keys": [],
      "name": "DebtDataDebtFactorSet",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "debtToken",
          "type": "felt"
        },
        {
          "name": "priceOracle",
          "type": "felt"
        }
      ],
      "keys": [],
      "name": "DebtDataSetPriceOracle",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "asset",
          "type": "felt"
        },
        {
          "name": "protocolFee",
          "type": "Uint256"
        }
      ],
      "keys": [],
      "name": "LiquidationSettingsSetProtocolFee",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "asset",
          "type": "felt"
        },
        {
          "name": "protocolFeeRecipient",
          "type": "felt"
        }
      ],
      "keys": [],
      "name": "LiquidationSettingsSetProtocolFeeRecipient",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "asset",
          "type": "felt"
        },
        {
          "name": "liquidatorFeeBeta",
          "type": "Uint256"
        }
      ],
      "keys": [],
      "name": "LiquidationSettingsSetLiquidatorFeeBeta",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "asset",
          "type": "felt"
        },
        {
          "name": "liquidatorFeeMax",
          "type": "Uint256"
        }
      ],
      "keys": [],
      "name": "LiquidationSettingsSetLiquidatorFeeMax",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "previousOwner",
          "type": "felt"
        },
        {
          "name": "newOwner",
          "type": "felt"
        }
      ],
      "keys": [],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "currentOwner",
          "type": "felt"
        },
        {
          "name": "newOwner",
          "type": "felt"
        }
      ],
      "keys": [],
      "name": "OwnershipProposed",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "caller",
          "type": "felt"
        },
        {
          "name": "pending_owner",
          "type": "felt"
        }
      ],
      "keys": [],
      "name": "OwnershipProposalCancelled",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "from_",
          "type": "felt"
        },
        {
          "name": "to",
          "type": "felt"
        },
        {
          "name": "value",
          "type": "Uint256"
        }
      ],
      "keys": [],
      "name": "Transfer",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "owner",
          "type": "felt"
        },
        {
          "name": "spender",
          "type": "felt"
        },
        {
          "name": "value",
          "type": "Uint256"
        }
      ],
      "keys": [],
      "name": "Approval",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "user",
          "type": "felt"
        },
        {
          "name": "amount",
          "type": "Uint256"
        }
      ],
      "keys": [],
      "name": "Mint",
      "type": "event"
    },
    {
      "data": [
        {
          "name": "user",
          "type": "felt"
        },
        {
          "name": "amount",
          "type": "Uint256"
        }
      ],
      "keys": [],
      "name": "Burn",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "debtToken",
      "outputs": [
        {
          "name": "debtToken",
          "type": "felt"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "cdpManager",
      "outputs": [
        {
          "name": "cdpManager",
          "type": "felt"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "underlyingAsset",
      "outputs": [
        {
          "name": "underlyingAsset",
          "type": "felt"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "name",
      "outputs": [
        {
          "name": "name",
          "type": "felt"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "symbol",
      "outputs": [
        {
          "name": "symbol",
          "type": "felt"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [
        {
          "name": "totalSupply",
          "type": "Uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "scaledTotalSupply",
      "outputs": [
        {
          "name": "totalSupply",
          "type": "Uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "decimals",
      "outputs": [
        {
          "name": "decimals",
          "type": "felt"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "account",
          "type": "felt"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "name": "balance",
          "type": "Uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "account",
          "type": "felt"
        }
      ],
      "name": "scaledBalanceOf",
      "outputs": [
        {
          "name": "balance",
          "type": "Uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "owner",
          "type": "felt"
        },
        {
          "name": "spender",
          "type": "felt"
        }
      ],
      "name": "allowance",
      "outputs": [
        {
          "name": "remaining",
          "type": "Uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTokenIndex",
      "outputs": [
        {
          "name": "tokenIndex",
          "type": "Uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "isCollateral",
      "outputs": [
        {
          "name": "res",
          "type": "felt"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTotalSupplyCap",
      "outputs": [
        {
          "name": "totalSupplyCap",
          "type": "Uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "isBurnable",
      "outputs": [
        {
          "name": "isBurnable",
          "type": "felt"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "name": "owner",
          "type": "felt"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "pendingOwner",
      "outputs": [
        {
          "name": "pending_owner",
          "type": "felt"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getLimitMock",
      "outputs": [
        {
          "name": "limitMock",
          "type": "felt"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "name",
          "type": "felt"
        },
        {
          "name": "symbol",
          "type": "felt"
        },
        {
          "name": "cdpManager",
          "type": "felt"
        },
        {
          "name": "isCollateral",
          "type": "felt"
        },
        {
          "name": "interestRateModel",
          "type": "felt"
        },
        {
          "name": "debtToken",
          "type": "felt"
        },
        {
          "name": "owner",
          "type": "felt"
        }
      ],
      "name": "constructor",
      "outputs": [],
      "type": "constructor"
    },
    {
      "inputs": [
        {
          "name": "class_hash",
          "type": "felt"
        }
      ],
      "name": "replaceClass",
      "outputs": [],
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "recipient",
          "type": "felt"
        },
        {
          "name": "amount",
          "type": "Uint256"
        }
      ],
      "name": "transfer",
      "outputs": [
        {
          "name": "success",
          "type": "felt"
        }
      ],
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "sender",
          "type": "felt"
        },
        {
          "name": "recipient",
          "type": "felt"
        },
        {
          "name": "amount",
          "type": "Uint256"
        }
      ],
      "name": "transferFrom",
      "outputs": [
        {
          "name": "success",
          "type": "felt"
        }
      ],
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "from_",
          "type": "felt"
        },
        {
          "name": "to",
          "type": "felt"
        },
        {
          "name": "amount",
          "type": "Uint256"
        }
      ],
      "name": "uncheckedTransferFrom",
      "outputs": [
        {
          "name": "success",
          "type": "felt"
        }
      ],
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "spender",
          "type": "felt"
        },
        {
          "name": "amount",
          "type": "Uint256"
        }
      ],
      "name": "approve",
      "outputs": [
        {
          "name": "success",
          "type": "felt"
        }
      ],
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "spender",
          "type": "felt"
        },
        {
          "name": "addedValue",
          "type": "Uint256"
        }
      ],
      "name": "increaseAllowance",
      "outputs": [
        {
          "name": "success",
          "type": "felt"
        }
      ],
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "spender",
          "type": "felt"
        },
        {
          "name": "subtractedValue",
          "type": "Uint256"
        }
      ],
      "name": "decreaseAllowance",
      "outputs": [
        {
          "name": "success",
          "type": "felt"
        }
      ],
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "callerSubAccount",
          "type": "felt"
        },
        {
          "name": "spender",
          "type": "felt"
        }
      ],
      "name": "approveAll",
      "outputs": [
        {
          "name": "success",
          "type": "felt"
        }
      ],
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "callerSubAccount",
          "type": "felt"
        },
        {
          "name": "spender",
          "type": "felt"
        },
        {
          "name": "amount",
          "type": "Uint256"
        }
      ],
      "name": "approveFromSubAccount",
      "outputs": [
        {
          "name": "success",
          "type": "felt"
        }
      ],
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "callerSubAccount",
          "type": "felt"
        },
        {
          "name": "spender",
          "type": "felt"
        },
        {
          "name": "addedValue",
          "type": "Uint256"
        }
      ],
      "name": "increaseAllowanceFromSubAccount",
      "outputs": [
        {
          "name": "success",
          "type": "felt"
        }
      ],
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "callerSubAccount",
          "type": "felt"
        },
        {
          "name": "spender",
          "type": "felt"
        },
        {
          "name": "subtractedValue",
          "type": "Uint256"
        }
      ],
      "name": "decreaseAllowanceFromSubAccount",
      "outputs": [
        {
          "name": "success",
          "type": "felt"
        }
      ],
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "recipient",
          "type": "felt"
        },
        {
          "name": "amount",
          "type": "Uint256"
        }
      ],
      "name": "mintFees",
      "outputs": [],
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "to",
          "type": "felt"
        },
        {
          "name": "amount",
          "type": "Uint256"
        }
      ],
      "name": "mint",
      "outputs": [],
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "burnFrom",
          "type": "felt"
        },
        {
          "name": "to",
          "type": "felt"
        },
        {
          "name": "amount",
          "type": "Uint256"
        }
      ],
      "name": "burn",
      "outputs": [
        {
          "name": "actualAmountBurned",
          "type": "Uint256"
        }
      ],
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "totalSupplyCap",
          "type": "Uint256"
        }
      ],
      "name": "setTotalSupplyCap",
      "outputs": [],
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "isBurnable",
          "type": "felt"
        }
      ],
      "name": "setIsBurnable",
      "outputs": [],
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "pendingOwner",
          "type": "felt"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "type": "function"
    },
    {
      "inputs": [],
      "name": "acceptOwnership",
      "outputs": [],
      "type": "function"
    },
    {
      "inputs": [],
      "name": "cancelOwnershipProposal",
      "outputs": [],
      "type": "function"
    },
    {
      "inputs": [
        {
          "name": "limitMock",
          "type": "felt"
        }
      ],
      "name": "setLimitMock",
      "outputs": [],
      "type": "function"
    }
  ]

export const nostra = {
    address: '0x057146f6409deb4c9fa12866915dd952aa07c1eb2752e451d7f3b042086bdeb8',
    abi: nostra_abi
} 
