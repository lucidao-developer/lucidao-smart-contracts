import { ethers } from "hardhat";
import { GetLiquidityVaultAddress, GetWhitelistedAddresses } from "../config/config";
import { deployLuciDao, deployLuciDaoGovernanceReserve, deployProxiedGovernance, deploySaleContracts, deployLuciDaoTimelock, deployLuciDaoVestingTreasury, transferLuciDaoToLiquidityVault, getOrDeployfUsdt, addToPublicSaleWhitelist } from "./deployFunctions";

async function main() {
    const [deployer] = await ethers.getSigners();
    const liquidityVaultAddress = await GetLiquidityVaultAddress();

    console.log(`Deploying contracts with the account: ${deployer.address} on Network: ${process.env.HARDHAT_NETWORK}`);
    console.log(`Account balance: ${(await deployer.getBalance()).toString()}`);

    const whitelisted = await GetWhitelistedAddresses();

    // DEPLOY LUCID TOKEN
    const luciDao = await deployLuciDao();

    // DEPLOY fUSDT TOKEN
    const fUsdt = await getOrDeployfUsdt(deployer, whitelisted);

    // DEPLOY TIMELOCK GOVERNANCE
    const luciDaoTimelock = await deployLuciDaoTimelock();

    // DEPLOY PROXIED GOVERNANCE
    const luciDaoGovernor = await deployProxiedGovernance(deployer, luciDao, luciDaoTimelock);

    // DEPLOY LUCID DAO VAULT
    const luciDaoGovernanceReserve = await deployLuciDaoGovernanceReserve(liquidityVaultAddress, luciDao, fUsdt, luciDaoTimelock);

    // DEPLOY LUCID VESTING VAULT
    const luciDaoVestingTreasury = await deployLuciDaoVestingTreasury(luciDao, luciDaoGovernanceReserve);

    // DEPLOY PRESALE AND PUBLICSALE
    const [luciDaoPreSale, luciDaoPublicSale] = await deploySaleContracts(luciDao, luciDaoGovernanceReserve, fUsdt, whitelisted);
    // await addToPublicSaleWhitelist(luciDaoPublicSale, whitelisted);

    await transferLuciDaoToLiquidityVault(luciDao, liquidityVaultAddress);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });