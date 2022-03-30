import { ethers } from "hardhat";
import {
    lcdAllocations, luciDaoGovernanceReserveAddress,
    luciDaoTokenAddress, timelockAddress
} from "../config/config";
import { Lucidao } from "../typechain";
import { transferOwnershipForGovernanceReserve } from "./deployFunctions";
import { ask, isDevelopment, onPolygonMainnetChain } from "./utilities";

async function main() {
    // TODO: script finalize migration?
    const [deployer] = await ethers.getSigners();

    const luciDao = await ethers.getContractAt("Lucidao", luciDaoTokenAddress);
    console.log(`Lucidao address ${luciDao.address}`);

    const timelock = await ethers.getContractAt("LucidaoTimelock", timelockAddress);
    console.log(`timelock address ${timelockAddress}`);

    const governanceReserve = await ethers.getContractAt("LucidaoGovernanceReserve", luciDaoGovernanceReserveAddress);
    console.log(`Governance reserve address ${governanceReserve}`);

    if(isDevelopment() && onPolygonMainnetChain()){
        throw new Error("Dev node env on polygon mainnet!")
    }
    
    await ask(`Transferring ownership from ${governanceReserve.address} to ${timelock.address} for token ${luciDao.address}\n` +
        `Continue?`)

    await transferOwnershipForGovernanceReserve(deployer, governanceReserve, luciDao, timelock);

    //TODO: re-check a token holder export file?
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });




