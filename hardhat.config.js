require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("hardhat-gas-reporter");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    goerli: {
      url: process.env.GOERLI_URL, // URL of the Goerli node (e.g., Infura or Alchemy)
      accounts: [process.env.PRIVATE_KEY], // Private key of the deployer wallet
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true", // Enable gas reporting if REPORT_GAS=true
    currency: "USD",
  },
};