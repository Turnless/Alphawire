import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { getOrderSignatureHeaders } from '../src/lib/sodex.js';

function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const firstEquals = trimmed.indexOf('=');
          if (firstEquals !== -1) {
            const key = trimmed.slice(0, firstEquals).trim();
            let value = trimmed.slice(firstEquals + 1).trim();
            // Strip quotes if any
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            process.env[key] = value;
          }
        }
      });
    }
  } catch (e) {
    console.warn('[WARNING] Failed to manually load .env file:', e.message);
  }
}

loadEnv();

async function main() {
  console.log('[INFO] Initializing SoDEX API Key Registration Script...');

  const masterPrivateKey = process.env.SODEX_MASTER_PRIVATE_KEY;
  if (!masterPrivateKey) {
    console.error('[ERROR] SODEX_MASTER_PRIVATE_KEY environment variable is not set.');
    process.exit(1);
  }

  // Create provider and master wallet
  const providerUrl = 'https://testnet-v2.valuechain.xyz';
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const masterWallet = new ethers.Wallet(masterPrivateKey, provider);
  console.log(`[INFO] Master Wallet Address: ${masterWallet.address}`);

  // Generate new API key credentials
  console.log('[INFO] Generating new API key credentials...');
  const apiKeyWallet = ethers.Wallet.createRandom();
  const apiKeyName = `cinder-key-${Date.now()}`;
  const apiKeyPrivateKey = apiKeyWallet.privateKey;
  const apiKeyAddress = apiKeyWallet.address;

  // SoDEX Router/Registry contract address on testnet
  const sodexContractAddress = process.env.SODEX_CONTRACT_ADDRESS || '0x378BcADaBfF12530E57223b207aA6Fd4b93b4822';
  const sodexAbi = [
    'function addAPIKey(string apiKeyName, address apiKeyAddress, uint256 permissions) external'
  ];

  const sodexContract = new ethers.Contract(sodexContractAddress, sodexAbi, masterWallet);

  console.log(`[INFO] Attempting on-chain registration of API Key "${apiKeyName}" (${apiKeyAddress}) on ValueChain testnet...`);
  try {
    const balance = await provider.getBalance(masterWallet.address);
    console.log(`[INFO] Master wallet balance: ${ethers.utils.formatEther(balance)} SOSO`);

    if (balance.gt(0)) {
      // permissions: 3 represents trade permissions (read + write/execute)
      const tx = await sodexContract.addAPIKey(apiKeyName, apiKeyAddress, 3);
      console.log(`[INFO] Transaction submitted. Hash: ${tx.hash}`);
      console.log('[INFO] Waiting for transaction receipt...');
      const receipt = await tx.wait();
      console.log('[SUCCESS] On-chain API Key registration transaction confirmed!');
    } else {
      console.warn('[WARNING] Master wallet has 0.0 balance. On-chain registration transaction skipped (needs testnet SOSO gas).');
      console.warn(`[WARNING] Please seed master address ${masterWallet.address} at https://faucet.valuechain.xyz if needed.`);
    }
  } catch (err) {
    console.error('[ERROR] On-chain registration failed:', err.message);
  }

  // Test signature verification by signing a request to the SoDEX Gateway
  console.log('\n[INFO] Testing signature verification with the new API key on SoDEX testnet gateway...');
  const testnetGatewayUrl = 'https://testnet-gw.sodex.dev/api/v1/spot';
  const endpointPath = `/accounts/${encodeURIComponent(apiKeyAddress.toLowerCase())}/state`;

  try {
    const actionType = 'getAccountState';
    const params = { userAddress: apiKeyAddress.toLowerCase() };
    const market = 'spot';
    const isMainnet = false;

    // Generate signature headers using getOrderSignatureHeaders
    const headers = await getOrderSignatureHeaders(
      actionType,
      params,
      apiKeyPrivateKey,
      apiKeyName,
      market,
      isMainnet
    );

    console.log('[INFO] Sending signed request to gateway...');
    const response = await fetch(`${testnetGatewayUrl}${endpointPath}`, {
      method: 'GET',
      headers: headers
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[SUCCESS] Signed request successfully passed SoDEX gateway signature verification!');
      console.log('[INFO] Response data:', JSON.stringify(data));
    } else {
      const text = await response.text();
      console.error(`[ERROR] Signed request rejected by gateway (Status ${response.status}):`, text);
    }
  } catch (err) {
    console.error('[ERROR] Failed testing signed request against gateway:', err.message);
  }

  console.log('\n================================================================');
  console.log('[SUCCESS] API Key credentials generated successfully!');
  console.log('Copy and save the following values into your environment configuration:');
  console.log('----------------------------------------------------------------');
  console.log(`SODEX_API_KEY_NAME=${apiKeyName}`);
  console.log(`SODEX_API_KEY_PRIVATE_KEY=${apiKeyPrivateKey}`);
  console.log('================================================================');
  console.log('[IMPORTANT] The master private key was never logged or written to disk.');
}

main().catch(err => {
  console.error('[FATAL] Script execution failed:', err);
  process.exit(1);
});
