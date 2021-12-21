import { expect } from 'chai';
import { timelockMinDelayInSeconds } from '../config/config';

export function timelockBehavior(): void {
  it("should have expected init parameters", async function () {
    expect(await this.luciDaoTimelock.getMinDelay()).to.eq(timelockMinDelayInSeconds);
  });
}