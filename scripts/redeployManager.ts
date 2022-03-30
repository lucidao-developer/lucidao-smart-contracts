import { config, ethers, network } from "hardhat";
import csv from "csv-parser";
import yesno from 'yesno';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { BigNumber, BigNumberish, providers } from "ethers";
import {
    isDevelopment, numberExponentToLarge,
    onPolygonMainnetChain, usingAnonymizedScriptsAndContracts
} from "./utilities";
import { lcdAllocations, totalSupply, ZERO_ADDRESS } from "../config/config";
import { transferLuciDaoUnitsTo } from "./deployFunctions";
import { Lucidao } from "../typechain";
import path from "path";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export type TokenHolder = {
    readonly HolderAddress: string;
    readonly Balance: string;
    readonly PendingBalanceUpdate: boolean;
};

export type DistributableAmounts = {
    readonly GovernanceReserve: BigNumber;
    readonly Liquidity: BigNumber;
    readonly Aidrop: BigNumber;
};

export class RedeployManager {
    private _tokenHolderFile: string = "";
    private _tokenHoldersResult: TokenHolder[] = [];
    private _csvHeaders = ["HolderAddress", "Balance", "PendingBalanceUpdate"];
    private _decimals = 18;
    //params
    private _deployedLucidao: Lucidao;
    private _expectedLiquidityTokenBalance: BigNumber;
    private _expectedGovernanceReserveLcdBalance: BigNumber;
    private _expectedVestingTreasuryLcdBalance: BigNumber;
    private _zero: BigNumber;
    private _parsedTotalSupply: BigNumber;
    private _ignoredAddressForAirdrop: string[];
    private _ignoredContractAddressForAirdrop: TokenHolder[];
    private _airdropManagerAddress: string;
    private _luciDaoGovernanceReserveAddress: string;
    private _luciDaoLiquidityAddress: string;
    private _luciDaoVestingTreasuryAddress: string;
    private _airdropFilename: string = "";
    private _lcdFromRoundingError: BigNumber;
    private _excludedContractBalance: BigNumber;
    private _fantomAddresses: Map<string, string>;
    private _dryRunMode: Boolean = false;

    constructor(
        _deployedLucidao: Lucidao,
        tokenHolderExportFile: string,
        airdropManagerAddress: string,
        luciDaoGovernanceReserveAddress: string,
        luciDaoLiquidityAddress: string,
        luciDaoVestingTreasuryAddress: string,
        liquidityBalance: string,
        reserveLcdBalance: string,
        fantomAddresses: Map<string, string>,
        private interactive: boolean = true
    ) {
        if (!this.validAddress(airdropManagerAddress) ||
            !this.validAddress(luciDaoGovernanceReserveAddress) ||
            !this.validAddress(luciDaoLiquidityAddress) ||
            !this.validAddress(luciDaoVestingTreasuryAddress)) {
            throw Error("Address non valido!")
        }
        if (tokenHolderExportFile && !fs.existsSync(tokenHolderExportFile)) {
            throw Error("File non trovato")
        }
        this._deployedLucidao = _deployedLucidao;
        this._tokenHolderFile = tokenHolderExportFile;
        this._expectedLiquidityTokenBalance = ethers.utils.parseUnits(liquidityBalance);
        //reserveLcdBalance < lcdAllocations.governanceReserve
        this._expectedGovernanceReserveLcdBalance = ethers.utils.parseUnits(reserveLcdBalance.toString());
        this._expectedVestingTreasuryLcdBalance = ethers.utils.parseUnits(lcdAllocations.vestingTreasury.toString());
        this._zero = ethers.utils.parseUnits("0");
        this._parsedTotalSupply = ethers.utils.parseUnits(totalSupply, this._decimals);
        this._lcdFromRoundingError = ethers.utils.parseUnits("0");
        this._airdropManagerAddress = airdropManagerAddress;
        this._luciDaoGovernanceReserveAddress = luciDaoGovernanceReserveAddress;
        this._luciDaoLiquidityAddress = luciDaoLiquidityAddress;
        this._luciDaoVestingTreasuryAddress = luciDaoVestingTreasuryAddress;

        this._fantomAddresses = fantomAddresses;
        this._ignoredAddressForAirdrop = [] as string[];
        this._ignoredAddressForAirdrop.push(this.getTargetAddressForFantomExport(this._luciDaoLiquidityAddress, RedeployManager.LiquidityLabel).toLowerCase());
        this._ignoredAddressForAirdrop.push(this.getTargetAddressForFantomExport(this._luciDaoGovernanceReserveAddress, RedeployManager.GovernanceReserveLabel).toLowerCase());
        this._ignoredAddressForAirdrop.push(this.getTargetAddressForFantomExport(this._luciDaoVestingTreasuryAddress, RedeployManager.VestingTreasuryLabel).toLowerCase());
        this._ignoredContractAddressForAirdrop = [] as TokenHolder[];
        this._excludedContractBalance = BigNumber.from("0");
    }

    public static LiquidityLabel = "Liquidity";
    public static GovernanceReserveLabel = "Governance";
    public static VestingTreasuryLabel = "VestingTreasuryLabel";

    get airdropFilename() {
        return this._airdropFilename;
    }

    get lcdExcess() {
        return this._lcdFromRoundingError;
    }

    get excludedContractBalance() {
        return this._excludedContractBalance;
    }

    get ignoredContractAddressForAirdrop() {
        return this._ignoredContractAddressForAirdrop;
    }

    private getTargetAddressForFantomExport(polygonAddress: string, target: string) {
        if ([...this._fantomAddresses.keys()].indexOf(target) > -1) {
            if (!this._fantomAddresses.get(target)) {
                throw new Error(`Unexpected value for fantom address. Target: ${target}`);
            }
            return this._fantomAddresses.get(target) || "";
        }
        return polygonAddress;
    }

    private validAddress(address: string) {
        return address.trim().length == 42
            && address != ZERO_ADDRESS;
    }

    private readTokenHolderFile() {
        const self = this;
        return new Promise(function (resolve, reject) {
            fs.createReadStream(self._tokenHolderFile)
                .pipe(csv({
                    mapValues: ({ header, index, value }) => {
                        if (index == 2) {
                            return value.toLowerCase() == 'yes' ? true : false;
                        }
                        return value.toLowerCase();
                    }
                }))
                .on('data', (data) => self._tokenHoldersResult.push(
                    data as TokenHolder
                ))
                .on('end', () => {
                    // console.log(self._tokenHoldersResult.slice(0, 10))
                    console.log("file processed!")
                    resolve("");
                })
                .on('error', reject);
        });
    }

    public checkBalanceInAirdropFile(filename: string): Promise<BigNumber> {
        const self = this;
        let airdropBalance = BigNumber.from("0");
        let prom = new Promise<BigNumber>(function (resolve, reject) {
            fs.createReadStream(filename)
                .pipe(csv({
                    mapValues: ({ header, index, value }) => {
                        return value.toLowerCase();
                    }
                }))
                .on('data', (data) => {
                    airdropBalance = airdropBalance.add(self.getBalanceFromString(data['balance']));
                })
                .on('end', () => {
                    resolve(airdropBalance);
                })
                .on('error', reject);
        });
        return prom;
    }

    private checkIfExistsPendingTransaction() {
        let pendingTransaction = this._tokenHoldersResult.filter(x => x.PendingBalanceUpdate).length;
        if (pendingTransaction) {
            throw new Error("pending transaction found");
        }
        console.log("...Ok");
    }

    public isExponential(num: string) {
        return num.toLowerCase().indexOf('e') > -1;
    }

    public getBalanceFromString(balance: string) {
        let parsedBalance = balance;
        if (this.isExponential(balance)) {
            //parsedBalance = parseFloat(balance).toString();
            parsedBalance = numberExponentToLarge(balance);
        }
        return ethers.utils.parseUnits(parsedBalance, this._decimals);
    }

    private computeTotal(tokenHolders: TokenHolder[]) {
        return tokenHolders.map(x => x.Balance)
            .reduce((tot, current) => tot.add(
                this.getBalanceFromString(current)), BigNumber.from("0")
            );
    }

    private async checkTotalSupply() {
        const foundSupply = this.computeTotal(this._tokenHoldersResult);
        if (this.unexpectedTotalSupply(foundSupply)) {
            await this.ask(`Unexpected supply!\n` +
                `Found:    ${foundSupply.toString()}\n` +
                `Expected: ${this._parsedTotalSupply.toString()}\nContinue?`)
            this._lcdFromRoundingError = foundSupply.sub(this._parsedTotalSupply);
            console.log(`Total supply difference: ${this._lcdFromRoundingError}`);
        }
    }

    private unexpectedTotalSupply(foundSupply: BigNumber) {
        const diff = foundSupply.sub(this._parsedTotalSupply);
        if (!diff.eq("0")) {
            return true;
        }
        return false;
    }

    private async checkDeployer(deployer: SignerWithAddress) {
        const deployerBalance = await this._deployedLucidao.balanceOf(deployer.address);
        if (!deployerBalance.eq(this._parsedTotalSupply.sub(this._expectedVestingTreasuryLcdBalance))) {
            throw new Error(`Invalid Lucidao balance for deployer: ${deployerBalance}`);
        }
        console.log(`Deployer: ${deployer.address}`)
    }

    private async writeDebugFile() {
        const createCsvWriter = require('csv-writer').createArrayCsvWriter;
        const csvWriter = createCsvWriter({
            path: './myFile.csv',
            header: ["col1"]
        });
        let val = BigNumber.from("0");
        for (let el of this._tokenHoldersResult) {
            val = val.add(this.getBalanceFromString(el.Balance));
            await csvWriter.writeRecords([[val.toString()]]);
        }
        console.log(val);
    }

    private formatDate(date: Date) {
        return [
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate(),
            date.getHours(),
            date.getMinutes(),
            date.getSeconds()
        ].join('_');
    }

    private async writeAirdropTargetFile() {
        let prefix = "";
        if (this._tokenHolderFile) {
            const chunks = path.basename(this._tokenHolderFile).split(".");
            prefix = `${chunks[0]}_`;
        }
        const filename = `./${prefix}airdropFile_${this.formatDate(new Date())}.csv`;
        const createCsvWriter = require('csv-writer').createArrayCsvWriter;
        const csvWriter = createCsvWriter({
            path: filename,
            header: ["address", "balance"]
        });

        const csvWriterForAirdrop = createCsvWriter({
            path: "airdrop.csv",
            header: ["address", "amount"]
        });

        for (let el of this._tokenHoldersResult) {
            if (this._ignoredAddressForAirdrop.indexOf(el.HolderAddress) > -1) {
                continue;
            }

            if (await RedeployManager.isContract(el.HolderAddress)) {
                //const err = `Found a contract address on Polygon. Address: ${el.HolderAddress}`;
                // throw new Error(err);

                // const skipContract = await this.ask(`Found a contract address on Polygon. Address: ${el.HolderAddress}. Skip?`,
                //     false);
                const skipContract = true;

                if (skipContract) {
                    console.log(`Skip contract ${el.HolderAddress} - Amount: ${el.Balance}`);
                    this._ignoredContractAddressForAirdrop.push(el);
                    continue;
                }
            }
            let balance = el.Balance;
            if (this.isExponential(balance)) {
                balance = numberExponentToLarge(el.Balance);
            }
            await csvWriter.writeRecords([[el.HolderAddress, balance]]);
            if (ethers.utils.parseEther(balance) > ethers.utils.parseEther("1")) {
                await csvWriterForAirdrop.writeRecords([[el.HolderAddress, "500000000000000000"]]);
            }
        }

        console.log(`-> Generated file for airdrop operations: ${filename}`)

        if (this._ignoredContractAddressForAirdrop.length > 0) {
            this._excludedContractBalance = this.computeTotal(this._ignoredContractAddressForAirdrop);
            console.log(`Excluded contract address for a total of ${this._excludedContractBalance} LCD`);
        }
        return filename;
    }

    private async ask(question: string, exit: boolean = true) {
        if (!this.interactive) {
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

    private async processTokenBalanceForTargetAccounts() {
        // Target:
        //         1. governance reserve -> luciDaoGovernanceReserveAddress
        //         2. liquidity manager (TODO: tbd) -> liquidityTokenAddress
        //         3. airdropManager -> airdropManagerAddress
        //Nb: luciDaoVestingTreasury filled during initial deploy
        //for every "transfer address" we expect a 0 balance

        //Expected Governance Balance
        console.log("Checking Governance Balance...");
        await this.checkBalanceForExistingAddress(this._luciDaoGovernanceReserveAddress,
            this._expectedGovernanceReserveLcdBalance,
            this._zero,
            RedeployManager.GovernanceReserveLabel);

        //Liquidity balance
        console.log("Checking Liquidity Balance...");
        await this.checkBalanceForExistingAddress(this._luciDaoLiquidityAddress,
            this._expectedLiquidityTokenBalance,
            this._zero,
            RedeployManager.LiquidityLabel);

        //Lucidao Vesting Treasury
        console.log("Checking Vesting Treasury Balance...");
        await this.checkBalanceForExistingAddress(this._luciDaoVestingTreasuryAddress,
            this._expectedVestingTreasuryLcdBalance,
            this._expectedVestingTreasuryLcdBalance,
            RedeployManager.VestingTreasuryLabel);

        //Airdrop
        console.log("Checking Airdrop Balance...");
        let airdropBalance = this._parsedTotalSupply
            .add(this._lcdFromRoundingError)
            .sub(this._expectedLiquidityTokenBalance)
            .sub(this._expectedGovernanceReserveLcdBalance)
            .sub(this._expectedVestingTreasuryLcdBalance);

        airdropBalance = await this.identifyBalanceAndAddressesForAirdrop(this._airdropManagerAddress,
            airdropBalance);

        return {
            GovernanceReserve: this._expectedGovernanceReserveLcdBalance,
            Liquidity: this._expectedLiquidityTokenBalance,
            Aidrop: airdropBalance,
        } as DistributableAmounts;
    }

    private async checkBalanceForExistingAddress(targetAddress: string, expectedBalance: BigNumber, excpectedFileValue: BigNumber, label: string) {
        const chainBalance = await this._deployedLucidao.balanceOf(targetAddress);
        if (!chainBalance.eq(excpectedFileValue)) {
            throw new Error(`Address ${targetAddress} has a onchain balance that is different from value in file.\n` +
                `FileValue:  ${excpectedFileValue}\n` +
                `ChainValue: ${chainBalance}\n`);
        }

        const fantomAddress = this.getTargetAddressForFantomExport(targetAddress, label);
        const entry = this._tokenHoldersResult.find(x => x.HolderAddress.toLowerCase() == fantomAddress.toLowerCase());
        if (!entry) {
            throw new Error(`Cannot find address ${fantomAddress} in file ${this._tokenHolderFile}`);
        }

        const actualBalance = ethers.utils.parseUnits(entry.Balance, this._decimals);
        if (!actualBalance.eq(expectedBalance)) {
            await this.ask(`Expected Balance differs from actual for address ${fantomAddress}\n` +
                `PolygonAddress: ${targetAddress}\n` +
                `Expected: ${expectedBalance}\n` +
                `Actual:   ${actualBalance}\n` +
                `Continue?`
            );
        }
        return actualBalance;
    }

    private async identifyBalanceAndAddressesForAirdrop(airdropAddress: string, airdropBalance: BigNumber) {
        const chainBalance = await this._deployedLucidao.balanceOf(airdropAddress);
        if (chainBalance.gt("0")) {
            throw new Error(`Address ${airdropAddress} has a non-zero balance!`);
        }

        //check if the airdrop address is a contract
        if (await RedeployManager.isContract(airdropAddress)) {
            throw new Error(`Address ${airdropAddress} is a contract!`);
        }

        const entry = this._tokenHoldersResult.find(x => x.HolderAddress.toLowerCase() == airdropAddress.toLowerCase());
        if (entry) {
            throw new Error(`Found airdrop address ${airdropAddress} in file ${this._tokenHolderFile}`);
        }
        let airdropFilename = await this.writeAirdropTargetFile();
        let airdropFileBalance = await this.checkBalanceInAirdropFile(airdropFilename);

        let computedAirdropFileBalance = BigNumber.from(airdropFileBalance)
            .add(this._excludedContractBalance);

        if (!airdropBalance.eq(computedAirdropFileBalance)) {
            throw Error(`Airdrop balance in file differs from computed airdrop balance.\n` +
                `From file: ${computedAirdropFileBalance} Computed: ${airdropBalance}`)
        }
        this._airdropFilename = airdropFilename;
        return airdropFileBalance;
    }

    public static async isContract(address: string) {
        let code = await ethers.provider.getCode(address);
        return code != "0x";
    }

    private async checkBalanceOnChain() {
        for await (const row of this._tokenHoldersResult) {
            const bal = this.getBalanceFromString(row.Balance);
            const chainBalance = await this._deployedLucidao.balanceOf(row.HolderAddress);
            if (!bal.eq(chainBalance)) {
                console.log(`${row.HolderAddress} expected value differs from read value:`);
                console.log(bal.toString());
                console.log(chainBalance.toString());
            }
        }
    }

    private async transferAllLucidaoUnitsTo(distributableAmounts: DistributableAmounts) {
        if (!this._excludedContractBalance.eq("0")
            ||
            !this._lcdFromRoundingError.eq("0")) {
            console.log("");
            await this.ask(`Found balances that will be added to liquidity address \n` +
                `Excluded contract Holder: ${this._excludedContractBalance}\n` +
                `Lcd rounding error      : ${this._lcdFromRoundingError}\n` +
                `Continue?`);
            console.log("");
        }
        const liquidityAmount = distributableAmounts.Liquidity.sub(this._lcdFromRoundingError).add(this._excludedContractBalance);
        const computedTotalAmount = distributableAmounts.Aidrop.add(distributableAmounts.GovernanceReserve)
            .add(liquidityAmount).add(this._expectedVestingTreasuryLcdBalance);

        if (!computedTotalAmount.eq(this._parsedTotalSupply)) {
            await this.ask(`Computed total amount differs from total supply.\n` +
                `Computed:     ${computedTotalAmount}\n` +
                `Total Supply: ${this._parsedTotalSupply}\n` +
                `Continue?`);
        }

        console.group()
        console.log("")
        //Governance
        console.log(`Transferring ${distributableAmounts.GovernanceReserve} to governance reserve...`);
        if (!this._dryRunMode) {
            await transferLuciDaoUnitsTo(this._deployedLucidao,
                "GovernanceReserve",
                this._luciDaoGovernanceReserveAddress,
                distributableAmounts.GovernanceReserve);
        } else {
            console.log("Skipping lucidao transfer to governance reserve...")
        }
        console.log(`${ethers.utils.formatEther(distributableAmounts.GovernanceReserve)} lcd sent to the GovernanceReserve ${this._luciDaoGovernanceReserveAddress}`);
        console.groupEnd();

        //TODO: check if is correct to remove the lcd in excess from the liquidity quantity
        console.group()
        console.log("")
        console.log(`Transferring ${liquidityAmount} to Liquidity address...`);
        if (!this._dryRunMode) {
            await transferLuciDaoUnitsTo(this._deployedLucidao,
                "Liquidity Manager",
                this._luciDaoLiquidityAddress,
                liquidityAmount);
        } else {
            console.log("Skipping lucidao transfer to liquidity manager...")
        }
        console.log(`${ethers.utils.formatEther(liquidityAmount)} Lcd sent to the Liquidity manager  ${this._luciDaoLiquidityAddress}`);
        console.groupEnd();

        console.group()
        console.log("")
        console.log(`Transferring ${distributableAmounts.Aidrop} to airdrop address...`);
        if (!this._dryRunMode) {
            await transferLuciDaoUnitsTo(this._deployedLucidao,
                "AirdropManager Manager",
                this._airdropManagerAddress,
                distributableAmounts.Aidrop);
        } else {
            console.log("Skipping lucidao transfer to airdrop manager...")
        }
        console.log(`${ethers.utils.formatEther(distributableAmounts.Aidrop)} Lcd sent to the Airdrop manager ${this._airdropManagerAddress}`);
        console.groupEnd();
        console.log("")
    }

    public async processFile() {
        const [deployer] = await ethers.getSigners();
        if (this.interactive) {
            console.log("");
            this._dryRunMode = await yesno({
                question: "Enter dry run mode? (n=will transfer lucidao...) [Default: yes]",
                defaultValue: true
            });
            if (this._dryRunMode) {
                console.log("Dry run mode");
            }
            if (isDevelopment() && onPolygonMainnetChain() &&
                !this._dryRunMode && !usingAnonymizedScriptsAndContracts()) {
                console.log("forced dry run because of dev NODE_ENV");
                this._dryRunMode = true;
            }
            console.log("");
        };
        console.log("Checking deployer");
        console.group()
        await this.checkDeployer(deployer);
        console.groupEnd();
        console.log("Processing file");
        console.group()
        await this.readTokenHolderFile();
        console.groupEnd();
        console.log("Searching for pending transaction....");
        console.group()
        this.checkIfExistsPendingTransaction();
        console.groupEnd();
        // await this.checkBalanceOnChain(deployedLucidao);
        console.log("Check Total Supply....");
        console.group()
        await this.checkTotalSupply();
        console.groupEnd();
        console.log("Check Balance....");
        console.group()
        const distributableAmounts = await this.processTokenBalanceForTargetAccounts();
        console.groupEnd();
        console.log("Transfer Lucidao....");
        console.group()
        if (!this._dryRunMode) {
            this.ask("Ready for LCD transferring?")
        }
        await this.transferAllLucidaoUnitsTo(distributableAmounts);
        console.groupEnd();
        console.log("...Don't forget to finalize the governance ownership!")
        console.log("");
        const deployerBalance = await this._deployedLucidao.balanceOf(deployer.address);
        console.log(`Deployer LCD balance: ${deployerBalance}`);
        console.log("");
        console.log(`Ignored contract address for LCD redistribution:\n` +
            `${this._ignoredContractAddressForAirdrop.map(x => x.HolderAddress).join("\n")}`);
        console.log("");
    }
}
