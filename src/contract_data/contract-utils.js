import { ethers } from 'ethers';
import contractABI from './Mines.json';
import contractAddress from './Mines-address.json';
import { switchToMonadNetwork, isConnectedToMonad } from './monad-config';

class ContractManager {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.account = null;
    this.isConnected = false;
  }

  // Initialize connection to MetaMask and contract
  async initialize() {
    if (!window.ethereum) {
      throw new Error('MetaMask not detected! Please install MetaMask.');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      this.account = accounts[0];

      // Create provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();

      // Switch to Monad network
      await switchToMonadNetwork('testnet');

      // Create contract instance
      this.contract = new ethers.Contract(
        contractAddress.address,
        contractABI.abi,
        this.signer
      );

      this.isConnected = true;

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          this.disconnect();
        } else {
          this.account = accounts[0];
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

      return {
        account: this.account,
        contract: this.contract,
        provider: this.provider,
        signer: this.signer
      };

    } catch (error) {
      console.error('Error initializing contract:', error);
      throw error;
    }
  }

  // Place a bet
  async placeBet(amount) {
    if (!this.isConnected || !this.contract) {
      throw new Error('Contract not connected');
    }

    try {
      const amountInWei = ethers.parseEther(amount.toString());
      const tx = await this.contract.bet({ value: amountInWei });
      const receipt = await tx.wait();
      
      console.log('Bet placed successfully:', receipt);
      return receipt;
    } catch (error) {
      console.error('Error placing bet:', error);
      throw error;
    }
  }

  // Cashout winnings
  async cashout(amount) {
    if (!this.isConnected || !this.contract) {
      throw new Error('Contract not connected');
    }

    try {
      const amountInWei = ethers.parseEther(amount.toString());
      const tx = await this.contract.sendEtherFromContract(this.account, amountInWei);
      const receipt = await tx.wait();
      
      console.log('Cashout successful:', receipt);
      return receipt;
    } catch (error) {
      console.error('Error cashing out:', error);
      throw error;
    }
  }

  // Get contract balance
  async getContractBalance() {
    if (!this.isConnected || !this.contract) {
      throw new Error('Contract not connected');
    }

    try {
      const balance = await this.contract.getContractBalance();
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting contract balance:', error);
      throw error;
    }
  }

  // Get account balance
  async getAccountBalance() {
    if (!this.provider || !this.account) {
      throw new Error('Provider not connected');
    }

    try {
      const balance = await this.provider.getBalance(this.account);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting account balance:', error);
      throw error;
    }
  }

  // Check if connected to Monad network
  async checkNetwork() {
    return await isConnectedToMonad();
  }

  // Disconnect
  disconnect() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.account = null;
    this.isConnected = false;
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      account: this.account,
      contract: this.contract !== null
    };
  }
}

// Create a singleton instance
const contractManager = new ContractManager();

export default contractManager; 