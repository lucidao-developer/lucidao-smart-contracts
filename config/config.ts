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
export const releaseTime = 1673704800;

let preSaleRate = "135";
let publicSaleRate = "83";
let preSaleStartTime = 1640784000;
let publicSaleStartTime = 1641391200;
let closingTime = 1642168800;
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

export const fantomwhitelistedAddresses: string[] = ["0x197856DACD1e21FbdA8D5066bA39E72e9369F7a4", "0x5E49a561b35d6867d98D67B702C3b7946edeF044", "0xe015296FAC267DC178ecEAEF923df463D368Cbf8", "0xcC09302E44561cA0252dF0BC1CBaab94799E528e", "0x81ED721B2bCa42578002cE44DED3a33F199A8460", "0x734bed8FF54f43FC6E2F3C26adCB25A316fc87a4", "0x8b61d3E1e581a47Cd05d8b36e500Cca2eE6E487D", "0x2BB013173c651Bc1EbEc17703826b73A03c6A0a7", "0x0Dab2522d9db8a6a67116844C6819015102dC6c4", "0x70034DAcac82df55B5fb149abE29246321b3318c", "0x8f7e084F3895e185a5D2B53812933EDF50B22fD1", "0x68fd0946426A3CE0F46169D72c54132F229c883C", "0x9F526B194AEFfd1C77A6Af534C672B2DcC5a18b7", "0x0783Fc74B9E911E903bB023F5363065e3071E439", "0x7B747029136eBFAbCaE12EB3e8BFF88fBa05242f", "0xb758B94f90C30b6B7c161d21417273165050716c", "0xdc675c91B969552c56b577eC40199d94a3CE8eC7", "0xA3327Dc7DD6AD37C7e2540bEA397486BA6F7EF62", "0x69E3Aab0a59DdB33B44BE9aD800f8EBb92575239", "0x1C2614059e7Fd8b8c7E8D6AE3B4DF50a837dF0B9", "0x705fB80D7567639565307d58C8DaeD1012Af2853", "0x7976E2060c038B314a0494645efe34e3B9464688", "0x32D6a707A319CB3Dc536d8E3662D46286845C0ba", "0xf3f339c8Ccb0BA78067485238eD7208824fFa9E9", "0xdcB6F7Cd258bF91b7A944E6469E3C45b4fd0CBdb", "0x32bDbcE44Ac24b30d5C3a5fC6e19C751249f8107", "0x41651d7c50e6Bc9f833e72C5FAF6E5Ae3a381D7E", "0x07Ff3aEcb182857f2B2C9336059CfC548658C58c", "0x0701D43e42402e024f7F13ceb57891675657cC98", "0x087914212973Ec83bD9F2201541600cef792aB87", "0x61A0ebea0deD339B648EC0F98395a8a63B9C0257", "0x52ca44211Ff36a3625C594BB8f949D169E5427eD", "0xb9F727eF758DD3ab9Edd55F34eDF5eD8a0EeC2C6", "0x0e309fD058af54Ed76A73A6C03479030c8a0f3DF", "0x8a2ea6518d090c6B0e8D2F7F177046C2F88aA982", "0x017De4d84a7BE24e6fF07137C06e93053FeAf9ED", "0x7ac9A9567AB73126560A587FC13c50eB6cFe3e6B", "0x783fcB999675C8045ecb7d4EF9f9B6F5d17a661b", "0x4ff49d89e025586A32036E60e59c26e5902c07b7", "0x1cdbC61cEE8996ef4947CF39107c12598E0882A3", "0x0F491E2F16A75Ad19CFae800bd71190DA79599d8", "0xfab418dA326315356E2033418E2d3a53378A8930", "0xff3a3b1eC09Ad45FC00AD053477f0aF5Ea3ad44D", "0xBc3ed9BdB07607952166dEe5DC6984d02C132b42", "0xD91f779F4Eb93bED525ABEaa547e0820Fa1a0449", "0xE8a0fd3F7e3b1a22167A2EEd7C19f94A6a217Ae9", "0x281bFE357F61ff200Fed1dbaaA1Be192817E6114", "0x5e410C4e9CD2c118127D0BaeE3f372196Eb922dF", "0xF4D0437715BEafC1F658ec60B2CeF6994B4Eba3F", "0xDa19cB8209e40728F7e5c3b38B3E99Aa1eA58597", "0x872eaBe7b54b6e1017D9DeDE01a76133e3f1720a", "0x2E9f30f78D62715f5b6bDd0102d03A0034Cbcc7B"];

export const usdtToMintForAddress = "200000";

export const fantomMainnetfUsdtAddress = "0x049d68029688eabf473097a2fc38ef61633a3c7a";

export const fantomLiquidityVaultAddress = "0x6270B1D09c8e9ED2bB382FFe4c5aB6494BcE75e0";

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