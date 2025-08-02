# Contract Integration Documentation

## Overview

This document describes how the Maze, Plinko, and Snakes & Ladders games are now connected to the Mines smart contract for blockchain transactions.

## Smart Contract

The games use the `Mines.sol` contract which provides the following functionality:

- **bet()**: Accepts ETH deposits for betting
- **sendEtherFromContract()**: Allows cashing out winnings
- **getContractBalance()**: Returns the contract's current balance
- **Events**: BetPlaced and CashoutSuccessful for transaction tracking

## Contract Manager

A shared `ContractManager` class (`src/contract_data/contract-utils.js`) handles all blockchain interactions:

### Key Features:
- **Wallet Connection**: Automatically connects to MetaMask and switches to Monad testnet
- **Bet Placement**: Sends ETH to the contract when starting games
- **Cashout**: Processes winnings back to the player's wallet
- **Balance Checking**: Monitors both player and contract balances
- **Network Management**: Ensures connection to Monad network

### Methods:
- `initialize()`: Connect wallet and setup contract instance
- `placeBet(amount)`: Place a bet with specified ETH amount
- `cashout(amount)`: Cashout winnings to player's wallet
- `getContractBalance()`: Get current contract balance
- `getAccountBalance()`: Get player's wallet balance
- `checkNetwork()`: Verify connection to Monad network

## Game Integration

### Maze Game
- **Betting**: Players place bets before starting the maze challenge
- **Payout**: Winners receive payouts based on time limit and difficulty
- **Multipliers**: 6x to 20x rewards based on time constraints

### Plinko Game
- **Betting**: Total bet = bet amount × number of balls
- **Payout**: Winnings calculated based on where balls land
- **Risk Levels**: Low, Medium, High with different multiplier distributions

### Snakes & Ladders Game
- **Betting**: Fixed bet amount for each game
- **Payout**: 5x multiplier for winning (reaching position 100 first)
- **Gameplay**: Turn-based dice rolling with snakes and ladders

### Hangman Game
- **Betting**: Players place bets before starting the word guessing challenge
- **Payout**: Multipliers based on difficulty (Easy: 1.5x, Medium: 2.5x, Hard: 4x)
- **Gameplay**: Guess crypto-themed words with 6 wrong attempts allowed

## Transaction Flow

1. **Wallet Connection**: Player connects MetaMask wallet
2. **Network Switch**: Automatically switches to Monad testnet
3. **Bet Placement**: ETH sent to contract when game starts
4. **Game Execution**: Player plays the game
5. **Result Processing**: Game determines win/loss
6. **Payout**: Winners receive ETH from contract

## Error Handling

- **Network Issues**: Automatic network switching with fallback
- **Transaction Failures**: User-friendly error messages
- **Wallet Disconnection**: Graceful handling of wallet changes
- **Insufficient Funds**: Clear feedback on balance requirements

## Testing

Use the test script in browser console:
```javascript
// Import and run tests
import('./src/contract_data/test-contract.js').then(module => {
  module.default();
});
```

## Security Features

- **Input Validation**: All amounts validated before transactions
- **Network Verification**: Ensures correct network connection
- **Transaction Confirmation**: Waits for blockchain confirmations
- **Error Recovery**: Graceful handling of failed transactions

## Network Configuration

The integration uses Monad testnet by default:
- **Chain ID**: 10143 (0x279F)
- **RPC URL**: https://rpc.testnet.monad.xyz
- **Explorer**: https://explorer.testnet.monad.xyz

## Usage Example

```javascript
// Initialize contract manager
const result = await contractManager.initialize();

// Place a bet
await contractManager.placeBet(0.01); // 0.01 ETH

// Cashout winnings
await contractManager.cashout(0.05); // 0.05 ETH

// Check balances
const accountBalance = await contractManager.getAccountBalance();
const contractBalance = await contractManager.getContractBalance();
```

## Troubleshooting

### Common Issues:
1. **MetaMask not detected**: Install MetaMask extension
2. **Wrong network**: Contract automatically switches to Monad testnet
3. **Insufficient balance**: Ensure wallet has enough ETH for betting
4. **Transaction pending**: Wait for blockchain confirmation

### Debug Commands:
```javascript
// Check connection status
contractManager.getConnectionStatus();

// Check network
contractManager.checkNetwork();

// Get balances
contractManager.getAccountBalance();
contractManager.getContractBalance();
``` 