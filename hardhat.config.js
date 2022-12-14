require('dotenv').config();
const PRIVATE_KEY = process.env.PRIVATE_KEY || "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const ALCHEMY_MAINNET_KEY = process.env.ALCHEMY_MAINNET_KEY;
const ALCHEMY_MUMBAI_KEY = process.env.ALCHEMY_MUMBAI_KEY;


require("hardhat-tracer");
require("@nomiclabs/hardhat-truffle5");
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {

  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      accounts: [{privateKey:"ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", balance:"10000000000000000000000"},
                 {privateKey:"59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", balance:"10000000000000000000000"},
                 {privateKey:"5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", balance:"10000000000000000000000"},
                 {privateKey:"7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", balance:"10000000000000000000000"},
                 {privateKey:"47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a", balance:"10000000000000000000000"},
                 {privateKey:"8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba", balance:"10000000000000000000000"},
                 {privateKey:"92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e", balance:"10000000000000000000000"},
                 {privateKey:"4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356", balance:"10000000000000000000000"}]
    },
    mumbai: {
      gasLimit: 60000000000,
      url: "https://polygon-mumbai.g.alchemy.com/v2/"+ALCHEMY_MUMBAI_KEY,
      accounts: [PRIVATE_KEY]
    },
    matic: {
      gasPrice: 220_000_000_000,
      gasLimit: 60_000_000_000,
      url: "https://polygon-rpc.com",
      accounts: [PRIVATE_KEY]
    },
    goerli: {
      gasPrice: 1000000000,
      gasLimit: 60000000000,
      url: "https://goerli.prylabs.net",
      accounts: [PRIVATE_KEY]
    },
    mainnet: {
      gasPrice: 21_000_000_000,
      gasLimit: 60000000000,
      url: "https://eth-mainnet.g.alchemy.com/v2/"+ALCHEMY_MAINNET_KEY,
      accounts: [PRIVATE_KEY]
    }
  },
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 20000
  }

};
