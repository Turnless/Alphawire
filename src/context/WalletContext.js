'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const WalletContext = createContext({
  isConnected: false,
  walletAddress: null,
  balance: 0,
  isConnecting: false,
  isClaiming: false,
  connectWallet: () => {},
  disconnectWallet: () => {},
  claimFaucet: () => {},
});

export function WalletProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [balance, setBalance] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  // Load wallet state from localStorage on mount (for persistent feel)
  useEffect(() => {
    const savedAddress = localStorage.getItem('cinder_wallet_address');
    const savedBalance = localStorage.getItem('cinder_wallet_balance');
    if (savedAddress) {
      setIsConnected(true);
      setWalletAddress(savedAddress);
      setBalance(parseFloat(savedBalance || 0));
    }
  }, []);

  const connectWallet = (providerName = 'MetaMask') => {
    setIsConnecting(true);
    // Simulate smart contract connection latency
    setTimeout(() => {
      // Generate a mock hex address
      const randomHex = Math.random().toString(16).substring(2, 10);
      const mockAddress = `0x71C${randomHex.toUpperCase()}F711C309c897C6287A130F339A`;
      
      setIsConnected(true);
      setWalletAddress(mockAddress);
      const initialBalance = 0;
      setBalance(initialBalance);
      setIsConnecting(false);

      localStorage.setItem('cinder_wallet_address', mockAddress);
      localStorage.setItem('cinder_wallet_balance', initialBalance.toString());
    }, 1200);
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setWalletAddress(null);
    setBalance(0);
    localStorage.removeItem('cinder_wallet_address');
    localStorage.removeItem('cinder_wallet_balance');
  };

  const claimFaucet = () => {
    if (!isConnected) return;
    setIsClaiming(true);
    // Simulate transaction execution on testnet
    setTimeout(() => {
      const newBalance = balance + 1000;
      setBalance(newBalance);
      setIsClaiming(false);
      localStorage.setItem('cinder_wallet_balance', newBalance.toString());
    }, 1500);
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        walletAddress,
        balance,
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
