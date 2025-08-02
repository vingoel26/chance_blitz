// Monad Network Configuration
export const MONAD_NETWORKS = {
  testnet: {
    chainId: '0x279F', // 10143 in hex
    chainName: 'Monad Testnet',
    nativeCurrency: {
      name: 'Monad',
      symbol: 'MONAD',
      decimals: 18,
    },
    rpcUrls: ['https://rpc.testnet.monad.xyz'],
    blockExplorerUrls: ['https://explorer.testnet.monad.xyz'],
  },
  mainnet: {
    chainId: '0x53A', // 1338 in hex
    chainName: 'Monad Mainnet',
    nativeCurrency: {
      name: 'Monad',
      symbol: 'MONAD',
      decimals: 18,
    },
    rpcUrls: ['https://rpc.monad.xyz'],
    blockExplorerUrls: ['https://explorer.monad.xyz'],
  },
};

// Function to switch to Monad network
export const switchToMonadNetwork = async (networkType = 'testnet') => {
  if (!window.ethereum) {
    throw new Error('MetaMask not detected');
  }

  const network = MONAD_NETWORKS[networkType];
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: network.chainId }],
    });
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [network],
        });
      } catch (addError) {
        throw new Error('Failed to add Monad network to MetaMask');
      }
    } else {
      throw switchError;
    }
  }
};

// Function to check if connected to Monad network
export const isConnectedToMonad = async () => {
  if (!window.ethereum) return false;
  
  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return chainId === MONAD_NETWORKS.testnet.chainId || chainId === MONAD_NETWORKS.mainnet.chainId;
  } catch (error) {
    console.error('Error checking chain ID:', error);
    return false;
  }
}; 