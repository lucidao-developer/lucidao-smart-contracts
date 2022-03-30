import { ethers } from "hardhat";
import { luciDaoTokenAddress, timelockAddress } from "../config/config";
import { deployLuciDaoGovernanceReserve } from "./deployFunctions";

async function main() {
    const luciDao = await ethers.getContractAt("Lucidao", luciDaoTokenAddress);
    console.log(`Lucidao address ${luciDao.address}`);

    const timelock = await ethers.getContractAt("LucidaoTimelock", timelockAddress);
    console.log(`timelock address ${timelockAddress}`);

    await deployLuciDaoGovernanceReserve(luciDao, timelock);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
