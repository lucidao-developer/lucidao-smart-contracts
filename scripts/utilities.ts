import { config as configDotenv } from 'dotenv';
import { resolve } from 'path';
import path from 'path';
import fs from 'fs';
import { DeployTx } from '../config/config';
import yesno from 'yesno';

export function skipContractVerify() {
    return isDevelopment() &&
        (!process.env.HARDHAT_NETWORK || process.env.HARDHAT_NETWORK == "localhost");
}

export function isDevelopment() {
    return process.env.NODE_ENV == "development" || process.env.NODE_ENV == "test";
}

export function onPolygonMainnetChain() {
    return process.env.HARDHAT_NETWORK == "polygonMainnet";
}

export function testRunningInHardhat() {
    return process.env.npm_lifecycle_script == 'hardhat "test"';
}

export function onRedeploy() {
    if (!process.env.npm_lifecycle_script) {
        return false;
    }
    return process.env.npm_lifecycle_script.toLowerCase().indexOf('redeploy') > -1;
}

export function GetOpenzeppelinUnknownFile(chainId: number) {
    return path.join(__dirname, "../.openzeppelin/unknown-" + chainId + ".json");
}

export function removeOpenzeppelinUnknownFile(chainId: number) {
    const moduleName = GetOpenzeppelinUnknownFile(chainId);
    console.log(`Trying to remove ${moduleName} ...`);

    try {
        fs.accessSync(moduleName, fs.constants.F_OK);
    } catch (err) {
        console.error(`File ${moduleName} not found. Skip remove...`);
        return;
    }

    try {
        fs.unlinkSync(moduleName);
    } catch (err) {
        console.error(`Cannot remove file ${moduleName}`);
        throw err;
    }

    console.log(`Succesfully removed file ${moduleName}`);
}

export function throwIfNot<T, K extends keyof T>(obj: Partial<T>, prop: K, msg?: string): T[K] {
    if (obj[prop] === undefined || obj[prop] === null) {
        throw new Error(msg || `Environment is missing variable ${String(prop)}`)
    } else {
        return obj[prop] as T[K]
    }
}

export async function importModule(moduleName: string): Promise<any> {
    console.log(`importing ${moduleName}`);
    const importedModule = await import(moduleName);
    console.log(`imported...`);
    return importedModule;
}

export function usingAnonymizedScriptsAndContracts() {
    let deployingAnonymizedContractsScript = process.env.npm_lifecycle_script?.indexOf('anonymizeDeployEverything');
    let anonymizedContracts = process.env.npm_lifecycle_script?.indexOf('anonymize-contracts');
    let anonymizedScripts = process.env.npm_lifecycle_script?.indexOf('anonymized-scripts');
    return (deployingAnonymizedContractsScript && deployingAnonymizedContractsScript > -1)
        ||
        (anonymizedContracts && anonymizedContracts > -1)
        ||
        (anonymizedScripts && anonymizedScripts > -1);
}

export function mockConsoleLog() {
    let origFn = console.log;

    console.log = function (msg) {
        if (process.env.npm_config_loglevel == 'silent') {
            return;
        }
        origFn(msg);
    }
}

export function myDotenvConfig() {
    //FIXME: https://12factor.net/config
    let targetEnvironment = `../.env.${process.env.NODE_ENV}`;
    console.log(`Environment: ${resolve(__dirname, targetEnvironment)}`);
    configDotenv({
        path: resolve(__dirname, targetEnvironment)
    });

    let mandatoryEnvParams = [
        'MNEMONIC',
        'FTMSCAN_API_KEY'
    ];
    if (onRedeploy()) {
        mandatoryEnvParams = mandatoryEnvParams.concat([
            'luciDaoTokenAddress',
            'luciDaoGovernanceReserveAddress',
            'luciDaoLiquidityAddress',
            'airdropManagerAddress',
            'timelockAddress',
        ]);
    }

    //check if test
    if (!testRunningInHardhat()) {
        mandatoryEnvParams = mandatoryEnvParams.concat([
            'luciDaoTokenAddress',
            'timelockAddress',
            'luciDaoGovernanceProxy',
            'luciDaoGovernanceReserveAddress',
            'luciDaoVestingTreasuryAddress',
            'luciDaoLiquidityAddress',
            'airdropManagerAddress',
        ]);
    }

    mandatoryEnvParams.forEach(v => { throwIfNot(process.env, v) })
}

export function numberExponentToLarge(numIn: string) {
    numIn += "";
    var sign = "";
    numIn.charAt(0) == "-" && (numIn = numIn.substring(1), sign = "-");
    var str = numIn.split(/[eE]/g);
    if (str.length < 2) return sign + numIn;
    var power = Number(str[1]);

    var deciSp = 1.1.toLocaleString().substring(1, 2);
    str = str[0].split(deciSp);
    var baseRH = str[1] || "",
        baseLH = str[0];

    if (power >= 0) {
        if (power > baseRH.length) baseRH += "0".repeat(power - baseRH.length);
        baseRH = baseRH.slice(0, power) + deciSp + baseRH.slice(power);
        if (baseRH.charAt(baseRH.length - 1) == deciSp) baseRH = baseRH.slice(0, -1);

    } else {
        let num = Math.abs(power) - baseLH.length;
        if (num > 0) baseLH = "0".repeat(num) + baseLH;
        baseLH = baseLH.slice(0, power) + deciSp + baseLH.slice(power);
        if (baseLH.charAt(0) == deciSp) baseLH = "0" + baseLH;
    }
    return sign + (baseLH + baseRH).replace(/^0*(\d+|\d+\.\d+?)\.?0*$/, "$1");
}

export function readFtmDeployNoncesJson(txName: string): DeployTx {
    const fileName = path.join(__dirname, "../config/ftmDeployNonces.json");

    const rawdata = fs.readFileSync(fileName, "utf-8");
    const jsonFile = JSON.parse(rawdata);
    return jsonFile[txName];
}

export function isStrictMode() {
    return process.env.STRICT_MODE === "true";
}

export async function ask(question: string, interactive: boolean = true, exit: boolean = true) {
    if (!interactive) {
        console.log(`Non interactive mode...skipping:\n ${question}`);
        console.log("");
        return !exit;
    }
    const ok = await yesno({
        question: `* ${question}`
    });
    if (!ok && exit) {
        process.exit(1);
    }
    return ok;
}
