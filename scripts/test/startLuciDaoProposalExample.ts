import { ethers } from "hardhat";
import { luciDaoTokenAddress, luciDaoGovernanceProxy, luciDaoGovernanceReserveAddress } from "../../config/config";

async function main() {
    const [deployer, team] = await ethers.getSigners();

    console.log(`Proposing with the account: ${deployer.address}`);

    const luciDaoToken = await ethers.getContractAt("Lucidao", luciDaoTokenAddress);
    const luciDaoGovernor = await ethers.getContractAt("LucidaoGovernor", luciDaoGovernanceProxy);
    const luciDaoGovernanceReserve = await ethers.getContractAt("LucidaoGovernanceReserve", luciDaoGovernanceReserveAddress);

    const grantAmount = ethers.utils.parseUnits("15000");
    const approveCalldata = luciDaoGovernanceReserve.interface.encodeFunctionData("approveToken", [luciDaoToken.address, grantAmount, team.address]);
    const transferCalldata = luciDaoToken.interface.encodeFunctionData("transferFrom", [luciDaoGovernanceReserve.address, team.address, grantAmount]);

    const proposalDescription = "Proposal #1: Give grant to team";
    const proposalId = await luciDaoGovernor.propose(
        [luciDaoGovernanceReserve.address, luciDaoToken.address],
        [0, 0],
        [approveCalldata, transferCalldata],
        proposalDescription,
    );

    console.log(`Proposal Id: ${proposalId}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });