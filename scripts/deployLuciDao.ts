import { getOrDeployLuciDao } from "./deployFunctions";

async function main() {
    const luciDao = await getOrDeployLuciDao();
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });