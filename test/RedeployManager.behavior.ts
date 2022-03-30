import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { rmSync } from 'fs';
import { ethers } from 'hardhat';
import { Context } from 'mocha';
import { lcdAllocations, totalSupply } from '../config/config';
import { getOrDeployLuciDao, transferLuciDaoTo } from '../scripts/deployFunctions';
import { RedeployManager } from '../scripts/redeployManager';
import { checkSkipTest } from './Utilities';


export function redeployManagerBehavior(): void {
    it("convert to decimal", async function () {
        checkSkipTest(this.skipTest, this);
        const redeployManager = new RedeployManager(
            this.luciDaoToken,
            "./test/assets/test_tokenholders.csv",
            this.airdropManagerAddress,
            this.signer.address,
            this.signer.address,
            this.signer.address,
            "0",
            this.redeployReserveLcdBalance,
            new Map<string, string>(),
            false);

        const cases = [
            {
                val: "2324.43773115345",
                expected: "2324437731153450000000"
            },
            {
                val: "7.5e-05",
                expected: "75000000000000"
            },
            {
                val: "1e-18",
                expected: "1"
            },
            {
                val: "1500",
                expected: "1500000000000000000000"
            },
            {
                val: "9.195403620051e-06",
                expected: "9195403620051"
            },
            {
                val: "7.5e-05",
                expected: "75000000000000"
            }
        ]
        for (let testCase of cases) {
            expect(testCase.expected).to.be
                .eq(redeployManager
                    .getBalanceFromString(testCase.val)
                    .toString()
                ), `${testCase.expected} differ from ${testCase.val}`;

        }
    });

    it("is contract", async function () {
        checkSkipTest(this.skipTest, this);
        expect(await RedeployManager.isContract(this.signer.address))
            .to.be.eq(false);
        const lucidao = await getOrDeployLuciDao();
        expect(await RedeployManager.isContract(lucidao.address))
            .to.be.eq(true);
    });

    it("test redeploy with total balance greater than of total supply", async function () {
        checkSkipTest(this.skipTest, this);
        const luciDaoLiquidityAddress = "0x4195008ce39c287e23cd58c535b1f0b7c53bd0e4";
        const luciDaoGovernanceReserveAddress = "0x881d440A7e047335BE81BBB27dBA6AEe9c2aa529";
        const luciDaoVestingTreasuryAddress = "0x3Ade8146e3c6Ec5275F768cB93EEac78363Ceb10";

        await transferLuciDaoTo(this.luciDaoToken,
            "vesting treasury transfer",
            luciDaoVestingTreasuryAddress,
            lcdAllocations.vestingTreasury);

        const redeployLiquidityLcdBalance = "175749.698594373";

        const redeployManager = new RedeployManager(
            this.luciDaoToken,
            "./test/assets/test_tokenholders.csv",
            this.airdropManagerAddress,
            luciDaoGovernanceReserveAddress,
            luciDaoLiquidityAddress,
            luciDaoVestingTreasuryAddress,
            redeployLiquidityLcdBalance,
            this.redeployReserveLcdBalance,
            new Map<string, string>(),
            false);

        await checkRedeploy(this,
            redeployManager,
            luciDaoGovernanceReserveAddress,
            luciDaoLiquidityAddress,
            luciDaoVestingTreasuryAddress,
            redeployLiquidityLcdBalance,
            "0",
            "58689852538",
            0
        );
    });

    it("test redeploy with total balance lower than of total supply", async function () {
        checkSkipTest(this.skipTest, this);
        const luciDaoLiquidityAddress = "0x283f0ba522d027d7257fbff1ff6baa990bdc83ab";
        const luciDaoGovernanceReserveAddress = "0x881d440A7e047335BE81BBB27dBA6AEe9c2aa529";
        const luciDaoVestingTreasuryAddress = "0x3Ade8146e3c6Ec5275F768cB93EEac78363Ceb10";

        await transferLuciDaoTo(this.luciDaoToken,
            "vesting treasury transfer",
            luciDaoVestingTreasuryAddress,
            lcdAllocations.vestingTreasury);

        let fantomAddresses: Map<string, string> = new Map<string, string>();
        fantomAddresses.set(RedeployManager.GovernanceReserveLabel,
            "0x154a54f6d994038540d9f084382B90eC00195257");

        fantomAddresses.set(RedeployManager.VestingTreasuryLabel,
            "0x8455e95a6b5560f49d3266d50e8d0596bb0f4384");

        const redeployLiquidityLcdBalance = "298613.0742919050";

        const csvFilename = "./tmp.csv"
        const createCsvWriter = require('csv-writer').createArrayCsvWriter;
        const csvWriter = createCsvWriter({
            path: csvFilename,
            header: ["HolderAddress", "Balance", "PendingBalanceUpdate"]
        });

        expect(await RedeployManager.isContract(this.luciDaoToken.address))
            .to.be.true;

        let contractAmount = "4";

        await csvWriter.writeRecords([
            ["0x01bd6ef4ccd2fff86eb40b89e2aefa105cccad5c", "123668.338209863", "No"],
            ["0x1234597c1a4336ec7519e68edba541a0f460c032", "177798.576341292", "No"],
            ["0x283f0ba522d027d7257fbff1ff6baa990bdc83ab", "298613.074291905", "No"],
            ["0x154a54f6d994038540d9f084382b90ec00195257", "580800000", "No"],
            ["0x251612075db39256e11f2ce8fd5e91837ec41cd3", "56413.3870256971", "No"],
            ["0x350352abf0f17d910a11ce65c56bc6056808e1f9", "250218.631527039", "No"],
            ["0x40d26e08c841ed291ebf2417691b5c23aefeb36e", "1E-18", "No"],
            ["0x48cb62ae080ddf2aa18b2d69e83410dc3225b6ec", "18628.2601266728", "No"],
            ["0x53f46e658435b8768cb6fbcb42eca8bdfe242f55", "4.87E-07", "No"],
            ["0x579a440528e21d264be1b0a55b7e72d230d3943c", "100", "No"],
            ["0x5f06f403863ca55d7313a366dd22a740b01a007d", "1.48949848498542", "No"],
            ["0x777336ae2cef9ddc261a61a97cbfb4e0aa7d1329", "12544.5211597317", "No"],
            ["0x80a053637fd28e1b59c73ea064f702eb02836d0c", "18200000", "No"],
            ["0x8455e95a6b5560f49d3266d50e8d0596bb0f4384", "88000000", "No"],
            ["0xa7f7c11e830b7fdecf2a7ce5f70cd569124d42e6", "8322.56770745575", "No"],
            ["0xbe2ff9f47ba7fe8e432be2e12b0d0b29ab510704", "4425.93196449663", "No"],
            ["0xd10fab07afd4bf7d6c3f0254051afac0736902f2", "191999894.510501", "No"],
            ["0xe1be0a9eed3f6692cc563ec986ff0b34fcfe5833", "9281.5028708017", "No"],
            ["0xf15e603e71325526e995634adb15ed61f41db564", "40085.2087750447", "No"],
            [this.luciDaoToken.address, contractAmount, "No"]
        ]);

        const redeployManager = new RedeployManager(
            this.luciDaoToken,
            csvFilename,
            "0x471a074Ae1EAc816a12DF51a9F086ab1De9e23F5",
            luciDaoGovernanceReserveAddress,
            luciDaoLiquidityAddress,
            luciDaoVestingTreasuryAddress,
            redeployLiquidityLcdBalance,
            this.redeployReserveLcdBalance,
            fantomAddresses,
            false);

        await checkRedeploy(this,
            redeployManager,
            luciDaoGovernanceReserveAddress,
            luciDaoLiquidityAddress,
            luciDaoVestingTreasuryAddress,
            redeployLiquidityLcdBalance,
            contractAmount,
            "-28634579999",
            1
        );

        rmSync(`./${csvFilename}`);
        console.log("test file removed");
    });
}

async function checkRedeploy(context: Context,
    redeployManager: RedeployManager,
    luciDaoGovernanceReserveAddress: string,
    luciDaoLiquidityAddress: string,
    luciDaoVestingTreasuryAddress: string,
    redeployLiquidityLcdBalance: string,
    contractAmount: string,
    lcdExcess: string,
    ignoredContractCount: number
) {
    let liquidityAddressBalance = await context.luciDaoToken.balanceOf(luciDaoLiquidityAddress);
    let governanceReserveAddressBalance = await context.luciDaoToken.balanceOf(luciDaoGovernanceReserveAddress);
    const vestingTreasuryAmount = await context.luciDaoToken.balanceOf(luciDaoVestingTreasuryAddress);

    expect(vestingTreasuryAmount).to.be.eq(
        ethers.utils.parseEther(lcdAllocations.vestingTreasury)
    );

    expect(liquidityAddressBalance).to.be.eq(
        ethers.utils.parseEther("0")
    );
    expect(governanceReserveAddressBalance).to.be.eq(
        ethers.utils.parseEther("0")
    );

    await redeployManager.processFile();

    liquidityAddressBalance = await context.luciDaoToken.balanceOf(luciDaoLiquidityAddress);
    expect(liquidityAddressBalance).to.be.eq(
        ethers.utils.parseEther(redeployLiquidityLcdBalance)
            .sub(redeployManager.lcdExcess)
            .add(redeployManager.excludedContractBalance)
    );

    governanceReserveAddressBalance = await context.luciDaoToken.balanceOf(luciDaoGovernanceReserveAddress);
    expect(governanceReserveAddressBalance).to.be.eq(
        ethers.utils.parseEther(context.redeployReserveLcdBalance)
    );

    expect(redeployManager.lcdExcess)
        .to.be.eq(BigNumber.from(lcdExcess));

    const airdropFilename = `./${redeployManager.airdropFilename}`;
    let airdropFileBalance = await redeployManager.checkBalanceInAirdropFile(airdropFilename);

    expect(redeployManager.excludedContractBalance)
        .to.be.eq(ethers.utils.parseEther(contractAmount));

    expect(redeployManager.ignoredContractAddressForAirdrop.length)
        .to.be.eq(ignoredContractCount);

    expect(ethers.utils.parseEther(totalSupply))
        .to.be.eq(airdropFileBalance
            .add(vestingTreasuryAmount)
            .add(governanceReserveAddressBalance)
            .add(liquidityAddressBalance));

    const deployerBalance = await context.luciDaoToken.balanceOf(context.signer.address);
    expect(deployerBalance).to.be.eq(0);

    rmSync(`./${airdropFilename}`);
    console.log("airdropfile removed");
}