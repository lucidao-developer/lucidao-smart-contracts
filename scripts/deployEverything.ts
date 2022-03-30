import yesno from 'yesno';
import { ethers } from "hardhat";
import {
    getOrDeployLuciDao, getOrDeployLuciDaoGovernanceReserve,
    getOrDeployProxiedGovernance, getOrDeployLuciDaoTimelock,
    getOrDeployLuciDaoVestingTreasury,
    getOrDeployLuciDaoVisionProposals,
    renounceTimelockAdminRole
} from "./deployFunctions";

async function main() {
    const [deployer] = await ethers.getSigners();
    // const FEE_DATA = {
    //     maxFeePerGas:         ethers.utils.parseUnits('700', 'gwei'),
    //     maxPriorityFeePerGas: ethers.utils.parseUnits('205',   'gwei'),
    //     gasPrice: null
    // };
    // provider.getFeeData = async () => FEE_DATA;
    // FIXME: Standardaze gas fee management using a fallback provider

    // TODO: take in input a snapshot json and define lcd quantities to distribute

    console.log(`Deploying contracts with the account: ${deployer.address} on Network: ${process.env.HARDHAT_NETWORK}`);
    console.log(`Account balance: ${(await deployer.getBalance()).toString()}`);
    const ok = await yesno({
        question: `* "Proseguire?"`
    });
    if (!ok) {
        process.exit(1);
    }

    // DEPLOY LUCID TOKEN
    const luciDao = await getOrDeployLuciDao();

    // DEPLOY TIMELOCK GOVERNANCE
    const luciDaoTimelock = await getOrDeployLuciDaoTimelock();

    // DEPLOY PROXIED GOVERNANCE
    const luciDaoGovernor = await getOrDeployProxiedGovernance(deployer, luciDao, luciDaoTimelock);

    // DEPLOY LUCID DAO VAULT
    const luciDaoGovernanceReserve = await getOrDeployLuciDaoGovernanceReserve(luciDao, luciDaoTimelock);

    // DEPLOY LUCID VISION PROPOSALS
    const luciDaoVisionProposals = await getOrDeployLuciDaoVisionProposals(luciDaoTimelock);

    // DEPLOY LUCID VESTING VAULT
    const luciDaoVestingTreasury = await getOrDeployLuciDaoVestingTreasury(luciDao, luciDaoGovernanceReserve);

    await renounceTimelockAdminRole(deployer, luciDaoTimelock);

    // TODO: script finalize migration?
    // await (await luciDaoGovernanceReserve.transferOwnership(luciDaoTimelock.address)).wait();
    // console.log(`${contractName} ownership given to timelock of governance ${luciDaoTimelock.address}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });