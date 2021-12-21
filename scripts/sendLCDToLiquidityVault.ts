import { ethers } from "hardhat";
import { GetLiquidityVaultAddress, luciDaoTokenAddress } from "../config/config";
import { transferLuciDaoToLiquidityVault } from "./deployFunctions";

async function main() {
    const luciDao = await ethers.getContractAt("Lucidao", luciDaoTokenAddress);
    const liquidityVaultAddress = await GetLiquidityVaultAddress();
    console.log(`Lucidao address ${luciDao.address}`);

    transferLuciDaoToLiquidityVault(luciDao, liquidityVaultAddress);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });