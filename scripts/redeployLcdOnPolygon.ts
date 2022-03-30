import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import {
    airdropManagerAddress, lcdAllocations,
    luciDaoGovernanceReserveAddress, luciDaoLiquidityAddress,
    luciDaoVestingTreasuryAddress
} from "../config/config";
import { getDeployedLuciDao } from "./deployFunctions";
import { RedeployManager } from "./redeployManager";
import { isDevelopment, onPolygonMainnetChain } from "./utilities";

async function main() {
    const [deployer] = await ethers.getSigners();
    if (!isDevelopment() && !onPolygonMainnetChain()) {
        throw new Error("Invalid Chain!");
    }
    console.log(`Redistributing LCD with the account: ${deployer.address} on Network: ${process.env.HARDHAT_NETWORK}`);
    console.log(`Account balance: ${(await deployer.getBalance()).toString()}`);
    //TODO: set correct params
    const filename = "";
    //NB: max 10 decimal digit
    const liquidityBalance = "6951721.57017987";

    let governanceReserveLcdBalance = lcdAllocations.governanceReserveAfterInstitutionalSale;

    if (isDevelopment()) {
        governanceReserveLcdBalance = lcdAllocations.governanceReserve;
    }

    const deployedLucidao = await getDeployedLuciDao();

    let fantomAddresses: Map<string, string> = new Map<string, string>();
    // fantomAddresses.set(RedeployManager.GovernanceReserveLabel,
    //     "");

    // fantomAddresses.set(RedeployManager.VestingTreasuryLabel,
    //     "");

    const tokenHolderManager = new RedeployManager(
        deployedLucidao,
        filename,
        airdropManagerAddress,
        luciDaoGovernanceReserveAddress,
        luciDaoLiquidityAddress,
        luciDaoVestingTreasuryAddress,
        liquidityBalance,
        governanceReserveLcdBalance,
        fantomAddresses);
    await tokenHolderManager.processFile();
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });