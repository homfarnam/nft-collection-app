require('@nomiclabs/hardhat-waffle');
const fs = require('fs');
const privateKey = fs.readFileSync('.secret').toString();

module.exports = {
  solidity: '0.8.0',
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      chainId: 1337
    },
    ropsten: {
      url: `https://eth-ropsten.alchemyapi.io/v2/1Fu4Jn3DcjegvS56l2UINAshrHVdtPJz`,
      accounts: [
        'e371573bb10b616b2a14da8a501e17b98940c3a0690a14ab41bcc6393b702599'
      ]
    }
  },
  solidity: {
    version: '0.8.0',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
};
