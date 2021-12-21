import { ethers } from 'hardhat';
import { isDevelopment, myDotenvConfig } from '../scripts/utilities';

interface IProcessEnv {
    MNEMONIC: string
    BSCSCAN_API_KEY: string
    FTMSCAN_API_KEY: string
    luciDaoTokenAddress: string
    timelockAddress: string
    luciDaoGovernanceProxy: string
    luciDaoGovernanceImpl: string
    liquidityTokenAddress: string
    luciDaoGovernanceReserveAddress: string
    luciDaoVestingTreasuryAddress: string
    luciDaoPublicSaleAddress: string
    luciDaoPreSaleAddress: string
}

declare global {
    namespace NodeJS {
        interface ProcessEnv extends IProcessEnv { }
    }
}

myDotenvConfig();

export enum ProposalState {
    Pending,
    Active,
    Canceled,
    Defeated,
    Succeeded,
    Queued,
    Expired,
    Executed
}

export enum Votes {
    Against = "0",
    For = "1",
    Abstain = "2"
}

// Contract address configuration
export const luciDaoTokenAddress = process.env.luciDaoTokenAddress;
export const timelockAddress = process.env.timelockAddress;
export const luciDaoGovernanceProxy = process.env.luciDaoGovernanceProxy;
export const luciDaoGovernanceImpl = process.env.luciDaoGovernanceImpl;
export const liquidityTokenAddress = process.env.liquidityTokenAddress;
export const luciDaoGovernanceReserveAddress = process.env.luciDaoGovernanceReserveAddress;
export const luciDaoVestingTreasuryAddress = process.env.luciDaoVestingTreasuryAddress;
export const luciDaoPublicSaleAddress = process.env.luciDaoPublicSaleAddress;
export const luciDaoPreSaleAddress = process.env.luciDaoPreSaleAddress;

// Contract parameters
export const timelockMinDelayInSeconds = 14400; // 4 hours
export const releaseTime = Math.ceil(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).getTime() / 1000);

let preSaleRate = "135";
let publicSaleRate = "83";
let preSaleStartTime = 1640070000;
let publicSaleStartTime = 1640818799;
let closingTime = 1641801600;
let usdForLiquidityTmp = "528000";
let votingDelay = "50233";
let votingPeriod = "301398";

if (isDevelopment()) {
    preSaleRate = "2500";
    publicSaleRate = "384";
    preSaleStartTime = Math.round((new Date().getTime() + (1000 * 60 * 10)) / 1000);
    publicSaleStartTime = Math.round((new Date().getTime() + (1000 * 60 * 15)) / 1000);
    closingTime = Math.round((new Date().getTime() + (1000 * 60 * 20)) / 1000);
    usdForLiquidityTmp = "10000";
    votingDelay = "1000";
    votingPeriod = "6000";
}

export const preSale = {
    rate: preSaleRate,
    maxAmountSpendable: "15000",
    startTime: preSaleStartTime,
    endTime: closingTime
}

export const publicSale = {
    rate: publicSaleRate,
    maxAmountSpendable: "60000",
    startTime: publicSaleStartTime,
    endTime: closingTime
}

export const totalSupply = "880000000";

export const usdtForLiquidity = usdForLiquidityTmp;

export const lcdAllocations = {
    governanceReserve: "580800000",
    vestingTreasury: "88000000",
    liquidityVault: "35200000",
    preSale: "75000000",
    publicSale: "101000000",
}

export const governance = {
    proposalThreshold: "8800000",
    quorumNumerator: "4",
    quorumDenominator: "100",
    votingDelay: votingDelay,
    votingPeriod: votingPeriod,
}

export const fantomwhitelistedAddresses: string[] = [];

export const usdtToMintForAddress = "200000";

export const fantomMainnetfUsdtAddress = "0x049d68029688eabf473097a2fc38ef61633a3c7a";

export const fantomLiquidityVaultAddress = "";

export async function GetLiquidityVaultAddress(): Promise<string> {
    if (isDevelopment()) {
        //let moduleName = "config.dev.ts"
        const [_, liquidityVault] = await ethers.getSigners();
        console.log(`Using Test LiquidityVaultAddress...{liquidityVault.address}`)
        return liquidityVault.address;
    }
    return fantomLiquidityVaultAddress;
}

export async function GetWhitelistedAddresses(): Promise<string[]> {
    if (isDevelopment()) {
        let whitelistedAddress1 = process.env.whitelistedAddress1;
        let onMainnet = false;
        process.argv.forEach(param => {
            //FIXME: check if ftmMainnet?
            if (param.toLowerCase().indexOf('mainnet') > -1) {
                onMainnet = true;
            }
        });

        const [deployer, _, white1, white2] = await ethers.getSigners();
        let devWhiteListedAddresses: string[] = [deployer.address, white1.address, white2.address];

        if (onMainnet && whitelistedAddress1) {
            devWhiteListedAddresses = devWhiteListedAddresses.concat([whitelistedAddress1])
        }

        console.log(`Using Dev whitelisted Addresses...`)
        return devWhiteListedAddresses;
    }
    return fantomwhitelistedAddresses;
}