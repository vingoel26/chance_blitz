import React, { useState } from "react";
import './launcher.css'
import * as ReactDOM from "react-dom/client";
import { ethers } from "ethers";
import contractABI from "../contract_data/GetSet.json";
import contractAddress from "../contract_data/GetSet-address.json";
import { switchToMonadNetwork, isConnectedToMonad } from "../contract_data/monad-config";
import Navbar from "./navbar";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
function Launcher({ onConnectWallet }) {
  const [value, setValue] = useState(""); 
  const [retrievedValue, setRetrievedValue] = useState(null);
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [userBalance, setUserBalance] = useState(null);
  const [currentNetwork, setCurrentNetwork] = useState("");

  // Initialize Provider, Signer, and Contract
  const initializeEthers = async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected!");
      return;
    }
    
    try {
      // Check if connected to Monad network
      const isMonad = await isConnectedToMonad();
      if (!isMonad) {
        const switchNetwork = confirm("You're not connected to Monad network. Would you like to switch to Monad Testnet?");
        if (switchNetwork) {
          await switchToMonadNetwork('testnet');
        } else {
          alert("Please connect to Monad network to use this dApp");
          return;
        }
      }

      const _provider = new ethers.BrowserProvider(window.ethereum);
      const _signer = await _provider.getSigner();

      const _contract = new ethers.Contract(contractAddress.address, contractABI.abi, _signer);

      setProvider(_provider);
      setSigner(_signer);
      setContract(_contract);

      const accounts = await _provider.send("eth_requestAccounts", []);
      const network = await _provider.getNetwork();
      setCurrentNetwork(network.name);

      if (accounts.length > 0 && account === accounts[0]) {
        alert("MetaMask Connected to Monad!");
        return;
      }
      setAccount(accounts[0]);
    } catch (error) {
      console.error("Error initializing ethers:", error);
    }
  };

  // Switch to Monad network
  const switchToMonad = async (networkType = 'testnet') => {
    try {
      await switchToMonadNetwork(networkType);
      alert(`Switched to Monad ${networkType}!`);
      // Reinitialize after network switch
      await initializeEthers();
    } catch (error) {
      console.error("Error switching to Monad:", error);
      alert("Failed to switch to Monad network");
    }
  };

  // Set value in contract
  const setContractValue = async () => {
    if (!contract) return alert("Please connect wallet first!");
    try {
      const tx = await contract.set(BigInt(value)); // Convert string to BigInt
      await tx.wait(); // Wait for transaction confirmation
      alert("Value set successfully!");
    } catch (error) {
      console.error("Error setting value:", error);
    }
  };

  // Get value from contract
  const getContractValue = async () => {
    if (!contract) return alert("Please connect wallet first!");
    try {
      const result = await contract.get();
      setRetrievedValue(result.toString());
    } catch (error) {
      console.error("Error getting value:", error);
    }
  };

  // Deposit funds to the contract
  const depositFunds = async () => {
    if (!contract) return alert("Please connect wallet first!");
    try {
      const tx = await signer.sendTransaction({
        to: contractAddress.address,
        value: ethers.parseEther(depositAmount), // Convert to wei
      });
      await tx.wait();
      alert(`Deposited ${depositAmount} ETH successfully!`);
      setDepositAmount("");
    } catch (error) {
      console.error("Error depositing funds:", error);
    }
  };

  // Get user balance
  const getUserBalance = async () => {
    if (!contract) return alert("Please connect wallet first!");
    try {
      const balance = await contract.getBalance(account);
      setUserBalance(ethers.formatEther(balance)); // Convert from wei to ETH
    } catch (error) {
      console.error("Error getting balance:", error);
    }
  };


  
  const [expanded, setExpanded] = useState(false);

  return (
    <>
    <div className="min-h-screen flex flex-col bg-black min-w-full">
      <Navbar/>
    {/* <header className="py-4 bg-black sm:py-6">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="shrink-0">
              <a href="#" title="" className="flex">
              <img
                className="w-12 max-w-10 mx-auto md:max-w-md "
                src="https://landingfoliocom.imgix.net/store/collection/dusk/images/hero/1/3d-illustration.png"
                alt=""
              /><p className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-purple-500 m-2 mx-5 text-2xl font-bold">Chance</p>
              </a>
            </div>

            <div className="flex md:hidden">
              <button
                type="button"
                className="text-white"
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
              >
                {!expanded ? (
                  <svg
                    className="w-7 h-7"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-7 h-7"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </button>
            </div>

            <nav className="hidden md:flex md:items-center md:justify-end md:space-x-12">
              {["Bets","Games","Contact us"].map((text) => (
                <a
                  key={text}
                  href=".\ContactUs"
                  className="text-base font-normal text-gray-400 transition-all duration-200 hover:text-white"
                >
                  {text}
                </a>
              ))}
            </nav>
          </div>

          {expanded && (
            <nav>
              <div className="flex flex-col pt-8 pb-4 space-y-6">
                {["Bets","Games","Contact us"].map((text) => (
                  <a
                    key={text}
                    href="/ContactUs"
                    className="text-base font-normal text-gray-400 transition-all duration-200 hover:text-white"
                  >
                    {text}
                  </a>
                ))}
              </div>
            </nav>
          )}
        </div>
      </header> */}

      <section className="py-12 bg-black sm:pb-16 lg:pb-20 xl:pb-24">
        <div className="px-4 mx-auto sm:px-6 lg:px-8 max-w-7xl">
          <div className="relative">
            <div className="lg:w-2/3">
              <p className="text-sm font-normal tracking-widest text-gray-300 uppercase">
                Play With Security
              </p>
              <h1 className="mt-6 text-4xl font-normal text-white sm:mt-10 sm:text-5xl lg:text-6xl xl:text-8xl">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-purple-500">
                  You Want to Play, Let's Play
                </span>{" "}
                <br/>
                
                <p className="text-lg text-slate-400 font-bold mt-3">-Chamber</p>
                  
              </h1>
              <p className="max-w-lg mt-4 text-xl font-normal text-gray-400 sm:mt-8">
              A decentralized betting and gaming platform where users can stake real money on games of skill and chance, ensuring secure, transparent, and instant payouts through blockchain technology.
              </p>
              <div className="relative inline-flex items-center justify-center mt-8 sm:mt-12 group">
                <div className="absolute transition-all duration-200 rounded-full -inset-px bg-gradient-to-r from-cyan-500 to-purple-500 group-hover:shadow-lg group-hover:shadow-cyan-500/50"></div>
                <a
                  href="#"
                  onClick={initializeEthers}
                  className="relative inline-flex items-center justify-center px-8 py-3 text-base font-normal text-white bg-black border border-transparent rounded-full"
                  role="button"
                >
                  Connect with MetaMask
                </a>
              </div>
              <div className="relative inline-flex items-center justify-center mt-8 sm:mt-12 group mx-7">
                <div className="absolute transition-all duration-200 rounded-full -inset-px bg-gradient-to-r from-purple-500 to-cyan-500 group-hover:shadow-lg group-hover:shadow-purple-500/50"></div>
                <a
                  href="./Games/games"
                  className="relative inline-flex items-center justify-center px-8 py-3 text-base font-normal text-white bg-black border border-transparent rounded-full"
                  role="button"
                >
                  Play
                </a>
              </div>

              
            </div>

            <div className="mt-8 md:absolute md:mt-0 md:top-32 lg:top-0 md:right-0">
              <img
                className="w-full max-w-xs mx-auto lg:max-w-lg xl:max-w-xl"
                src="https://landingfoliocom.imgix.net/store/collection/dusk/images/hero/1/3d-illustration.png"
                alt=""
              />
            </div>
          </div>
        </div>
      </section>
    </div>
      
    </>
  );
}

export default Launcher;
