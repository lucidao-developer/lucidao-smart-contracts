import { ethers } from "hardhat";
import { luciDaoTokenAddress, liquidityTokenAddress, timelockAddress, GetLiquidityVaultAddress } from "../config/config";
import { deployLuciDaoGovernanceReserve } from "./deployFunctions";

async function main() {
    const liquidityVaultAddress = await GetLiquidityVaultAddress();

    const luciDao = await ethers.getContractAt("Lucidao", luciDaoTokenAddress);
    console.log(`Lucidao address ${luciDao.address}`);

    const fUsdt = await ethers.getContractAt("AnyswapV3ERC20", liquidityTokenAddress);
    console.log(`fUsdt address ${fUsdt.address}`);

    const timelock = await ethers.getContractAt("LucidaoTimelock", timelockAddress);
    console.log(`timelock address ${timelockAddress}`);

    await deployLuciDaoGovernanceReserve(liquidityVaultAddress, luciDao, fUsdt, timelock);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
