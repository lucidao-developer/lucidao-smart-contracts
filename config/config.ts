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
    luciDaoGovernanceReserveAddress: string
    luciDaoVisionProposalsAddress: string
    luciDaoVestingTreasuryAddress: string
    luciDaoPublicSaleAddress: string
    luciDaoPreSaleAddress: string
    luciDaoLiquidityAddress: string
    airdropManagerAddress: string
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

export type DeployTx = {
    nonce: string;
    address: string;
}

// Contract address configuration
export const luciDaoTokenAddress = process.env.luciDaoTokenAddress;
export const timelockAddress = process.env.timelockAddress;
export const luciDaoGovernanceProxy = process.env.luciDaoGovernanceProxy;
export const luciDaoGovernanceImpl = process.env.luciDaoGovernanceImpl;
export const luciDaoGovernanceReserveAddress = process.env.luciDaoGovernanceReserveAddress;
export const luciDaoVisionProposalsAddress = process.env.luciDaoVisionProposalsAddress;
export const luciDaoVestingTreasuryAddress = process.env.luciDaoVestingTreasuryAddress;
export const airdropManagerAddress = process.env.airdropManagerAddress;
export const luciDaoLiquidityAddress = process.env.luciDaoLiquidityAddress;

// Contract parameters
export const releaseTime = 1673704800;

//On Polygon: avg block time 2.19s
let votingDelay = "19726"; //12H
let votingPeriod = "118356"; //3gg
let timelockDelay = 14400;  // 4 hours

if (isDevelopment()) {
    votingDelay = "333";
    votingPeriod = "2000";
    timelockDelay = 60;
}

export const timelockMinDelayInSeconds = timelockDelay;

export const totalSupply = "880000000";

export const lcdAllocations = {
    governanceReserve: "580800000",
    governanceReserveAfterInstitutionalSale: "554400000",
    vestingTreasury: "88000000"
}

export const governance = {
    proposalThreshold: "8800000",
    quorumNumerator: "4",
    quorumDenominator: "100",
    votingDelay: votingDelay,
    votingPeriod: votingPeriod,
}

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const PROPOSER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PROPOSER_ROLE"));
export const EXECUTOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EXECUTOR_ROLE"));
export const TIMELOCK_ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
export const CANCELLER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("CANCELLER_ROLE"));
