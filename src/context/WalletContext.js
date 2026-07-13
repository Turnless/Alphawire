'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const WalletContext = createContext({
  isConnected: false,
  walletAddress: null,
  balance: 0,
  ethBalance: null,
  isConnecting: false,
  isClaiming: false,
  connectWallet: () => {},
  disconnectWallet: () => {},
  claimFaucet: () => {},
});

export function WalletProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [balance, setBalance] = useState(0); // CNDR balance
  const [ethBalance, setEthBalance] = useState(null); // Real native ETH balance
  const [isConnecting, setIsConnecting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  // Sync RPC data for a specific connected address
  const syncWalletData = async (address) => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    try {
      // 1. Fetch real native ETH balance
      const hexBalance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });
      const eth = parseFloat((parseInt(hexBalance, 16) / 1e18).toFixed(4));
      setEthBalance(eth);

      // 2. Fetch or initialize local CNDR test token balance associated with this specific address
      const key = `cinder_cndr_balance_${address.toLowerCase()}`;
      let cndr = localStorage.getItem(key);
      if (cndr === null) {
        cndr = '500'; // Default initial test tokens
        localStorage.setItem(key, cndr);
      }
      setBalance(parseFloat(cndr));
    } catch (err) {
      console.error('Error syncing real Web3 wallet RPC data:', err);
    }
  };

  // Check if wallet is already pre-authorized on mount
  useEffect(() => {
    const initWeb3Wallet = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            const address = accounts[0];
            setWalletAddress(address);
            setIsConnected(true);
            await syncWalletData(address);
          }
        } catch (err) {
          console.error('Error checking pre-authorized accounts:', err);
        }
      }
    };
    initWeb3Wallet();
  }, []);

  // Listen for wallet accountsChanged and chainChanged events
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const handleAccounts = async (accounts) => {
      if (accounts.length === 0) {
        // User disconnected their wallet
        setIsConnected(false);
        setWalletAddress(null);
        setBalance(0);
        setEthBalance(null);
      } else {
        const address = accounts[0];
        setWalletAddress(address);
        setIsConnected(true);
        await syncWalletData(address);
      }
    };

    const handleChain = () => {
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccounts);
    window.ethereum.on('chainChanged', handleChain);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccounts);
        window.ethereum.removeListener('chainChanged', handleChain);
      }
    };
  }, []);

  const connectWallet = async () => {
    if (typeof window === 'undefined') return;
    
    if (!window.ethereum) {
      alert('No Web3 wallet extension detected. Please install MetaMask or another compatible browser extension to use Cinder.');
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        const address = accounts[0];
        setWalletAddress(address);
        setIsConnected(true);
        await syncWalletData(address);
      }
    } catch (err) {
      console.error('Error connecting to Web3 provider:', err);
      // User rejected connection or RPC error
      if (err.code === 4001) {
        alert('Connection request rejected. Please approve the connection in your wallet.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setWalletAddress(null);
    setBalance(0);
    setEthBalance(null);
  };

  const claimFaucet = () => {
    if (!isConnected || !walletAddress) return;
    setIsClaiming(true);
    
    // Simulate testnet transaction timing
    setTimeout(() => {
      const key = `cinder_cndr_balance_${walletAddress.toLowerCase()}`;
      const currentCndr = parseFloat(localStorage.getItem(key) || 0);
      const newCndr = currentCndr + 1000;
      localStorage.setItem(key, newCndr.toString());
      setBalance(newCndr);
      setIsClaiming(false);
    }, 1500);
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        walletAddress,
        balance,
        ethBalance,
        isConnecting,
        isClaiming,
        connectWallet,
        disconnectWallet,
        claimFaucet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
