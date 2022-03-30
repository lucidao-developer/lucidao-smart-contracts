import { ethers } from "hardhat";
import { timelockAddress } from "../config/config";
import { deployLuciDaoVisionProposals } from "./deployFunctions";

async function main() {
    const timelock = await ethers.getContractAt("LucidaoTimelock", timelockAddress);
    console.log(`timelock address ${timelockAddress}`);

    await deployLuciDaoVisionProposals(timelock);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
