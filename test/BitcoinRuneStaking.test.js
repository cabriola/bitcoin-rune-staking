const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BitcoinRuneStaking", function () {
    let BitcoinRuneStaking;
    let runeToken;
    let rewardToken;
    let stakingVault;
    let owner;
    let user1;
    let user2;

    const MIN_STAKE_AMOUNT = ethers.utils.parseEther("100");
    const MAX_STAKE_AMOUNT = ethers.utils.parseEther("1000000");
    const BASE_REWARD_RATE = 5; // 5% APY

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // Deploy mock tokens
        const MockToken = await ethers.getContractFactory("MockERC20");
        runeToken = await MockToken.deploy("Rune Token", "RUNE");
        rewardToken = await MockToken.deploy("Reward Token", "REWARD");

        // Deploy staking vault
        BitcoinRuneStaking = await ethers.getContractFactory("BitcoinRuneStaking");
        stakingVault = await BitcoinRuneStaking.deploy(runeToken.address, rewardToken.address);

        // Mint tokens to users
        await runeToken.mint(user1.address, ethers.utils.parseEther("1000"));
        await runeToken.mint(user2.address, ethers.utils.parseEther("1000"));
        await rewardToken.mint(stakingVault.address, ethers.utils.parseEther("10000"));

        // Approve staking vault to spend tokens
        await runeToken.connect(user1).approve(stakingVault.address, ethers.constants.MaxUint256);
        await runeToken.connect(user2).approve(stakingVault.address, ethers.constants.MaxUint256);
    });

    describe("Staking", function () {
        it("Should allow users to stake tokens with different lock periods", async function () {
            const stakeAmount = MIN_STAKE_AMOUNT;
            const lockPeriod = 30 * 24 * 60 * 60; // 30 days

            await stakingVault.connect(user1).stake(stakeAmount, lockPeriod);
            
            const stakeInfo = await stakingVault.getStakeInfo(user1.address);
            expect(stakeInfo.amount).to.equal(stakeAmount);
            expect(stakeInfo.lockPeriod).to.equal(lockPeriod);
        });

        it("Should not allow staking below minimum amount", async function () {
            const stakeAmount = MIN_STAKE_AMOUNT.sub(1);
            const lockPeriod = 30 * 24 * 60 * 60;

            await expect(
                stakingVault.connect(user1).stake(stakeAmount, lockPeriod)
            ).to.be.revertedWith("Amount below minimum stake");
        });

        it("Should not allow staking above maximum amount", async function () {
            const stakeAmount = MAX_STAKE_AMOUNT.add(1);
            const lockPeriod = 30 * 24 * 60 * 60;

            await expect(
                stakingVault.connect(user1).stake(stakeAmount, lockPeriod)
            ).to.be.revertedWith("Amount above maximum stake");
        });
    });

    describe("Unstaking", function () {
        it("Should not allow unstaking before lock period ends", async function () {
            const stakeAmount = MIN_STAKE_AMOUNT;
            const lockPeriod = 30 * 24 * 60 * 60;

            await stakingVault.connect(user1).stake(stakeAmount, lockPeriod);
            
            await expect(
                stakingVault.connect(user1).unstake()
            ).to.be.revertedWith("Lock period not ended");
        });

        it("Should allow unstaking after lock period ends", async function () {
            const stakeAmount = MIN_STAKE_AMOUNT;
            const lockPeriod = 30 * 24 * 60 * 60;

            await stakingVault.connect(user1).stake(stakeAmount, lockPeriod);
            
            // Fast forward 31 days
            await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            const initialBalance = await runeToken.balanceOf(user1.address);
            await stakingVault.connect(user1).unstake();
            const finalBalance = await runeToken.balanceOf(user1.address);
            
            expect(finalBalance.sub(initialBalance)).to.equal(stakeAmount);
        });
    });

    describe("Rewards", function () {
        it("Should calculate rewards with different multipliers", async function () {
            const stakeAmount = MIN_STAKE_AMOUNT;
            const lockPeriod = 365 * 24 * 60 * 60; // 365 days for 3x multiplier

            await stakingVault.connect(user1).stake(stakeAmount, lockPeriod);

            // Fast forward 30 days
            await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            const pendingRewards = await stakingVault.calculateRewards(user1.address);
            expect(pendingRewards).to.be.gt(0);
        });

        it("Should allow users to claim rewards", async function () {
            const stakeAmount = MIN_STAKE_AMOUNT;
            const lockPeriod = 30 * 24 * 60 * 60;

            await stakingVault.connect(user1).stake(stakeAmount, lockPeriod);

            // Fast forward 30 days
            await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            const initialBalance = await rewardToken.balanceOf(user1.address);
            await stakingVault.connect(user1).claimRewards();
            const finalBalance = await rewardToken.balanceOf(user1.address);

            expect(finalBalance).to.be.gt(initialBalance);
        });
    });

    describe("Lock Period Extension", function () {
        it("Should allow users to extend lock period", async function () {
            const stakeAmount = MIN_STAKE_AMOUNT;
            const initialLockPeriod = 30 * 24 * 60 * 60;
            const newLockPeriod = 90 * 24 * 60 * 60;

            await stakingVault.connect(user1).stake(stakeAmount, initialLockPeriod);
            await stakingVault.connect(user1).extendLockPeriod(newLockPeriod);

            const stakeInfo = await stakingVault.getStakeInfo(user1.address);
            expect(stakeInfo.lockPeriod).to.equal(newLockPeriod);
        });

        it("Should not allow extending to a shorter lock period", async function () {
            const stakeAmount = MIN_STAKE_AMOUNT;
            const initialLockPeriod = 90 * 24 * 60 * 60;
            const newLockPeriod = 30 * 24 * 60 * 60;

            await stakingVault.connect(user1).stake(stakeAmount, initialLockPeriod);
            
            await expect(
                stakingVault.connect(user1).extendLockPeriod(newLockPeriod)
            ).to.be.revertedWith("New lock period must be longer");
        });
    });

    describe("Admin Functions", function () {
        it("Should allow owner to update reward rate", async function () {
            const newRate = 10;
            await stakingVault.updateRewardRate(newRate);
            // Verify the rate was updated (you'll need to add a getter for this)
        });

        it("Should not allow non-owner to update reward rate", async function () {
            await expect(
                stakingVault.connect(user1).updateRewardRate(10)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should allow owner to withdraw tokens in emergency", async function () {
            const amount = ethers.utils.parseEther("1000");
            await rewardToken.mint(stakingVault.address, amount);
            
            const initialBalance = await rewardToken.balanceOf(owner.address);
            await stakingVault.emergencyWithdraw(rewardToken.address, amount);
            const finalBalance = await rewardToken.balanceOf(owner.address);
            
            expect(finalBalance.sub(initialBalance)).to.equal(amount);
        });
    });
}); 