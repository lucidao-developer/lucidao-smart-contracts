import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";
import "solidity-coverage";
import { isDevelopment, myDotenvConfig } from "./scripts/utilities";

myDotenvConfig();

const chainIds = {
  ganache: 1337,
  hardhat: 31337,
  bscTestnet: 97,
  bscMainnet: 56,
  ftmTestnet: 4002,
  ftmMainnet: 250
};

let mnemonic: string;

if (!process.env.MNEMONIC) {
  throw new Error("Please set your MNEMONIC in the .env file");
} else {
  mnemonic = process.env.MNEMONIC;
}

let actualScanApiKey: string;

let ftmscanApiKey: string;

if (!process.env.FTMSCAN_API_KEY) {
  throw new Error("Please set your FTMSCAN_API_KEY in the .env file");
} else {
  ftmscanApiKey = process.env.FTMSCAN_API_KEY;
  actualScanApiKey = ftmscanApiKey;
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
    testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: chainIds.bscTestnet,
      accounts: { mnemonic: mnemonic },
      gas: "auto",
      gasPrice: "auto",
      gasMultiplier: 2
    },
    mainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: chainIds.bscMainnet,
      accounts: { mnemonic: mnemonic }
    },
    ftmTestnet: {
      url: "https://rpc.testnet.fantom.network/",
      chainId: chainIds.ftmTestnet,
      accounts: { mnemonic: mnemonic },
    },
    ftmMainnet: {
      url: "https://rpc.ftm.tools",
      chainId: chainIds.ftmMainnet,
      accounts: { mnemonic: mnemonic },
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: actualScanApiKey
  }
};

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("ftmscan", "validate smart contract on ftmscan", async (args, hre) => {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying account: ${deployer.address}`);

  await hre.run("verify: verify", {
    address: deployer.address
  })
});

if (isDevelopment()) {
  // let onMainnet = false;
  let deployingAnonymizedContractsScript = process.env.npm_lifecycle_script?.indexOf('anonymizeDeployEverything');

  // process.argv.forEach(param => {
  //   if(param.toLowerCase().indexOf('mainnet')>-1){
  //     onMainnet = true;
  //   }
  // });

  if (deployingAnonymizedContractsScript && deployingAnonymizedContractsScript > -1) {
    config.paths = {
      sources: "./anonymized-contracts",
    };
  };
}

console.log(`Contracts Path: ${config.paths ? config.paths.sources : "contracts"}`);
export default config;
