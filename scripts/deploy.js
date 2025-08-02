const { ethers, artifacts } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Starting deployment...");
    
    // Get the network info
    const network = await ethers.provider.getNetwork();
    console.log(`Deploying to network: ${network.name} (Chain ID: ${network.chainId})`);
    
    // Get the signer and display the address
    const [signer] = await ethers.getSigners();
    console.log(`Deploying from address: ${signer.address}`);
    
    // Check balance
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`Balance: ${ethers.formatEther(balance)} MONAD`);
    
    // Check if we're deploying to Monad
    const isMonad = network.chainId === 1337n || network.chainId === 1338n;
    if (isMonad) {
        console.log("Deploying to Monad network - optimizing for parallel execution...");
    }

    // Get the contract factory
    const ContractFactory = await ethers.getContractFactory("Mines");

    // Deploy the contract
    console.log("Deploying Mines contract...");
    const contract = await ContractFactory.deploy(/* constructor arguments if any */);

    // Wait for deployment to complete
    console.log("Waiting for deployment confirmation...");
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`Contract deployed to: ${contractAddress}`);
    
    if (isMonad) {
        console.log("✅ Contract successfully deployed to Monad network!");
        console.log("🔗 You can view your contract on Monad Explorer");
    }

    // Save contract details for the frontend
    saveFrontendFiles(contract, "Mines");
}

function saveFrontendFiles(contract, name) {
    const contractsDir = path.join(__dirname, "../src/contract_data/");

    // Ensure the directory exists
    if (!fs.existsSync(contractsDir)) {
        fs.mkdirSync(contractsDir, { recursive: true });
    }

    // Save contract address
    fs.writeFileSync(
        path.join(contractsDir, `${name}-address.json`),
        JSON.stringify({ address: contract.target }, null, 2) // Use contract.target for new ethers.js versions
    );

    // Save contract ABI
    const contractArtifact = artifacts.readArtifactSync(name);
    fs.writeFileSync(
        path.join(contractsDir, `${name}.json`),
        JSON.stringify(contractArtifact, null, 2)
    );

    console.log(`Contract artifacts saved to ${contractsDir}`);
}

// Execute the deployment script
main()
    .then(() => {
        console.log("Deployment completed successfully!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });
