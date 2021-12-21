import { config as configDotenv } from 'dotenv';
import { resolve } from 'path';
import path from 'path';
import fs from 'fs';

export function skipContractVerify() {
    return isDevelopment() && (!process.env.HARDHAT_NETWORK || process.env.HARDHAT_NETWORK == "localhost");
}

export function isDevelopment() {
    return process.env.NODE_ENV == "development" || process.env.NODE_ENV == "test";
}


export function GetOpenzeppelinUnknownFile(chainId: number) {
    return path.join(__dirname, "../.openzeppelin/unknown-" + chainId + ".json");
}

export function removeOpenzeppelinUnknownFile(chainId: number) {
    const moduleName = GetOpenzeppelinUnknownFile(chainId);
    console.log(`Try to remove ${moduleName} ...`);

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
        throw new Error(msg || `Environment is missing variable ${prop}`)
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

    //check if test
    if (process.env.npm_lifecycle_script == 'hardhat "test"') {
        mandatoryEnvParams = mandatoryEnvParams.concat([
            'luciDaoTokenAddress',
            'timelockAddress',
            'luciDaoGovernanceProxy',
            'liquidityTokenAddress',
            'luciDaoGovernanceReserveAddress',
            'luciDaoVestingTreasuryAddress'

        ]);
    }

    mandatoryEnvParams.forEach(v => { throwIfNot(process.env, v) })
}