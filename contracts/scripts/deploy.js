const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying CarbonCreditBatch contract...");
  console.log("Deployer address:", deployer.address);
  console.log(
    "Deployer balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH/MATIC"
  );

  // Base URI for token metadata
  const baseURI = process.env.METADATA_BASE_URI || "https://api.carbonbazaar.in/metadata/";

  // Deploy contract
  const CarbonCreditBatch = await ethers.getContractFactory("CarbonCreditBatch");
  const contract = await CarbonCreditBatch.deploy(baseURI);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("CarbonCreditBatch deployed to:", contractAddress);

  // Write contract address and ABI to a JSON file for the Next.js app
  const outputDir = path.resolve(__dirname, "../../src/lib/blockchain");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Read the compiled ABI
  const artifactPath = path.resolve(
    __dirname,
    "../artifacts/src/CarbonCreditBatch.sol/CarbonCreditBatch.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const contractData = {
    address: contractAddress,
    abi: artifact.abi,
    network: {
      name: (await ethers.provider.getNetwork()).name,
      chainId: Number((await ethers.provider.getNetwork()).chainId),
    },
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };

  const outputPath = path.join(outputDir, "contract.json");
  fs.writeFileSync(outputPath, JSON.stringify(contractData, null, 2));
  console.log("Contract data written to:", outputPath);

  console.log("\n--- Deployment Summary ---");
  console.log("Contract:", contractAddress);
  console.log("Network:", contractData.network.name, `(chainId: ${contractData.network.chainId})`);
  console.log("Base URI:", baseURI);
  console.log("Output:", outputPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
