import { ethers } from "hardhat";
import { GetWhitelistedAddresses } from "../config/config";
import { getOrDeployfUsdt } from "./deployFunctions";

async function main() {
    const [deployer] = await ethers.getSigners();

    let whitelisted = await GetWhitelistedAddresses();

    await getOrDeployfUsdt(deployer, whitelisted);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });