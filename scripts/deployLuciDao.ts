import { deployLuciDao } from "./deployFunctions";

async function main() {
    await deployLuciDao();
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });