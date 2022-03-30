import { lcdAllocations, luciDaoVestingTreasuryAddress } from "../../config/config";
import { getOrDeployLuciDao, transferLuciDaoTo } from "../deployFunctions";

async function main() {
    const luciDao = await getOrDeployLuciDao();
    await transferLuciDaoTo(luciDao,
        "vesting treasury transfer",
        luciDaoVestingTreasuryAddress,
        lcdAllocations.vestingTreasury);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });