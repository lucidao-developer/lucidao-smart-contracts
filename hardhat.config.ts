import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomicfoundation/hardhat-chai-matchers";
import { isDevelopment, myDotenvConfig, usingAnonymizedScriptsAndContracts } from "./scripts/utilities";

myDotenvConfig();

const chainIds = {
  ganache: 1337,
  hardhat: 31337,
  bscTestnet: 97,
  bscMainnet: 56,
  ftmTestnet: 4002,
  ftmMainnet: 250,
  polygonTestnet: 80001,
  polygonMainnet: 137
};

let mnemonic: string;
let ftmscanApiKey: string;
let polygonscanApiKey: string;

if (!process.env.MNEMONIC) {
  throw new Error("Please set your MNEMONIC in the .env file");
} else {
  mnemonic = process.env.MNEMONIC;
}

if (!process.env.FTMSCAN_API_KEY || !process.env.POLYGONSCAN_API_KEY) {
  throw new Error("Please set your FTMSCAN_API_KEY or POLYGONSCAN_API_KEY in the .env file");
} else {
  ftmscanApiKey = process.env.FTMSCAN_API_KEY;
  polygonscanApiKey = process.env.POLYGONSCAN_API_KEY;
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: {
        enabled: true
      }
    }
  },
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      accounts: {
        mnemonic: mnemonic,
        accountsBalance: "90000000000000000000000",
        count: 30
      },
      chainId: chainIds.hardhat,
      gas: 950000000,
      blockGasLimit: 950000000,
      allowUnlimitedContractSize: true
    },
    hardhat: {
      accounts: {
        mnemonic: mnemonic,
        accountsBalance: "90000000000000000000000",
        count: 70
      },
      chainId: chainIds.hardhat,
      gas: 950000000,
      blockGasLimit: 950000000,
      allowUnlimitedContractSize: true
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: chainIds.bscTestnet,
      accounts: { mnemonic: mnemonic }
    },
    bscMainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: chainIds.bscMainnet,
      accounts: { mnemonic: mnemonic }
    },
    ftmTestnet: {
      url: "https://rpc.testnet.fantom.network/",
      chainId: chainIds.ftmTestnet,
      accounts: { mnemonic: mnemonic }
    },
    ftmMainnet: {
      url: "https://rpc.ftm.tools",
      chainId: chainIds.ftmMainnet,
      accounts: { mnemonic: mnemonic }
    },
    polygonTestnet: {
      url: "https://rpc-mumbai.matic.today",
      chainId: chainIds.polygonTestnet,
      accounts: { mnemonic: mnemonic }
    },
    polygonMainnet: {
      url: "https://polygon-mainnet.g.alchemy.com/v2/m3xtNtrx_GcL6YFbGmfuQVlwHQCBKdSc",
      chainId: chainIds.polygonMainnet,
      accounts: { mnemonic: mnemonic },
      gasMultiplier: 3,
      gas: 3000000
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      opera: ftmscanApiKey,
      ftmTestnet: ftmscanApiKey,
      polygon: polygonscanApiKey,
      polygonMumbai: polygonscanApiKey
    }
  }
};

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("etherscan", "validate smart contract on block explorer", async (args, hre) => {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying account: ${deployer.address}`);

  await hre.run("verify: verify", {
    address: deployer.address
  })
});

if (isDevelopment()) {
  // let onMainnet = false;
  let anonymizedScript = usingAnonymizedScriptsAndContracts();

  // process.argv.forEach(param => {
  //   if(param.toLowerCase().indexOf('mainnet')>-1){
  //     onMainnet = true;
  //   }
  // });

  if (anonymizedScript) {
    config.paths = {
      sources: "./anonymized-contracts",
    };
  };
}

console.log(`Contracts Path: ${config.paths ? config.paths.sources : "contracts"}`);
export default config;
