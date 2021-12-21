import { ethers } from "hardhat";
import { luciDaoPublicSaleAddress } from "../config/config";
import { addToPublicSaleWhitelist } from "./deployFunctions";

async function main() {
    const lucidaoPublicSale = await ethers.getContractAt("LucidaoPublicSale", luciDaoPublicSaleAddress);
    console.log(`lucidaoPublicSale address ${lucidaoPublicSale.address}`);

    let publicSaleWhitelist: string[] = [];
    await addToPublicSaleWhitelist(lucidaoPublicSale, publicSaleWhitelist);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
