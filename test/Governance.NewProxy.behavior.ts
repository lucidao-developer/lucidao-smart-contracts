import { expect } from "chai";
import { ethers } from "hardhat";
import { Votes } from "../config/config";
import { enactProposal } from "../test/Utilities";

export function governanceNewProxyBehavior(): void {
    it("should retrieve a value previously initialized", async function () {
        expect((await this.dummyImplementation.retrieve()).toString()).to.equal("42");
    });

    it("should retrieve a value previously incremented", async function () {
        const proposalDescription = "Proposal #6: change marketplace implementation";
        const changeImplCalldata = this.proxyAdmin.interface.encodeFunctionData("upgrade", [this.dummyImplementation.address, this.dummyImplementationUpgraded.address]);
        await enactProposal(this.luciDaoGovernor, [this.proxyAdmin.address], [0], [changeImplCalldata], proposalDescription, Votes.For);

        const DummyImplementationUpgraded = await ethers.getContractFactory("DummyImplementationUpgraded");
        const dummyImplementationUpgradedAttached = DummyImplementationUpgraded.attach(this.dummyImplementation.address);

        await dummyImplementationUpgradedAttached.increment();
        expect((await this.dummyImplementation.retrieve()).toString()).to.equal('43');
    });
}