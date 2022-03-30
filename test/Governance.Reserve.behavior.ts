import { expect } from "chai";
import { ethers, network, waffle } from "hardhat";
import { Votes } from "../config/config";
import { ProposalArgs } from "../types/mochaContextAugmentations";
import { checkSkipTest, enactProposal, voteProposal } from "./Utilities";

export function governanceReserveBehavior(): void {
    it("should allow increasing funds allowances with a governance operation", async function () {
        checkSkipTest(this.skipTest, this);
        const proposalDescription = "Proposal #4: increase allowance";
        const increaseAllowanceCalldata = this.luciDaoGovernanceReserve.interface.encodeFunctionData("increaseAllowanceToken", [this.luciDaoToken.address, this.oneEth, this.luciDaoTimelock.address]);
        await enactProposal(this.luciDaoGovernor, [this.luciDaoGovernanceReserve.address], [0], [increaseAllowanceCalldata], proposalDescription, Votes.For);

        expect(await this.luciDaoToken.allowance(this.luciDaoGovernanceReserve.address, this.luciDaoTimelock.address)).to.eq(this.oneEth);
    });

    it("should not allow another address to withdraw from vault without governance vote", async function () {
        checkSkipTest(this.skipTest, this);
        await this.luciDaoToken.transfer(this.luciDaoGovernanceReserve.address, this.oneEth);
        await expect(this.luciDaoGovernanceReserve.approveToken(this.luciDaoToken.address, this.oneEth, this.signer.address)).to.be.revertedWith("Ownable: caller is not the owner");
        await expect(this.luciDaoToken.transferFrom(this.luciDaoGovernanceReserve.address, this.addr1.address, this.oneEth))
            .to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("should not allow another address to modify allowance without governance vote", async function () {
        checkSkipTest(this.skipTest, this);
        await this.luciDaoToken.transfer(this.luciDaoGovernanceReserve.address, this.oneEth);
        await expect(this.luciDaoGovernanceReserve.increaseAllowanceToken(this.luciDaoToken.address, this.oneEth, this.signer.address)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Can transfer native token from governance", async function () {
        checkSkipTest(this.skipTest, this);
        const provider = waffle.provider;
        const nativeTokenAmount = "1000";
        const parsedEthAmount = ethers.utils.parseEther(nativeTokenAmount);

        const governanceReserveBalance = await provider.getBalance(this.luciDaoGovernanceReserve.address);

        const tx = await (await this.signer.sendTransaction({
            to: this.luciDaoGovernanceReserve.address,
            value: parsedEthAmount
        })).wait();

        const newGovernanceReserveBalance = await provider.getBalance(this.luciDaoGovernanceReserve.address);
        const white3InitialBalance = await provider.getBalance(this.white3.address);

        expect(newGovernanceReserveBalance).to.be.eq(governanceReserveBalance
            .add(parsedEthAmount));

        await expect(this.luciDaoGovernanceReserve.connect(this.signer).transferEth(
            this.white3.address,
            newGovernanceReserveBalance))
            .to.be.revertedWith("Ownable: caller is not the owner");

        await expect(this.luciDaoGovernanceReserve.connect(this.addr1).transferEth(
            this.white3.address,
            newGovernanceReserveBalance))
            .to.be.revertedWith("Ownable: caller is not the owner");

        const proposalDescription = "Proposal #7: transfer all eth from governance reserve";
        const transferCalldata = this.luciDaoGovernanceReserve.interface
            .encodeFunctionData("transferEth",
                [this.white3.address,
                    parsedEthAmount]
            );

        const descriptionHash = ethers.utils.id(proposalDescription);
        const proposalArgs = [[this.luciDaoGovernanceReserve.address], [0],
        [transferCalldata]] as ProposalArgs;
        const proposalId = await voteProposal(this.luciDaoGovernor,
            ...proposalArgs,
            proposalDescription,
            Votes.For);
        await this.luciDaoGovernor.queue(...proposalArgs, descriptionHash);
        const proposalEta = await this.luciDaoGovernor.proposalEta(proposalId);
        await network.provider.send("evm_mine", [proposalEta.toNumber()]);

        const executeTx = await (await this.luciDaoGovernor.connect(this.white3).execute(
            ...proposalArgs,
            descriptionHash)).wait();

        const white3FinalBalance = await provider.getBalance(this.white3.address);
        expect(white3FinalBalance).to.be.eq(white3InitialBalance
            .add(parsedEthAmount)
            .sub(executeTx.gasUsed.mul(executeTx.effectiveGasPrice))
        );
    });
}