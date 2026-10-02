require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Local development network (npx hardhat node)
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    // Polygon Amoy Testnet (official active Polygon testnet, free faucet tokens available)
    amoy: {
      url: process.env.POLYGON_RPC_URL || "https://rpc-amoy.polygon.technology",
      accounts: process.env.SERVER_WALLET_PRIVATE_KEY
        ? [process.env.SERVER_WALLET_PRIVATE_KEY]
        : [],
      chainId: 80002,
    },
    // Polygon Mainnet
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.SERVER_WALLET_PRIVATE_KEY
        ? [process.env.SERVER_WALLET_PRIVATE_KEY]
        : [],
      chainId: 137,
    },
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
