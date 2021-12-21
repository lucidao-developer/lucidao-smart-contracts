import { luciDaoGovernanceImpl } from "../config/config";
import { verifyContract } from "./deployFunctions";

async function main() {
    var contractName = "Lucidao Governor Impl";
    await verifyContract(contractName, { address: luciDaoGovernanceImpl });
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });