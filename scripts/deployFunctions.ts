import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { ethers, run, upgrades } from "hardhat";
import { fantomMainnetfUsdtAddress, lcdAllocations, preSale, publicSale, releaseTime, timelockMinDelayInSeconds, usdtForLiquidity, usdtToMintForAddress } from "../config/config";
import { AnyswapV3ERC20, Lucidao, LucidaoGovernanceReserve, LucidaoGovernor, LucidaoPublicSale, LucidaoSale, LucidaoTimelock, LucidaoVestingTreasury } from "../typechain";
import { GetOpenzeppelinUnknownFile, importModule, isDevelopment, removeOpenzeppelinUnknownFile, skipContractVerify } from './utilities';

// *** Lucidao contract ***
export async function deployLuciDao(): Promise<Lucidao> {
    const contractName = "Lucidao";
    console.log(`\nDeploying contract ${contractName}`);

    // DEPLOY LUCIDAO DAO TOKEN
    const LuciDao = await ethers.getContractFactory(contractName);
    const luciDao = await LuciDao.deploy();
    await luciDao.deployed();
    console.log(`${contractName} address: ${luciDao.address}`);

    await verifyContract(contractName, { address: luciDao.address });

    return luciDao;
}

// *** Timelock Governance ***
export async function deployLuciDaoTimelock(): Promise<LucidaoTimelock> {
    const contractName = "LucidaoTimelock";
    console.log(`\nDeploying contract ${contractName}`);

    // DEPLOY LUCIDAO TIMELOCK
    const LuciDaoTimelock = await ethers.getContractFactory(contractName);
    const luciDaoTimelock = await LuciDaoTimelock.deploy(timelockMinDelayInSeconds, [], []);
    await luciDaoTimelock.deployed();
    console.log(`${contractName} address: ${luciDaoTimelock.address}`);

    await verifyContract(contractName, { address: luciDaoTimelock.address, contract: "contracts/LuciDaoTimelock.sol:LucidaoTimelock", constructorArguments: [timelockMinDelayInSeconds, [], []] });

    return luciDaoTimelock;
}

// *** Proxied Governance ***
export async function deployProxiedGovernance(deployer: SignerWithAddress, luciDao: Lucidao, luciDaoTimelock: LucidaoTimelock) {
    const chainId = await deployer.getChainId();
    removeOpenzeppelinUnknownFile(chainId);

    const contractName = "LucidaoGovernor";
    console.log(`\nDeploying contract ${contractName}`);

    // DEPLOY PROXIED GOVERNANCE
    const contractArgs = [luciDao.address, luciDaoTimelock.address];
    const LuciDaoGovernor = await ethers.getContractFactory(contractName);
    const luciDaoGovernor = await upgrades.deployProxy(LuciDaoGovernor, contractArgs) as LucidaoGovernor;
    await luciDaoGovernor.deployed();
    console.log(`${contractName} address: ${luciDaoGovernor.address}`);

    const PROPOSER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PROPOSER_ROLE"));
    const EXECUTOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EXECUTOR_ROLE"));
    const TIMELOCK_ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    await (await luciDaoTimelock.grantRole(PROPOSER_ROLE, luciDaoGovernor.address)).wait();
    await (await luciDaoTimelock.grantRole(EXECUTOR_ROLE, ethers.constants.AddressZero)).wait();
    await (await luciDaoTimelock.grantRole(TIMELOCK_ADMIN_ROLE, luciDaoGovernor.address)).wait();
    await (await luciDaoTimelock.renounceRole(TIMELOCK_ADMIN_ROLE, deployer.address)).wait();
    console.log("Timelock roles renounced and given to governance");

    // await upgrades.admin.changeProxyAdmin(lucidGovernor.address, lucidTimelock.address);
    await upgrades.admin.transferProxyAdminOwnership(luciDaoTimelock.address);
    console.log("ProxyAdmin ownership given to timelock");

    await verifyGovernanceImplementation(deployer, contractName);

    return luciDaoGovernor;
}

// *** Proxied Governance ***
async function verifyGovernanceImplementation(deployer: SignerWithAddress, contractName: string) {
    try {
        const chainId = await deployer.getChainId();
        const moduleName = GetOpenzeppelinUnknownFile(chainId);
        console.log(`Reading proxy governance contract json: ${moduleName}`);
        const mod = await importModule(moduleName);
        const targetKey = Object.keys(mod.impls)[0];
        const lucidGovernorImplAddress = mod.impls[targetKey].address;
        console.log(`Found governance implementation in proxy governance json. Address: ${lucidGovernorImplAddress}`);
        await verifyContract(contractName, { address: lucidGovernorImplAddress, /*constructorArguments: contractArgs*/ });
    } catch (error) {
        console.log(`Warning: problem while verifying governance contract. Skip! Error detail: ${error}`);
    }
}

// *** Governance Reserve ***
export async function deployLuciDaoGovernanceReserve(liquidityVaultAddress: string, luciDao: Lucidao, liquidityToken: AnyswapV3ERC20, luciDaoTimelock: Contract): Promise<LucidaoGovernanceReserve> {
    const contractName = "LucidaoGovernanceReserve";
    console.log(`\nDeploying contract ${contractName}`);
    console.log(`Liquidity Vault Address ${liquidityVaultAddress}`);

    // DEPLOY GOVERNANCE RESERVE
    const contractArgs = [liquidityToken.address, liquidityVaultAddress, usdtForLiquidity] as const;
    const LuciDaoGovernanceReserve = await ethers.getContractFactory(contractName);
    const luciDaoGovernanceReserve = await LuciDaoGovernanceReserve.deploy(...contractArgs);
    await luciDaoGovernanceReserve.deployed();
    console.log(`${contractName} address: ${luciDaoGovernanceReserve.address}`);

    await (await luciDaoGovernanceReserve.transferOwnership(luciDaoTimelock.address)).wait();
    console.log(`${contractName} ownership given to timelock of governance ${luciDaoTimelock.address}`);

    await transferLuciDaoTo(luciDao, contractName, luciDaoGovernanceReserve.address, lcdAllocations.governanceReserve);

    await verifyContract(contractName, { address: luciDaoGovernanceReserve.address, constructorArguments: contractArgs });

    return luciDaoGovernanceReserve;
}

// *** Vesting Treasury ***
export async function deployLuciDaoVestingTreasury(luciDao: Lucidao, luciDaoGovernanceReserve: LucidaoGovernanceReserve): Promise<LucidaoVestingTreasury> {
    const contractName = "LucidaoVestingTreasury";
    console.log(`\nDeploying contract ${contractName}`);

    // DEPLOY VESTING TREASURY
    const LuciDaoVestingTreasury = await ethers.getContractFactory(contractName);
    const contractArgs = [luciDao.address, luciDaoGovernanceReserve.address, releaseTime] as const;
    const luciDaoVestingTreasury = await LuciDaoVestingTreasury.deploy(...contractArgs);
    await luciDaoVestingTreasury.deployed();
    console.log(`${contractName} address ${luciDaoVestingTreasury.address}`);

    await transferLuciDaoTo(luciDao, contractName, luciDaoVestingTreasury.address, lcdAllocations.vestingTreasury);

    await verifyContract(contractName, { address: luciDaoVestingTreasury.address, contract: "contracts/LuciDaoVestingTreasury.sol:LucidaoVestingTreasury", constructorArguments: contractArgs });

    return luciDaoVestingTreasury;
}

// *** fUSDT contract ***
export async function getOrDeployfUsdt(vault: SignerWithAddress, whitelistedAddresses?: string[]): Promise<AnyswapV3ERC20> {
    if (!isDevelopment()) {
        console.log(`\nRetrieving Fantom MainNet FUSDT at address ${fantomMainnetfUsdtAddress}`);
        return await ethers.getContractAt("AnyswapV3ERC20", fantomMainnetfUsdtAddress);
    };

    const contractName = "AnyswapV3ERC20";
    console.log(`\nDeploying contract ${contractName}`);

    // DEPLOY fUSDT
    const Fusdt = await ethers.getContractFactory(contractName);
    const fusdt = await Fusdt.deploy("Frapped USDT", "fUSDT", 6, ethers.constants.AddressZero, vault.address);
    await fusdt.deployed();
    console.log(`${contractName} address ${fusdt.address}`);

    if (whitelistedAddresses?.length) {
        for (let index = 0; index < whitelistedAddresses.length; index++) {
            const address = whitelistedAddresses[index];
            await mintfUsdtTo(fusdt, address, usdtToMintForAddress);
        }
    }

    //await verifyContract(contractName, { address: fusdt.address });

    return fusdt;
}

// *** Lucidao sale contracts ***
export async function deploySaleContracts(luciDao: Lucidao, luciDaoGovernanceReserve: LucidaoGovernanceReserve, liquidityToken: AnyswapV3ERC20, whitelisted: string[]): Promise<[LucidaoSale, LucidaoPublicSale]> {
    const preSaleContract = await deployPreSaleContract(luciDao, luciDaoGovernanceReserve, liquidityToken, whitelisted);
    const publicSaleContract = await deployPublicSaleContract(luciDao, luciDaoGovernanceReserve, liquidityToken);
    return [preSaleContract, publicSaleContract];

    // // ADD LIQUIDITY TO SUSHI
    // const Factory = await ethers.getContractFactory("Factory");
    // const factory = await Factory.attach("0xB7926C0430Afb07AA7DEfDE6DA862aE0Bde767bc");
    // const Router = await ethers.getContractFactory("Router");
    // const router = await Router.attach("0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3");

    // await factory.createPair(liquidityToken.address, lucid.address);
    // await liquidityToken.approve(router.address, ethers.utils.parseUnits("0.05"));
    // await lucid.approve(router.address, ethers.utils.parseUnits("1"));
    // // 20 LCD per USDT
    // await router.addLiquidity(liquidityToken.address, lucid.address, ethers.utils.parseUnits("0.05"), ethers.utils.parseUnits("0.05"), ethers.utils.parseUnits("1"), ethers.utils.parseUnits("1"), receiver, Math.round((new Date().getTime() + (60 * 10)) / 1000));

}

async function deployPreSaleContract(luciDao: Lucidao, luciDaoGovernanceReserve: LucidaoGovernanceReserve, liquidityToken: AnyswapV3ERC20, whitelisted: string[]): Promise<LucidaoSale> {
    const contractName = "LucidaoSale";
    console.log(`\nDeploying contract ${contractName}`);

    // DEPLOY PRESALE CONTRACT
    const saleArgs: [BigNumber, BigNumber, string, string, string, number, number, BigNumber, string[]] = [
        ethers.utils.parseUnits(preSale.rate, 12),
        ethers.utils.parseUnits(preSale.maxAmountSpendable, 6),
        luciDaoGovernanceReserve.address,
        luciDao.address,
        liquidityToken.address,
        preSale.startTime,
        preSale.endTime,
        ethers.utils.parseUnits(lcdAllocations.preSale),
        whitelisted
    ];

    const LuciDaoInitialSale = await ethers.getContractFactory(contractName);
    const luciDaoInitialSale = await LuciDaoInitialSale.deploy(...saleArgs);
    await luciDaoInitialSale.deployed();
    console.log(`${contractName}Initial address: ${luciDaoInitialSale.address}`);

    await transferLuciDaoTo(luciDao, contractName, luciDaoInitialSale.address, lcdAllocations.preSale);

    await verifyContract(contractName, { address: luciDaoInitialSale.address, constructorArguments: saleArgs });

    return luciDaoInitialSale;
}

async function deployPublicSaleContract(luciDao: Lucidao, luciDaoGovernanceReserve: LucidaoGovernanceReserve, liquidityToken: AnyswapV3ERC20): Promise<LucidaoPublicSale> {
    const contractName = "LucidaoPublicSale";
    console.log(`\nDeploying contract ${contractName}`);

    // DEPLOY PUBLIC SALE CONTRACT
    const publicSaleArgs = [
        ethers.utils.parseUnits(publicSale.rate, 12),
        ethers.utils.parseUnits(publicSale.maxAmountSpendable, 6),
        luciDaoGovernanceReserve.address,
        luciDao.address,
        liquidityToken.address,
        publicSale.startTime,
        publicSale.endTime,
        ethers.utils.parseUnits(lcdAllocations.publicSale)
    ] as const;
    const LuciDaoPublicSale = await ethers.getContractFactory(contractName);
    const luciDaoPublicSale = await LuciDaoPublicSale.deploy(...publicSaleArgs);
    await luciDaoPublicSale.deployed();
    console.log(`${contractName} address: ${luciDaoPublicSale.address}`);

    await transferLuciDaoTo(luciDao, contractName, luciDaoPublicSale.address, lcdAllocations.publicSale);

    await verifyContract(contractName, { address: luciDaoPublicSale.address, constructorArguments: publicSaleArgs });

    return luciDaoPublicSale;
}

// *** Verify contract ***
export async function verifyContract(name: string, taskArguments?: any) {
    if (skipContractVerify()) {
        return;
    }
    console.log(`Verifying contract ${name}`);
    await new Promise(r => setTimeout(r, 5000));

    try {
        await run("verify:verify", taskArguments);
    } catch (error) {
        console.log(`Unable to verify contract ${name}`);
        console.log(error);
    }
}

// *** Transfer functions ***
export async function transferLuciDaoToLiquidityVault(luciDao: Lucidao, liquidityVaultAddress: string) {
    //FIXME: set final liquidity vault address in config

    await transferLuciDaoTo(luciDao, "LiquidityVault", liquidityVaultAddress, lcdAllocations.liquidityVault);
}

async function transferLuciDaoTo(luciDao: Lucidao, contractName: string, contractAddress: string, qty: string) {
    await (await luciDao.transfer(contractAddress, ethers.utils.parseUnits(qty))).wait();
    console.log(`${contractName}: transferred ${qty.toString()} Lucidao to ${contractAddress}`);
}

export async function mintfUsdtTo(fUsdt: AnyswapV3ERC20, address: string, qty: string) {
    await (await fUsdt.mint(address, ethers.utils.parseUnits(qty, 6))).wait();
    console.log(`Transferred ${qty.toString()} fUSDT to ${address}`);
}

export async function addToPublicSaleWhitelist(luciDaoPublicSale: LucidaoPublicSale, whitelistedAddresses: string[]) {
    for (let index = 0; index < whitelistedAddresses.length; index++) {
        const address = whitelistedAddresses[index];
        await (await luciDaoPublicSale.addToWhitelist(address)).wait();
        console.log(await luciDaoPublicSale.isWhitelisted(address) ? `${address} has been whitelisted for public sale` : `ERROR: ${address} has not been whitelisted`);
    }
}