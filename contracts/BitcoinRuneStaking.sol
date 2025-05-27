// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract BitcoinRuneStaking is ReentrancyGuard, Ownable {
    using SafeMath for uint256;

    IERC20 public runeToken;
    IERC20 public rewardToken;

    struct StakeInfo {
        uint256 amount;
        uint256 startTime;
        uint256 lastClaimTime;
        uint256 lockPeriod;
        uint256 rewardMultiplier;
    }

    // Mapping from user address to their stake info
    mapping(address => StakeInfo) public stakes;
    
    // Staking parameters
    uint256 public constant BASE_REWARD_RATE = 5; // 5% base APY
    uint256 public constant REWARD_INTERVAL = 1 days;
    uint256 public constant MIN_STAKE_AMOUNT = 100 * 10**18; // 100 tokens minimum
    uint256 public constant MAX_STAKE_AMOUNT = 1000000 * 10**18; // 1 million tokens maximum

    // Lock period options (in days)
    uint256 public constant LOCK_30_DAYS = 30 days;
    uint256 public constant LOCK_90_DAYS = 90 days;
    uint256 public constant LOCK_180_DAYS = 180 days;
    uint256 public constant LOCK_365_DAYS = 365 days;

    // Reward multipliers for different lock periods
    uint256 public constant MULTIPLIER_30_DAYS = 100; // 1x
    uint256 public constant MULTIPLIER_90_DAYS = 150; // 1.5x
    uint256 public constant MULTIPLIER_180_DAYS = 200; // 2x
    uint256 public constant MULTIPLIER_365_DAYS = 300; // 3x

    event Staked(address indexed user, uint256 amount, uint256 lockPeriod);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event LockPeriodExtended(address indexed user, uint256 newLockPeriod);

    constructor(address _runeToken, address _rewardToken) {
        runeToken = IERC20(_runeToken);
        rewardToken = IERC20(_rewardToken);
    }

    function stake(uint256 _amount, uint256 _lockPeriod) external nonReentrant {
        require(_amount >= MIN_STAKE_AMOUNT, "Amount below minimum stake");
        require(_amount <= MAX_STAKE_AMOUNT, "Amount above maximum stake");
        require(_lockPeriod == LOCK_30_DAYS || _lockPeriod == LOCK_90_DAYS || 
                _lockPeriod == LOCK_180_DAYS || _lockPeriod == LOCK_365_DAYS, 
                "Invalid lock period");
        require(runeToken.transferFrom(msg.sender, address(this), _amount), "Transfer failed");

        StakeInfo storage userStake = stakes[msg.sender];
        
        // If user already has a stake, calculate and add pending rewards
        if (userStake.amount > 0) {
            uint256 pendingRewards = calculateRewards(msg.sender);
            if (pendingRewards > 0) {
                require(rewardToken.transfer(msg.sender, pendingRewards), "Reward transfer failed");
                emit RewardClaimed(msg.sender, pendingRewards);
            }
        }

        userStake.amount = userStake.amount.add(_amount);
        userStake.startTime = block.timestamp;
        userStake.lastClaimTime = block.timestamp;
        userStake.lockPeriod = _lockPeriod;
        userStake.rewardMultiplier = getRewardMultiplier(_lockPeriod);

        emit Staked(msg.sender, _amount, _lockPeriod);
    }

    function unstake() external nonReentrant {
        StakeInfo storage userStake = stakes[msg.sender];
        require(userStake.amount > 0, "No stake found");
        require(block.timestamp >= userStake.startTime.add(userStake.lockPeriod), "Lock period not ended");

        uint256 amount = userStake.amount;
        uint256 pendingRewards = calculateRewards(msg.sender);

        // Reset stake info
        userStake.amount = 0;
        userStake.startTime = 0;
        userStake.lastClaimTime = 0;
        userStake.lockPeriod = 0;
        userStake.rewardMultiplier = 0;

        // Transfer staked tokens back to user
        require(runeToken.transfer(msg.sender, amount), "Transfer failed");
        
        // Transfer pending rewards if any
        if (pendingRewards > 0) {
            require(rewardToken.transfer(msg.sender, pendingRewards), "Reward transfer failed");
            emit RewardClaimed(msg.sender, pendingRewards);
        }

        emit Unstaked(msg.sender, amount);
    }

    function claimRewards() external nonReentrant {
        uint256 pendingRewards = calculateRewards(msg.sender);
        require(pendingRewards > 0, "No rewards to claim");

        StakeInfo storage userStake = stakes[msg.sender];
        userStake.lastClaimTime = block.timestamp;

        require(rewardToken.transfer(msg.sender, pendingRewards), "Reward transfer failed");
        emit RewardClaimed(msg.sender, pendingRewards);
    }

    function extendLockPeriod(uint256 _newLockPeriod) external nonReentrant {
        StakeInfo storage userStake = stakes[msg.sender];
        require(userStake.amount > 0, "No stake found");
        require(_newLockPeriod > userStake.lockPeriod, "New lock period must be longer");
        require(_newLockPeriod == LOCK_30_DAYS || _newLockPeriod == LOCK_90_DAYS || 
                _newLockPeriod == LOCK_180_DAYS || _newLockPeriod == LOCK_365_DAYS, 
                "Invalid lock period");

        userStake.lockPeriod = _newLockPeriod;
        userStake.rewardMultiplier = getRewardMultiplier(_newLockPeriod);
        emit LockPeriodExtended(msg.sender, _newLockPeriod);
    }

    function calculateRewards(address _user) public view returns (uint256) {
        StakeInfo storage userStake = stakes[_user];
        if (userStake.amount == 0) return 0;

        uint256 timeStaked = block.timestamp.sub(userStake.lastClaimTime);
        uint256 intervals = timeStaked.div(REWARD_INTERVAL);
        
        if (intervals == 0) return 0;

        // Calculate rewards based on APY and multiplier
        // Formula: (amount * base_rate * multiplier * intervals) / (365 * 100 * 100)
        return userStake.amount.mul(BASE_REWARD_RATE)
                         .mul(userStake.rewardMultiplier)
                         .mul(intervals)
                         .div(365)
                         .div(100)
                         .div(100);
    }

    function getRewardMultiplier(uint256 _lockPeriod) public pure returns (uint256) {
        if (_lockPeriod == LOCK_365_DAYS) return MULTIPLIER_365_DAYS;
        if (_lockPeriod == LOCK_180_DAYS) return MULTIPLIER_180_DAYS;
        if (_lockPeriod == LOCK_90_DAYS) return MULTIPLIER_90_DAYS;
        return MULTIPLIER_30_DAYS;
    }

    function getStakeInfo(address _user) external view returns (
        uint256 amount,
        uint256 startTime,
        uint256 lastClaimTime,
        uint256 lockPeriod,
        uint256 rewardMultiplier,
        uint256 pendingRewards
    ) {
        StakeInfo storage userStake = stakes[_user];
        return (
            userStake.amount,
            userStake.startTime,
            userStake.lastClaimTime,
            userStake.lockPeriod,
            userStake.rewardMultiplier,
            calculateRewards(_user)
        );
    }

    // Emergency functions for owner
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(owner(), _amount);
    }

    function updateRewardRate(uint256 _newBaseRate) external onlyOwner {
        require(_newBaseRate > 0 && _newBaseRate <= 100, "Invalid reward rate");
        BASE_REWARD_RATE = _newBaseRate;
    }
} 