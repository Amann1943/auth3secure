const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Starting Auth3Guard deployment...");
    
    try {
        // Get deployment account
        const [deployer] = await ethers.getSigners();
        console.log("Deploying with account:", deployer.address);

        // Deploy Auth3Guard
        const Auth3Guard = await ethers.getContractFactory("Auth3Guard");
        const auth3Guard = await Auth3Guard.deploy();
        await auth3Guard.deployed();
        console.log("Auth3Guard deployed to:", auth3Guard.address);

        // Deploy AI Oracle (mock for testing)
        const AIOracle = await ethers.getContractFactory("AIOracle");
        const aiOracle = await AIOracle.deploy();
        await aiOracle.deployed();
        console.log("AI Oracle deployed to:", aiOracle.address);

        // Deploy ZKP Verifier
        const ZKPVerifier = await ethers.getContractFactory("ZKPVerifier");
        const zkpVerifier = await ZKPVerifier.deploy();
        await zkpVerifier.deployed();
        console.log("ZKP Verifier deployed to:", zkpVerifier.address);

        // Set up roles
        await auth3Guard.setAIOracle(aiOracle.address);
        await auth3Guard.setZKPVerifier(zkpVerifier.address);

        // Save deployment info
        const deploymentInfo = {
            auth3Guard: auth3Guard.address,
            aiOracle: aiOracle.address,
            zkpVerifier: zkpVerifier.address,
            network: network.name,
            deployer: deployer.address,
            timestamp: new Date().toISOString()
        };

        const deploymentPath = path.join(__dirname, "../deployments");
        if (!fs.existsSync(deploymentPath)) {
            fs.mkdirSync(deploymentPath);
        }

        fs.writeFileSync(
            path.join(deploymentPath, `${network.name}.json`),
            JSON.stringify(deploymentInfo, null, 2)
        );

        console.log("Deployment completed successfully!");

    } catch (error) {
        console.error("Error during deployment:", error);
        process.exitCode = 1;
    }
}

main();