import { expect } from "chai";
import { Votes } from "../config/config";
import { enactProposal } from "./Utilities";

export function governanceReserveBehavior(): void {
    it("should allow increasing funds allowances with a governance operation", async function () {
        const proposalDescription = "Proposal #4: increase allowance";
        const increaseAllowanceCalldata = this.luciDaoGovernanceReserve.interface.encodeFunctionData("increaseAllowanceToken", [this.luciDaoToken.address, this.oneEth, this.luciDaoTimelock.address]);
        await enactProposal(this.luciDaoGovernor, [this.luciDaoGovernanceReserve.address], [0], [increaseAllowanceCalldata], proposalDescription, Votes.For);

        expect(await this.luciDaoToken.allowance(this.luciDaoGovernanceReserve.address, this.luciDaoTimelock.address)).to.eq(this.oneEth);
    });

    it("should not allow another address to withdraw from vault without governance vote", async function () {
        await this.luciDaoToken.transfer(this.luciDaoGovernanceReserve.address, this.oneEth);
        await expect(this.luciDaoGovernanceReserve.approveToken(this.luciDaoToken.address, this.oneEth, this.signer.address)).to.be.revertedWith("Ownable: caller is not the owner");
        await expect(this.luciDaoToken.transferFrom(this.luciDaoGovernanceReserve.address, this.addr1.address, this.oneEth)).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
    });

    it("should not allow another address to modify allowance without governance vote", async function () {
        await this.luciDaoToken.transfer(this.luciDaoGovernanceReserve.address, this.oneEth);
        await expect(this.luciDaoGovernanceReserve.increaseAllowanceToken(this.luciDaoToken.address, this.oneEth, this.signer.address)).to.be.revertedWith("Ownable: caller is not the owner");
    });
}