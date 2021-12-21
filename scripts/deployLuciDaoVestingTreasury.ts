import { ethers } from "hardhat";
import { luciDaoTokenAddress, luciDaoGovernanceReserveAddress } from "../config/config";
import { deployLuciDaoVestingTreasury } from "./deployFunctions";

async function main() {
    const luciDao = await ethers.getContractAt("Lucidao", luciDaoTokenAddress);
    console.log(`Lucidao address: ${luciDao.address}`);

    const luciDaoGovernanceReserve = await ethers.getContractAt("LucidaoGovernanceReserve", luciDaoGovernanceReserveAddress);
    console.log(`LuciDaoGovernanceReserve address ${luciDaoGovernanceReserve.address}`);

    await deployLuciDaoVestingTreasury(luciDao, luciDaoGovernanceReserve);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
