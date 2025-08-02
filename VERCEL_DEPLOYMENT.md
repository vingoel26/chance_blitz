# Vercel Deployment Guide

## 🚀 Deploying Your Blockchain Gaming App to Vercel

### Prerequisites
- [Vercel Account](https://vercel.com)
- [GitHub Account](https://github.com)
- Node.js 18+ installed locally

### Step 1: Prepare Your Repository

1. **Push to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **Ensure your repository is public** (Vercel works best with public repos)

### Step 2: Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Click "New Project"**
3. **Import your GitHub repository**
4. **Configure the project:**
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (leave as default)
   - **Install Command**: `npm install`

5. **Environment Variables** (if needed):
   - Add any environment variables your app needs
   - For blockchain apps, you might need contract addresses

6. **Click "Deploy"**

#### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

### Step 3: Configure Domain (Optional)

1. **Custom Domain**: Add your custom domain in Vercel dashboard
2. **SSL**: Automatically handled by Vercel
3. **CDN**: Automatically distributed globally

### Step 4: Smart Contract Deployment

**Important**: Your smart contracts need to be deployed separately on the blockchain network.

1. **Deploy contracts to Monad testnet**:
   ```bash
   npm run hardhat:deploy:monad-testnet
   ```

2. **Update contract addresses** in your frontend:
   - Update `src/contract_data/Mines-address.json`
   - Update any other contract address files

3. **Redeploy frontend** if contract addresses changed

### Step 5: Environment Configuration

#### Required Environment Variables

Create a `.env.local` file locally (for development) and add these to Vercel environment variables:

```env
# Blockchain Configuration
NEXT_PUBLIC_MONAD_TESTNET_RPC=https://rpc.testnet.monad.xyz
NEXT_PUBLIC_MONAD_MAINNET_RPC=https://rpc.monad.xyz
NEXT_PUBLIC_CHAIN_ID=10143

# Contract Addresses (update after deployment)
NEXT_PUBLIC_MINES_CONTRACT_ADDRESS=your_deployed_contract_address
```

#### Adding Environment Variables in Vercel

1. Go to your project in Vercel dashboard
2. Click "Settings" → "Environment Variables"
3. Add each variable with appropriate values
4. Redeploy if needed

### Step 6: Testing Your Deployment

1. **Test wallet connection**: Ensure MetaMask can connect
2. **Test contract interaction**: Try placing a small bet
3. **Test all games**: Verify each game works properly
4. **Test on mobile**: Check responsive design

### Troubleshooting

#### Common Issues

1. **Build Errors**:
   - Check Node.js version (use 18+)
   - Ensure all dependencies are in `package.json`
   - Check for TypeScript errors

2. **Contract Connection Issues**:
   - Verify contract addresses are correct
   - Ensure RPC URLs are accessible
   - Check network configuration

3. **Wallet Connection Issues**:
   - Ensure MetaMask is installed
   - Check if Monad network is added to MetaMask
   - Verify chain ID configuration

#### Debug Commands

```bash
# Local build test
npm run build

# Check for linting issues
npm run lint

# Test contract deployment
npm run hardhat:deploy:monad-testnet
```

### Performance Optimization

1. **Image Optimization**: Use Next.js Image component
2. **Code Splitting**: Automatic with Next.js
3. **Caching**: Configured automatically by Vercel
4. **CDN**: Global distribution handled by Vercel

### Security Considerations

1. **Environment Variables**: Never commit sensitive data
2. **Contract Security**: Audit smart contracts before mainnet
3. **User Funds**: Implement proper security measures
4. **Rate Limiting**: Consider implementing for API calls

### Monitoring

1. **Vercel Analytics**: Enable in dashboard
2. **Error Tracking**: Set up error monitoring
3. **Performance Monitoring**: Use Vercel's built-in tools
4. **Uptime Monitoring**: Set up alerts

### Continuous Deployment

1. **Auto-deploy**: Vercel automatically deploys on git push
2. **Preview deployments**: Automatic for pull requests
3. **Rollback**: Easy rollback to previous versions
4. **Branch deployments**: Deploy different branches to different URLs

### Final Checklist

- [ ] Repository is public and on GitHub
- [ ] All dependencies are in `package.json`
- [ ] Build command works locally (`npm run build`)
- [ ] Smart contracts are deployed to target network
- [ ] Contract addresses are updated in frontend
- [ ] Environment variables are set in Vercel
- [ ] Domain is configured (if using custom domain)
- [ ] All games are tested after deployment
- [ ] Mobile responsiveness is verified
- [ ] Wallet connection works on deployed site

### Support

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)
- **Hardhat Documentation**: [hardhat.org/docs](https://hardhat.org/docs)

Your blockchain gaming app should now be live on Vercel! 🎮✨ 