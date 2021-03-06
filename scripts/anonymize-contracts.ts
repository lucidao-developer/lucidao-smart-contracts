import fs from 'fs';
import path from 'path';

const newPrefix = 'Fake';
const newTokenPrefix = 'FCK';
const anonymizedContractsPath = '"anonymized-contracts/';

async function copyRecursiveSync(src: string, dest: string) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats && stats.isDirectory();
    if (isDirectory) {
        fs.mkdirSync(dest);
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName.replace(/Lucid/g, newPrefix)));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
};

function replaceContractPrefixInFile(destFilename: string) {
    const data = fs.readFileSync(destFilename, { encoding: 'utf8' });
    let result = data.replace(/Lucidao/g, newPrefix);
    result = result.replace(/LCD/g, newTokenPrefix);
    //anonymized contract path
    result = result.replace(/"contracts\//g, anonymizedContractsPath);
    result = result.replace(/contract: `contracts\//g, "contract: `anonymized-contracts\/");


    fs.writeFileSync(destFilename, result, { encoding: 'utf8' });
}

function walk(dir: string) {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            /* Recurse into a subdirectory */
            results = results.concat(walk(file));
        } else {
            /* Is a file */
            results.push(file);
        }
    });
    return results;
}

async function anonymizedScriptsManagement(anonymizeScriptContractFolder: string) {
    const utilitiesScripts = path.join(__dirname, '../scripts/utilities.ts');
    const utilitiesScriptsInAnonymizedFolder = path.join(anonymizeScriptContractFolder, 'utilities.ts');

    const deployEverythingScripts = path.join(__dirname, '../scripts/deployEverything.ts');
    const anonymizedDeployEverythingScripts = path.join(anonymizeScriptContractFolder, 'anonymizeDeployEverything.ts');

    const deployFunctionsScripts = path.join(__dirname, '../scripts/deployFunctions.ts');
    const anonymizedDeployFunctionsScripts = path.join(anonymizeScriptContractFolder, 'deployFunctions.ts');

    const redeployFunctionsScripts = path.join(__dirname, '../scripts/redeployLcdOnPolygon.ts');
    const anonymizedRedeployFunctionsScripts = path.join(anonymizeScriptContractFolder, 'anonymizeRedeployLcdOnPolygon.ts');

    const redeployManagerScript = path.join(__dirname, '../scripts/redeployManager.ts');
    const anonymizedRedeployManagerScript = path.join(anonymizeScriptContractFolder, 'redeployManager.ts');

    const finalizeScript = path.join(__dirname, '../scripts/finalizeRedeploy.ts');
    const anonymizedFinalizeScript = path.join(anonymizeScriptContractFolder, 'anonymizeFinalizeRedeploy.ts');

    console.log(`Removing scripts from folder: ${anonymizeScriptContractFolder}`);
    fs.rmSync(anonymizeScriptContractFolder, { recursive: true, force: true });

    fs.mkdirSync(anonymizeScriptContractFolder);
    fs.copyFileSync(deployEverythingScripts, anonymizedDeployEverythingScripts);
    fs.copyFileSync(deployFunctionsScripts, anonymizedDeployFunctionsScripts);
    fs.copyFileSync(redeployFunctionsScripts, anonymizedRedeployFunctionsScripts);
    fs.copyFileSync(redeployManagerScript, anonymizedRedeployManagerScript);
    fs.copyFileSync(utilitiesScripts, utilitiesScriptsInAnonymizedFolder);
    fs.copyFileSync(finalizeScript, anonymizedFinalizeScript);
    replaceContractPrefixInFile(anonymizedDeployEverythingScripts);
    replaceContractPrefixInFile(anonymizedDeployFunctionsScripts);
    replaceContractPrefixInFile(anonymizedRedeployFunctionsScripts);
    replaceContractPrefixInFile(anonymizedRedeployManagerScript);
    replaceContractPrefixInFile(anonymizedFinalizeScript);

    console.log("Built scripts for anonymized contract deploy....!");
}

async function anonymizedContractsManagement(contractsFolder: string, anonymizeContractFolder: string) {
    console.log(`Removing contracts from folder: ${anonymizeContractFolder}`);
    fs.rmSync(anonymizeContractFolder, { recursive: true, force: true });

    await copyRecursiveSync(contractsFolder, anonymizeContractFolder);
    // walk(contractsFolder).forEach(sourceFilename => {
    //     let destFilename = sourceFilename.replace("contracts", "anonymized-contracts").replace("LuciDao", newPrefix);
    //     let dirName = path.dirname(destFilename);
    //     if (!fs.existsSync(dirName)) {
    //         fs.mkdirSync(dirName, { recursive: true });
    //     }
    //     fs.copyFileSync(sourceFilename, destFilename);
    // });

    walk(anonymizeContractFolder).forEach(destFilename => {
        replaceContractPrefixInFile(destFilename);
    });
    console.log("Contracts anonymization done....!");
}

async function main() {
    const contractsFolder = path.join(__dirname, '../contracts');
    const anonymizeContractFolder = path.join(__dirname, '../anonymized-contracts');
    const anonymizeScriptContractFolder = path.join(__dirname, '../anonymized-scripts');

    await anonymizedContractsManagement(contractsFolder, anonymizeContractFolder);
    await anonymizedScriptsManagement(anonymizeScriptContractFolder);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });