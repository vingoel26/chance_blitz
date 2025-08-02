// filepath: c:\Users\vedan\OneDrive\Desktop\hardhat starter\hardhat.config.js
require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  paths:{
    sources:"./contracts",
    tests:"./test",
    cache:"./cache",
    artifacts:"./artifacts"
  },
  networks:{
    hardhat:{
      chainId:1337
    },
    sepolia:{
      url:"https://eth-sepolia.g.alchemy.com/v2/8M-A8S59VNodqtUAIom94hhtunRlqYHF",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    // Monad Testnet
    monad_testnet: {
      url: "https://testnet-rpc.monad.xyz",
      chainId: 10143,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    // Monad Mainnet (when available)
    monad_mainnet: {
      url: "https://rpc.monad.xyz",
      chainId: 1338,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
};