import { ethers } from "hardhat";
import { luciDaoTokenAddress, timelockAddress } from "../config/config";
import { deployProxiedGovernance } from "./deployFunctions";

async function main() {
    const [deployer] = await ethers.getSigners();

    const luciDao = await ethers.getContractAt("Lucidao", luciDaoTokenAddress);
    console.log(`Lucidao address ${luciDaoTokenAddress}`);

    const timelock = await ethers.getContractAt("LucidaoTimelock", timelockAddress);
    console.log(`Timelock address ${timelockAddress}`);

    await deployProxiedGovernance(deployer, luciDao, timelock);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });