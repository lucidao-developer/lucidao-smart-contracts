import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getImplementationAddress } from '@openzeppelin/upgrades-core';
// import { getManifestAdmin } from '@openzeppelin/hardhat-upgrades/src/admin';
import { BigNumber } from "ethers";
import { ethers, network, run, upgrades } from "hardhat";
import { CANCELLER_ROLE, EXECUTOR_ROLE, lcdAllocations, luciDaoGovernanceProxy, luciDaoGovernanceReserveAddress, luciDaoTokenAddress, luciDaoVestingTreasuryAddress, luciDaoVisionProposalsAddress, PROPOSER_ROLE, releaseTime, timelockAddress, timelockMinDelayInSeconds, TIMELOCK_ADMIN_ROLE } from "../config/config";
import { Lucidao, LucidaoGovernanceReserve, LucidaoGovernor, LucidaoTimelock, LucidaoVestingTreasury, LucidaoVisionProposals } from "../typechain";
import { isStrictMode, readFtmDeployNoncesJson, removeOpenzeppelinUnknownFile, skipContractVerify, testRunningInHardhat } from './utilities';
import { FeeData } from "@ethersproject/abstract-provider";

const gasFeeArgs = { maxPriorityFeePerGas: 100000000000, maxFeePerGas: 800000000000 };

// *** Lucidao contract ***
export async function getDeployedLuciDao(): Promise<Lucidao> {
    const contractName = "Lucidao";

    if (!luciDaoTokenAddress) {
        throw new Error("Uninitialized LucidaoTokenAddress!")
    };

    console.log(`\nFound contract ${contractName} implementation at address ${luciDaoTokenAddress}`);
    return await ethers.getContractAt(contractName, luciDaoTokenAddress);
}

export async function getOrDeployLuciDao(): Promise<Lucidao> {
    const contractName = "Lucidao";

    if (luciDaoTokenAddress && !testRunningInHardhat()) {
        return getDeployedLuciDao();
    };

    console.log(`\nDeploying contract ${contractName}`);

    await checkNonce(contractName);

    // DEPLOY LUCIDAO DAO TOKEN
    const LuciDao = await ethers.getContractFactory(contractName);
    const luciDao = await LuciDao.deploy(gasFeeArgs);
    await luciDao.deployed();
    console.log(`${contractName} address: ${luciDao.address}`);

    checkContractAddress(contractName, luciDao.address);

    await verifyContract(contractName, { address: luciDao.address });

    return luciDao;
}

// *** Timelock Governance ***
export async function getOrDeployLuciDaoTimelock(): Promise<LucidaoTimelock> {
    const contractName = "LucidaoTimelock";

    if (timelockAddress && !testRunningInHardhat()) {
        console.log(`\nFound contract ${contractName} implementation at address ${timelockAddress}`);
        return await ethers.getContractAt(contractName, timelockAddress);
    };

    console.log(`\nDeploying contract ${contractName}`);

    await checkNonce(contractName);

    // DEPLOY LUCIDAO TIMELOCK
    const LuciDaoTimelock = await ethers.getContractFactory(contractName);
    const luciDaoTimelock = await LuciDaoTimelock.deploy(timelockMinDelayInSeconds, [], [], gasFeeArgs);
    await luciDaoTimelock.deployed();
    console.log(`${contractName} address: ${luciDaoTimelock.address}`);

    checkContractAddress(contractName, luciDaoTimelock.address);

    await verifyContract(contractName, {
        address: luciDaoTimelock.address,
        contract: `contracts/LuciDaoTimelock.sol:${contractName}`,
        constructorArguments: [timelockMinDelayInSeconds, [], []]
    });

    return luciDaoTimelock;
}

// *** Proxied Governance ***
export async function getOrDeployProxiedGovernance(deployer: SignerWithAddress, luciDao: Lucidao, luciDaoTimelock: LucidaoTimelock) {
    const contractName = "LucidaoGovernor";

    if (luciDaoGovernanceProxy && !testRunningInHardhat()) {
        console.log(`\nFound contract ${contractName} implementation at address ${luciDaoGovernanceProxy}`);
        const luciDaoGovernor = await ethers.getContractAt(contractName, luciDaoGovernanceProxy);
        return luciDaoGovernor;
    };

    await checkNonce(contractName);

    console.log(`\nDeploying contract ${contractName}`);
    const chainId = await deployer.getChainId();
    if (testRunningInHardhat()) {
        removeOpenzeppelinUnknownFile(chainId);
    };

    let signer = ethers.Wallet.fromMnemonic(process.env.MNEMONIC).connect(deployer.provider!);;

    if (!testRunningInHardhat()) {
        //https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/85#issuecomment-1028435049
        const FEE_DATA: FeeData = {
            maxFeePerGas: ethers.utils.parseUnits('801', 'gwei'),
            maxPriorityFeePerGas: ethers.utils.parseUnits('101', 'gwei'),
            gasPrice: null
        };

        const provider = new ethers.providers.FallbackProvider([ethers.provider], 1);
        provider.getFeeData = async () => FEE_DATA;

        signer = ethers.Wallet.fromMnemonic(process.env.MNEMONIC).connect(provider);
    }

    // DEPLOY PROXIED GOVERNANCE
    const contractArgs = [luciDao.address, luciDaoTimelock.address];
    const LuciDaoGovernor = await ethers.getContractFactory(contractName, signer);
    const luciDaoGovernor = await upgrades.deployProxy(LuciDaoGovernor, contractArgs, { timeout: 0 }) as LucidaoGovernor;
    await luciDaoGovernor.deployed();
    console.log(`${contractName} address: ${luciDaoGovernor.address}`);

    checkContractAddress(contractName, await getImplementationAddress(network.provider, luciDaoGovernor.address));
    checkContractAddress("Proxy", luciDaoGovernor.address);

    await checkNonce("grantRoleTimelock1");
    await (await luciDaoTimelock.grantRole(PROPOSER_ROLE, luciDaoGovernor.address, gasFeeArgs)).wait();
    await checkNonce("grantRoleTimelock2");
    await (await luciDaoTimelock.grantRole(EXECUTOR_ROLE, ethers.constants.AddressZero, gasFeeArgs)).wait();
    await checkNonce("grantRoleTimelock3");
    await (await luciDaoTimelock.grantRole(TIMELOCK_ADMIN_ROLE, luciDaoGovernor.address, gasFeeArgs)).wait();
    await checkNonce("grantRoleTimelock4");
    await (await luciDaoTimelock.grantRole(CANCELLER_ROLE, luciDaoGovernor.address, gasFeeArgs)).wait();

    if (testRunningInHardhat()) {
        await renounceTimelockAdminRole(deployer, luciDaoTimelock);
    }

    // await upgrades.admin.changeProxyAdmin(lucidGovernor.address, lucidTimelock.address);
    // await upgrades.admin.transferProxyAdminOwnership(luciDaoTimelock.address);
    await checkNonce("transferOwnershipProxyAdmin");
    const contract = await upgrades.admin.getInstance();
    await (await contract.transferOwnership(luciDaoTimelock.address, gasFeeArgs)).wait();
    let actualProxyAdmin = await contract.owner();
    if (actualProxyAdmin != luciDaoTimelock.address) {
        console.error(`Error changing Ownership of proxy admin to lucidaoTimelock - LucidaoTimelock ${luciDaoTimelock.address} - Proxy Admin: ${actualProxyAdmin}`)
    }

    console.log("ProxyAdmin ownership given to timelock");

    //const contractParameter = `contracts/${contractName}.sol:${contractName}`;
    await verifyGovernanceImplementation(contractName, luciDaoGovernor);

    return luciDaoGovernor;
}

// *** Proxied Governance ***
export async function renounceTimelockAdminRole(deployer: SignerWithAddress, luciDaoTimelock: LucidaoTimelock) {
    await (await luciDaoTimelock.renounceRole(TIMELOCK_ADMIN_ROLE, deployer.address, gasFeeArgs)).wait();
    console.log("Timelock roles renounced for deployer address");
}

// *** Proxied Governance ***
async function verifyGovernanceImplementation(contractName: string, contract: Contract) {
    try {
        const lucidGovernorImplAddress = await getImplementationAddress(network.provider, contract.address);
        console.log(`Found governance implementation in proxy governance json. Address: ${lucidGovernorImplAddress}`);
        await verifyContract(contractName,
            {
                address: lucidGovernorImplAddress,
                /*contract: contractParameter
                constructorArguments: contractArgs*/
            });
    } catch (error) {
        console.log(`Warning: problem while verifying governance contract. Skip! Error detail: ${error}`);
    }
}

// *** Governance Reserve ***
export async function getOrDeployLuciDaoGovernanceReserve(luciDao: Lucidao, luciDaoTimelock: Contract): Promise<LucidaoGovernanceReserve> {
    const contractName = "LucidaoGovernanceReserve";

    if (luciDaoGovernanceReserveAddress && !testRunningInHardhat()) {
        console.log(`\nFound contract ${contractName} implementation at address ${luciDaoGovernanceReserveAddress}`);
        return await ethers.getContractAt(contractName, luciDaoGovernanceReserveAddress);
    };

    console.log(`\nDeploying contract ${contractName}`);

    await checkNonce(contractName);

    // DEPLOY GOVERNANCE RESERVE
    const LuciDaoGovernanceReserve = await ethers.getContractFactory(contractName);
    const luciDaoGovernanceReserve = await LuciDaoGovernanceReserve.deploy(gasFeeArgs);
    await luciDaoGovernanceReserve.deployed();
    console.log(`${contractName} address: ${luciDaoGovernanceReserve.address}`);

    checkContractAddress(contractName, luciDaoGovernanceReserve.address);

    if (testRunningInHardhat()) {
        await (await luciDaoGovernanceReserve.transferOwnership(luciDaoTimelock.address)).wait();
        console.log(`${contractName} ownership given to timelock of governance ${luciDaoTimelock.address}`);
        await transferLuciDaoTo(luciDao, contractName, luciDaoGovernanceReserve.address, lcdAllocations.governanceReserve);
    }

    await verifyContract(contractName, { address: luciDaoGovernanceReserve.address });

    return luciDaoGovernanceReserve;
}

export async function getOrDeployLuciDaoVisionProposals(luciDaoTimelock: Contract): Promise<LucidaoVisionProposals> {
    const contractName = "LucidaoVisionProposals";

    if (luciDaoVisionProposalsAddress && !testRunningInHardhat()) {
        console.log(`\nFound contract ${contractName} implementation at address ${luciDaoVisionProposalsAddress}`);
        return await ethers.getContractAt(contractName, luciDaoVisionProposalsAddress);
    };

    console.log(`\nDeploying contract ${contractName}`);

    await checkNonce(contractName);

    // DEPLOY VISION PROPOSALS CONTAINER
    const LuciDaoVisionProposals = await ethers.getContractFactory(contractName);
    const luciDaoVisionProposals = await LuciDaoVisionProposals.deploy(gasFeeArgs);
    await luciDaoVisionProposals.deployed();
    console.log(`${contractName} address: ${luciDaoVisionProposals.address}`);

    await checkNonce("transferOwnershipLucidaoVisionProposals");
    await (await luciDaoVisionProposals.transferOwnership(luciDaoTimelock.address, gasFeeArgs)).wait();
    console.log(`${contractName} ownership given to timelock of governance ${luciDaoTimelock.address}`);

    await verifyContract(contractName, { address: luciDaoVisionProposals.address });

    return luciDaoVisionProposals;
}

// *** Vesting Treasury ***
export async function getOrDeployLuciDaoVestingTreasury(luciDao: Lucidao, luciDaoGovernanceReserve: LucidaoGovernanceReserve): Promise<LucidaoVestingTreasury> {
    const contractName = "LucidaoVestingTreasury";

    if (luciDaoVestingTreasuryAddress && !testRunningInHardhat()) {
        console.log(`\nFound contract ${contractName} implementation at address ${luciDaoVestingTreasuryAddress}`);
        const luciDaoVestingTreasury = await ethers.getContractAt(contractName, luciDaoVestingTreasuryAddress);
        return luciDaoVestingTreasury;
    };

    console.log(`\nDeploying contract ${contractName}`);

    await checkNonce(contractName);

    // DEPLOY VESTING TREASURY
    const LuciDaoVestingTreasury = await ethers.getContractFactory(contractName);
    const contractArgs = [luciDao.address, luciDaoGovernanceReserve.address, releaseTime] as const;
    const luciDaoVestingTreasury = await LuciDaoVestingTreasury.deploy(...contractArgs, gasFeeArgs);
    await luciDaoVestingTreasury.deployed();
    console.log(`${contractName} address ${luciDaoVestingTreasury.address}`);

    checkContractAddress(contractName, luciDaoVestingTreasury.address);

    await transferLuciDaoTo(luciDao, contractName, luciDaoVestingTreasury.address, lcdAllocations.vestingTreasury);

    await verifyContract(contractName, {
        address: luciDaoVestingTreasury.address,
        contract: "contracts/LuciDaoVestingTreasury.sol:LucidaoVestingTreasury",
        constructorArguments: contractArgs
    });

    return luciDaoVestingTreasury;
}

// *** Verify contract ***
export async function verifyContract(name: string, taskArguments?: any) {
    if (skipContractVerify()) {
        return;
    }
    console.log(`Verifying contract ${name}`);
    await new Promise(r => setTimeout(r, 90000));

    try {
        await run("verify:verify", taskArguments);
    } catch (error) {
        console.log(`Unable to verify contract ${name}`);
        console.log(error);
    }
}

// *** Transfer LCD ***
export async function transferLuciDaoTo(luciDao: Lucidao, contractName: string, contractAddress: string, qty: string) {
    await (await luciDao.transfer(contractAddress, ethers.utils.parseUnits(qty), gasFeeArgs)).wait();
    console.log(`${contractName}: transferred ${qty.toString()} Lucidao to ${contractAddress}`);
}

export async function transferLuciDaoUnitsTo(luciDao: Lucidao, contractName: string, contractAddress: string, qty: BigNumber) {
    await (await luciDao.transfer(contractAddress, qty, gasFeeArgs)).wait();
    console.log(`${contractName}: transferred ${qty.toString()} Lucidao units to ${contractAddress}`);
}

// *** Nonce managing ***
async function checkNonce(txName: string) {
    if (!isStrictMode()) return;

    const [deployer] = await ethers.getSigners();
    const currentNonce = await deployer.getTransactionCount();
    const tx = readFtmDeployNoncesJson(txName);
    if (+tx.nonce !== currentNonce) throw new Error(`On tx named ${txName} the current nonce (${currentNonce}) and deploy nonce (${tx.nonce}) don't match`);
}

function checkContractAddress(txName: string, currentContractAddress: string) {
    if (!isStrictMode()) return;

    const tx = readFtmDeployNoncesJson(txName);
    if (tx.address !== currentContractAddress) throw new Error(`On tx named ${txName} the current address (${currentContractAddress}) and deploy address (${tx.address}) don't match`);
}

export async function transferOwnershipForGovernanceReserve(deployer: SignerWithAddress, governanceReserve: LucidaoGovernanceReserve, luciDao: Lucidao, timelock: LucidaoTimelock) {
    if (await governanceReserve.owner() != deployer.address) {
        throw new Error("Governance Reserve has an unexpected owner!")
    }

    const lucidaoBalance = await luciDao.balanceOf(governanceReserve.address);

    // if (!lucidaoBalance.eq(ethers.utils.parseEther(lcdAllocations.governanceReserveAfterInstitutionalSale))) {
    //     throw new Error("Governance Reserve has an unexpected balance!")
    // }

    await (await governanceReserve.transferOwnership(timelock.address)).wait();
    console.log(`GovernanceReserve ownership given to timelock of governance ${timelock.address}`);
}