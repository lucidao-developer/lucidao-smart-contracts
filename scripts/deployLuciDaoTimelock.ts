import { deployLuciDaoTimelock } from "./deployFunctions";

async function main() {
    await deployLuciDaoTimelock();
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
