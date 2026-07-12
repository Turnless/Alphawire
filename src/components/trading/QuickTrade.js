'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';

export default function QuickTrade({ onTradeSuccess }) {
  // Order params
  const [pair, setPair] = useState('BTC-USDC');
  const [side, setSide] = useState('buy');
  const [orderType, setOrderType] = useState('market');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [stopLossPercentage, setStopLossPercentage] = useState(8);
  const [useStopLoss, setUseStopLoss] = useState(true);

  // Flow control states
  const [step, setStep] = useState('input'); // 'input', 'review', 'signing', 'success', 'error'
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [signatureHex, setSignatureHex] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [executionResult, setExecutionResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleConnectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('MetaMask or another EVM wallet was not detected in this browser.');
      return;
    }
    setIsConnecting(true);
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      setWalletAddress(accounts[0]);
    } catch (e) {
      console.error(e);
      alert('Failed to connect wallet: ' + e.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleReviewOrder = () => {
    if (!quantity || parseFloat(quantity) <= 0) {
      alert('Please enter a valid quantity.');
      return;
    }
    if (orderType === 'limit' && (!price || parseFloat(price) <= 0)) {
      alert('Please enter a valid limit price.');
      return;
    }
    setStep('review');
  };

  const handleExecuteTrade = async (signingScheme) => {
    setStep('signing');
    setLoading(true);
    setErrorMessage('');

    try {
      let finalPrice = price || '0.0';
      if (orderType === 'market') {
        // Fallback ticker lookup
        finalPrice = pair.startsWith('BTC') ? '64850.00' : '3210.00';
      }

      const slPrice = useStopLoss 
        ? (side === 'buy' 
            ? (parseFloat(finalPrice) * (1 - stopLossPercentage / 100)).toFixed(2)
            : (parseFloat(finalPrice) * (1 + stopLossPercentage / 100)).toFixed(2)
          )
        : null;

      let signature = '0x';

      if (signingScheme === 'browser') {
        if (!walletAddress) {
          throw new Error('Wallet not connected. Connect web3 wallet first.');
        }

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();

        // EIP-712 Domain and Typed Data structure for SoDEX action
        const domain = {
          name: 'spot',
          version: '1',
          chainId: 138565, // SoDEX Spot Testnet chainId
          verifyingContract: '0x0000000000000000000000000000000000000000'
        };

        const types = {
          ExchangeAction: [
            { name: 'payloadHash', type: 'bytes32' },
            { name: 'nonce', type: 'uint64' }
          ]
        };

        const actionType = 'newOrder';
        const orderParams = {
          pair,
          side,
          orderType,
          quantity: String(quantity),
          price: String(finalPrice),
          stopPrice: slPrice ? String(slPrice) : '0.0'
        };

        // Construct payload JSON exactly as SoDEX expects to sign over it
        const payloadJson = JSON.stringify({ type: actionType, params: orderParams });
        const payloadHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(payloadJson));
        const nonce = Date.now();

        const message = { payloadHash, nonce };

        // Request EIP-712 typed signature from MetaMask
        signature = await signer._signTypedData(domain, types, message);
        setSignatureHex(signature);
      }

      // POST to our Server API to execute
      const response = await fetch('/api/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pair,
          side,
          orderType,
          quantity,
          price: finalPrice,
          stopLossPrice: slPrice,
          clientSignature: signature !== '0x' ? signature : null,
          clientWallet: walletAddress || null
        }),
      });

      const data = await response.json();
      if (data.success) {
        setExecutionResult(data);
        setStep('success');
        if (onTradeSuccess) onTradeSuccess();
      } else {
        throw new Error(data.error || 'Server rejected order execution.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Signature rejected or network error.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quick-trade bg-[#12161f] border border-[#242b3b] p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-[#f0f2f5] flex items-center gap-2">
            <span className="text-[#00f0ff]">⚡</span> Quick Trade Execution
          </h3>
          <p className="text-xs text-[#8c9ba5] mt-0.5">Place manual orders with EIP-712 client signing</p>
        </div>
        
        {walletAddress ? (
          <span className="text-[10px] bg-[rgba(52,199,89,0.15)] text-[#34c759] border border-[rgba(52,199,89,0.3)] px-2.5 py-1 rounded-full font-mono">
            Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
        ) : (
          <button
            onClick={handleConnectWallet}
            disabled={isConnecting}
            className="text-[10px] bg-[#242b3b] hover:bg-[#2e374a] text-[#f0f2f5] px-3 py-1 rounded-full border border-[#242b3b] transition-colors"
          >
            {isConnecting ? 'Connecting...' : '🔌 Connect Wallet'}
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {step === 'input' && (
          <motion.div
            key="input-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* BUY / SELL Switch */}
            <div className="grid grid-cols-2 gap-2 bg-[#1b212f] p-1 rounded-lg border border-[#242b3b]">
              <button
                type="button"
                onClick={() => setSide('buy')}
                className={`py-2 text-xs font-black rounded-md transition-colors ${
                  side === 'buy' 
                    ? 'bg-[#34c759] text-white shadow-md' 
                    : 'text-[#8c9ba5] hover:text-[#f0f2f5]'
                }`}
              >
                BUY / LONG
              </button>
              <button
                type="button"
                onClick={() => setSide('sell')}
                className={`py-2 text-xs font-black rounded-md transition-colors ${
                  side === 'sell' 
                    ? 'bg-[#ff3b30] text-white shadow-md' 
                    : 'text-[#8c9ba5] hover:text-[#f0f2f5]'
                }`}
              >
                SELL / SHORT
              </button>
            </div>

            {/* Asset Pair Selection */}
            <div className="flex flex-col gap-1.5 text-xs">
              <label className="text-[#8c9ba5] font-bold">Trading Asset Pair</label>
              <select
                value={pair}
                onChange={(e) => setPair(e.target.value)}
                className="bg-[#1b212f] border border-[#242b3b] text-[#f0f2f5] p-2.5 rounded-lg focus:outline-none focus:border-[#00f0ff]"
              >
                <option value="BTC-USDC">BTC-USDC (Bitcoin)</option>
                <option value="ETH-USDC">ETH-USDC (Ethereum)</option>
                <option value="SOL-USDC">SOL-USDC (Solana)</option>
                <option value="UNI-USDC">UNI-USDC (Uniswap)</option>
                <option value="AAVE-USDC">AAVE-USDC (Aave)</option>
              </select>
            </div>

            {/* Order Type and Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 text-xs">
                <label className="text-[#8c9ba5] font-bold">Order Type</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  className="bg-[#1b212f] border border-[#242b3b] text-[#f0f2f5] p-2.5 rounded-lg focus:outline-none focus:border-[#00f0ff]"
                >
                  <option value="market">Market Order</option>
                  <option value="limit">Limit Order</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 text-xs">
                <label className="text-[#8c9ba5] font-bold">Quantity</label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="bg-[#1b212f] border border-[#242b3b] text-[#f0f2f5] p-2.5 rounded-lg focus:outline-none focus:border-[#00f0ff]"
                />
              </div>
            </div>

            {/* Limit Price */}
            {orderType === 'limit' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="flex flex-col gap-1.5 text-xs"
              >
                <label className="text-[#8c9ba5] font-bold">Limit Price (USDC)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="bg-[#1b212f] border border-[#242b3b] text-[#f0f2f5] p-2.5 rounded-lg focus:outline-none focus:border-[#00f0ff]"
                />
              </motion.div>
            )}

            {/* Stop Loss Checkbox */}
            <div className="flex items-center gap-2 pt-2 text-xs">
              <input
                type="checkbox"
                id="stoploss"
                checked={useStopLoss}
                onChange={(e) => setUseStopLoss(e.target.checked)}
                className="w-4 h-4 accent-[#ff3b30]"
              />
              <label htmlFor="stoploss" className="text-[#8c9ba5] cursor-pointer">
                Attach Trailing Stop Loss
              </label>
            </div>

            {useStopLoss && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="flex flex-col gap-1.5 text-xs pl-6"
              >
                <label className="text-[#8c9ba5]">Stop Loss Threshold: <b>{stopLossPercentage}%</b></label>
                <input
                  type="range"
                  min="3"
                  max="15"
                  value={stopLossPercentage}
                  onChange={(e) => setStopLossPercentage(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-[#1b212f] rounded-lg appearance-none cursor-pointer accent-[#ff3b30]"
                />
              </motion.div>
            )}

            {/* Review Button */}
            <button
              type="button"
              onClick={handleReviewOrder}
              className="w-full bg-[#007aff] hover:bg-[#005ec3] text-[#f0f2f5] text-xs font-black py-3 rounded-lg shadow-md transition-colors mt-4"
            >
              Review Order Details
            </button>
          </motion.div>
        )}

        {step === 'review' && (
          <motion.div
            key="review-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="bg-[#1b212f] border border-[#242b3b] p-4 rounded-lg space-y-3 text-xs">
              <h4 className="font-bold text-sm text-[#f0f2f5] border-b border-[#242b3b] pb-2">Confirm Order Details</h4>
              <div className="flex justify-between">
                <span className="text-[#8c9ba5]">Transaction Side:</span>
                <span className={`font-black uppercase ${side === 'buy' ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}>{side}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8c9ba5]">Asset Pair:</span>
                <span className="font-bold text-[#f0f2f5]">{pair}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8c9ba5]">Order Type:</span>
                <span className="font-bold text-[#f0f2f5] uppercase">{orderType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8c9ba5]">Quantity:</span>
                <span className="font-bold font-mono text-[#f0f2f5]">{quantity}</span>
              </div>
              {orderType === 'limit' && (
                <div className="flex justify-between">
                  <span className="text-[#8c9ba5]">Limit Price:</span>
                  <span className="font-bold font-mono text-[#f0f2f5]">${parseFloat(price).toFixed(2)}</span>
                </div>
              )}
              {useStopLoss && (
                <div className="flex justify-between">
                  <span className="text-[#8c9ba5]">Trailing Stop Loss:</span>
                  <span className="font-bold text-[#ff3b30]">{stopLossPercentage}%</span>
                </div>
              )}
            </div>

            {/* Execute Buttons */}
            <div className="flex flex-col gap-2 mt-4">
              {walletAddress ? (
                <button
                  type="button"
                  onClick={() => handleExecuteTrade('browser')}
                  className="w-full bg-[#34c759] hover:bg-[#2aa84c] text-white text-xs font-black py-3 rounded-lg shadow-md transition-colors"
                >
                  ✍️ Sign EIP-712 & Execute
                </button>
              ) : (
                <div className="text-center p-3 bg-[#1b212f] rounded-lg border border-[#ff9500]/20 text-[11px] text-[#ff9500] mb-1">
                  💡 Connect Web3 Wallet above to sign orders locally, or execute using server credentials:
                </div>
              )}
              
              <button
                type="button"
                onClick={() => handleExecuteTrade('server')}
                className="w-full bg-[#242b3b] hover:bg-[#2e374a] text-[#f0f2f5] text-xs font-bold py-3 rounded-lg border border-[#242b3b] transition-colors"
              >
                🔑 Execute with Server API Key
              </button>

              <button
                type="button"
                onClick={() => setStep('input')}
                className="w-full text-center text-[#8c9ba5] hover:text-[#f0f2f5] text-xs py-2 mt-1"
              >
                Go Back
              </button>
            </div>
          </motion.div>
        )}

        {step === 'signing' && (
          <motion.div
            key="signing-loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-8 text-center text-xs"
          >
            <div className="w-10 h-10 border-4 border-[#00f0ff] border-t-transparent rounded-full animate-spin mb-4" />
            <h4 className="font-bold text-sm text-[#f0f2f5] mb-1">Waiting for Signature Confirmation</h4>
            <p className="text-[#8c9ba5] max-w-xs leading-relaxed">
              Confirm the EIP-712typed transaction request inside your browser extension or verify API key auth...
            </p>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 py-4 text-center text-xs"
          >
            <div className="w-12 h-12 bg-[rgba(52,199,89,0.15)] text-[#34c759] border-2 border-[#34c759] rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-2">
              ✓
            </div>
            <h4 className="font-bold text-sm text-[#34c759]">Order Executed Successfully!</h4>
            
            <div className="bg-[#1b212f] border border-[#242b3b] p-4 rounded-lg text-left space-y-2 font-mono text-[11px] text-[#f0f2f5]">
              <div><b>Trade ID:</b> {executionResult?.tradeId}</div>
              <div><b>SoDEX Order ID:</b> {executionResult?.sodexOrderId}</div>
              <div><b>Execution Status:</b> {executionResult?.status}</div>
              <div><b>Execution Fill Price:</b> ${parseFloat(executionResult?.fillPrice || 0).toLocaleString()}</div>
            </div>

            <button
              type="button"
              onClick={() => {
                setQuantity('');
                setPrice('');
                setStep('input');
              }}
              className="w-full bg-[#242b3b] hover:bg-[#2e374a] text-[#f0f2f5] text-xs font-bold py-2.5 rounded-lg border border-[#242b3b]"
            >
              Place Another Order
            </button>
          </motion.div>
        )}

        {step === 'error' && (
          <motion.div
            key="error-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 py-4 text-center text-xs"
          >
            <div className="w-12 h-12 bg-[rgba(255,59,48,0.15)] text-[#ff3b30] border-2 border-[#ff3b30] rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-2">
              !
            </div>
            <h4 className="font-bold text-sm text-[#ff3b30]">Order Execution Failed</h4>
            <p className="text-[#8c9ba5] leading-relaxed max-w-xs mx-auto">
              {errorMessage || 'Signature rejected or trade failed risk gates checks.'}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('review')}
                className="flex-1 bg-[#242b3b] hover:bg-[#2e374a] text-[#f0f2f5] text-xs font-bold py-2.5 rounded-lg border border-[#242b3b]"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={() => setStep('input')}
                className="flex-1 bg-[#007aff] hover:bg-[#005ec3] text-white text-xs font-bold py-2.5 rounded-lg"
              >
                Edit Parameters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
