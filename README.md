# Bitcoin Rune Staking

A smart contract implementation for staking Bitcoin Rune tokens. This project provides a secure and efficient way to stake Rune tokens and earn rewards.

## Features

- Secure staking mechanism
- Automated reward distribution
- Flexible staking periods
- Multiple staking tiers
- Emergency withdrawal functionality
- Comprehensive test coverage

## Prerequisites

- Node.js (v14 or higher)
- Hardhat
- Web3 provider (e.g., Infura)
- MetaMask or similar wallet

## Installation

1. Clone the repository:
```bash
git clone https://github.com/cabriola/bitcoin-rune-staking.git
cd bitcoin-rune-staking
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
- Network RPC URL
- Private key for deployment
- Etherscan API key (for verification)

## Development

1. Compile contracts:
```bash
npx hardhat compile
```

2. Run tests:
```bash
npx hardhat test
```

3. Deploy to network:
```bash
npx hardhat run scripts/deploy.js --network <network-name>
```

## Contract Architecture

The staking system consists of the following components:

1. **RuneStakingVault.sol**
   - Main staking contract
   - Handles deposits and withdrawals
   - Manages reward distribution
   - Implements security features

2. **MockERC20.sol**
   - Test token for development
   - Simulates Rune token behavior

## Staking Features

1. **Staking Options**
   - Flexible staking periods
   - Multiple reward tiers
   - Compound interest support

2. **Security Measures**
   - Reentrancy protection
   - Access control
   - Emergency pause functionality

3. **Reward System**
   - Automated distribution
   - Configurable rates
   - Fair allocation

## Testing

The project includes comprehensive tests:
- Unit tests for all functions
- Integration tests
- Edge case coverage
- Security tests

## Deployment

1. **Network Setup**
   - Configure network parameters
   - Set up environment variables
   - Verify contract addresses

2. **Verification**
   - Contract verification on Etherscan
   - Documentation generation
   - ABI export

## Security

1. **Audit Considerations**
   - Code review
   - Security best practices
   - Gas optimization

2. **Risk Mitigation**
   - Emergency procedures
   - Backup systems
   - Monitoring tools

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

- GitHub: [@cabriola](https://github.com/cabriola) #
