import { ethers } from "hardhat";
import { liquidityTokenAddress, luciDaoGovernanceReserveAddress, luciDaoTokenAddress, GetWhitelistedAddresses } from "../config/config";
import { addToPublicSaleWhitelist, deploySaleContracts } from "./deployFunctions";

async function main() {
    const fUsdt = await ethers.getContractAt("AnyswapV3ERC20", liquidityTokenAddress);
    console.log(`fUsdt address ${fUsdt.address}`);

    const luciDao = await ethers.getContractAt("Lucidao", luciDaoTokenAddress);
    console.log(`Lucidao address ${luciDao.address}`);

    const luciDaoGovernanceReserve = await ethers.getContractAt("LucidaoGovernanceReserve", luciDaoGovernanceReserveAddress);
    console.log(`LuciDaoGovernanceReserve address ${luciDaoGovernanceReserve.address}`);

    let whitelisted = await GetWhitelistedAddresses();
    const [lucidPreSale, lucidPublicSale] = await deploySaleContracts(luciDao, luciDaoGovernanceReserve, fUsdt, whitelisted);
    //await addToPublicSaleWhitelist(lucidPublicSale, whitelisted);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
