const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy Rune Token (for testing purposes)
    const RuneToken = await hre.ethers.getContractFactory("MockERC20");
    const runeToken = await RuneToken.deploy("Bitcoin Rune Token", "BRUNE");
    await runeToken.deployed();
    console.log("Bitcoin Rune Token deployed to:", runeToken.address);

    // Deploy Reward Token (for testing purposes)
    const RewardToken = await hre.ethers.getContractFactory("MockERC20");
    const rewardToken = await RewardToken.deploy("Staking Reward Token", "SREWARD");
    await rewardToken.deployed();
    console.log("Reward Token deployed to:", rewardToken.address);

    // Deploy Staking Vault
    const BitcoinRuneStaking = await hre.ethers.getContractFactory("BitcoinRuneStaking");
    const stakingVault = await BitcoinRuneStaking.deploy(runeToken.address, rewardToken.address);
    await stakingVault.deployed();
    console.log("BitcoinRuneStaking deployed to:", stakingVault.address);

    // Mint some reward tokens to the staking vault
    const rewardAmount = hre.ethers.utils.parseEther("1000000"); // 1 million tokens
    await rewardToken.mint(stakingVault.address, rewardAmount);
    console.log("Minted reward tokens to staking vault");

    // Verify contracts on Etherscan (if not on a local network)
    if (network.name !== "hardhat" && network.name !== "localhost") {
        console.log("Waiting for block confirmations...");
        await stakingVault.deployTransaction.wait(6);

        console.log("Verifying contracts on Etherscan...");
        await hre.run("verify:verify", {
            address: runeToken.address,
            constructorArguments: ["Bitcoin Rune Token", "BRUNE"],
        });

        await hre.run("verify:verify", {
            address: rewardToken.address,
            constructorArguments: ["Staking Reward Token", "SREWARD"],
        });

        await hre.run("verify:verify", {
            address: stakingVault.address,
            constructorArguments: [runeToken.address, rewardToken.address],
        });
    }

    console.log("Deployment completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 