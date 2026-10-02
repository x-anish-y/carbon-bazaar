const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CarbonCreditBatch", function () {
  let contract;
  let owner, issuer, buyer, other;

  const PROJECT_HASH = "sha256:abc123def456789";
  const METADATA_URI = "https://api.carbonbazaar.in/metadata/1";
  const MINT_AMOUNT = 1000;

  beforeEach(async function () {
    [owner, issuer, buyer, other] = await ethers.getSigners();

    const CarbonCreditBatch = await ethers.getContractFactory("CarbonCreditBatch");
    contract = await CarbonCreditBatch.deploy("https://api.carbonbazaar.in/metadata/");
    await contract.waitForDeployment();
  });

  // ── Minting ──────────────────────────────────────────────────────────

  describe("Minting", function () {
    it("should mint a new batch and assign tokens to issuer", async function () {
      const tx = await contract.mintBatch(
        issuer.address,
        MINT_AMOUNT,
        PROJECT_HASH,
        METADATA_URI
      );
      await tx.wait();

      // Check balance
      expect(await contract.balanceOf(issuer.address, 1)).to.equal(MINT_AMOUNT);

      // Check batch info
      const info = await contract.getBatchInfo(1);
      expect(info.issuer).to.equal(issuer.address);
      expect(info.totalSupply).to.equal(MINT_AMOUNT);
      expect(info.totalRetired).to.equal(0);
      expect(info.activeSupply).to.equal(MINT_AMOUNT);
      expect(info.projectHash).to.equal(PROJECT_HASH);
      expect(info.metadataURI).to.equal(METADATA_URI);
    });

    it("should emit BatchMinted event", async function () {
      await expect(
        contract.mintBatch(issuer.address, MINT_AMOUNT, PROJECT_HASH, METADATA_URI)
      )
        .to.emit(contract, "BatchMinted")
        .withArgs(1, issuer.address, MINT_AMOUNT, PROJECT_HASH, METADATA_URI);
    });

    it("should auto-increment token IDs", async function () {
      await contract.mintBatch(issuer.address, 100, PROJECT_HASH, METADATA_URI);
      await contract.mintBatch(issuer.address, 200, "hash2", "uri2");

      expect(await contract.balanceOf(issuer.address, 1)).to.equal(100);
      expect(await contract.balanceOf(issuer.address, 2)).to.equal(200);
      expect(await contract.nextTokenId()).to.equal(3);
    });

    it("should reject minting from non-owner", async function () {
      await expect(
        contract
          .connect(other)
          .mintBatch(issuer.address, MINT_AMOUNT, PROJECT_HASH, METADATA_URI)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("should reject minting with zero amount", async function () {
      await expect(
        contract.mintBatch(issuer.address, 0, PROJECT_HASH, METADATA_URI)
      ).to.be.revertedWith("CarbonCredit: amount must be greater than 0");
    });

    it("should reject minting to zero address", async function () {
      await expect(
        contract.mintBatch(ethers.ZeroAddress, MINT_AMOUNT, PROJECT_HASH, METADATA_URI)
      ).to.be.revertedWith("CarbonCredit: issuer cannot be zero address");
    });

    it("should reject minting with empty project hash", async function () {
      await expect(
        contract.mintBatch(issuer.address, MINT_AMOUNT, "", METADATA_URI)
      ).to.be.revertedWith("CarbonCredit: projectHash is required");
    });
  });

  // ── Transfer ─────────────────────────────────────────────────────────

  describe("Transfer", function () {
    beforeEach(async function () {
      await contract.mintBatch(issuer.address, MINT_AMOUNT, PROJECT_HASH, METADATA_URI);
      // Approve the contract owner as operator so it can transfer on behalf of issuer
      await contract.connect(issuer).setApprovalForAll(owner.address, true);
    });

    it("should transfer credits from issuer to buyer", async function () {
      const transferAmount = 250;

      await contract.transferCredits(
        issuer.address,
        buyer.address,
        1,
        transferAmount
      );

      expect(await contract.balanceOf(issuer.address, 1)).to.equal(
        MINT_AMOUNT - transferAmount
      );
      expect(await contract.balanceOf(buyer.address, 1)).to.equal(transferAmount);
    });

    it("should emit CreditsTransferred event", async function () {
      await expect(
        contract.transferCredits(issuer.address, buyer.address, 1, 100)
      )
        .to.emit(contract, "CreditsTransferred")
        .withArgs(1, issuer.address, buyer.address, 100);
    });

    it("should allow issuer to transfer directly", async function () {
      await contract
        .connect(issuer)
        .transferCredits(issuer.address, buyer.address, 1, 100);

      expect(await contract.balanceOf(buyer.address, 1)).to.equal(100);
    });

    it("should reject transfer from non-approved caller", async function () {
      await expect(
        contract
          .connect(other)
          .transferCredits(issuer.address, buyer.address, 1, 100)
      ).to.be.revertedWith("CarbonCredit: caller is not owner nor approved");
    });

    it("should reject transfer of more than balance", async function () {
      await expect(
        contract.transferCredits(issuer.address, buyer.address, 1, MINT_AMOUNT + 1)
      ).to.be.reverted;
    });

    it("should reject transfer to zero address", async function () {
      await expect(
        contract.transferCredits(issuer.address, ethers.ZeroAddress, 1, 100)
      ).to.be.revertedWith("CarbonCredit: cannot transfer to zero address");
    });

    it("should reject transfer of non-existent batch", async function () {
      await expect(
        contract.transferCredits(issuer.address, buyer.address, 999, 100)
      ).to.be.revertedWith("CarbonCredit: batch does not exist");
    });
  });

  // ── Retirement ───────────────────────────────────────────────────────

  describe("Retirement", function () {
    beforeEach(async function () {
      await contract.mintBatch(issuer.address, MINT_AMOUNT, PROJECT_HASH, METADATA_URI);
      await contract.connect(issuer).setApprovalForAll(owner.address, true);
      // Transfer some to buyer
      await contract.transferCredits(issuer.address, buyer.address, 1, 500);
      // Buyer approves owner as operator
      await contract.connect(buyer).setApprovalForAll(owner.address, true);
    });

    it("should retire credits (burn) from holder", async function () {
      await contract.retireCredits(buyer.address, 1, 200);

      expect(await contract.balanceOf(buyer.address, 1)).to.equal(300);

      const info = await contract.getBatchInfo(1);
      expect(info.totalRetired).to.equal(200);
      expect(info.activeSupply).to.equal(800); // 1000 - 200 retired

      expect(await contract.getRetiredAmount(1, buyer.address)).to.equal(200);
    });

    it("should emit CreditsRetired event", async function () {
      await expect(contract.retireCredits(buyer.address, 1, 100))
        .to.emit(contract, "CreditsRetired")
        .withArgs(1, buyer.address, 100, await getBlockTimestamp());
    });

    it("should allow holder to retire directly", async function () {
      await contract.connect(buyer).retireCredits(buyer.address, 1, 100);
      expect(await contract.balanceOf(buyer.address, 1)).to.equal(400);
    });

    it("should reject retirement of more than balance", async function () {
      await expect(
        contract.retireCredits(buyer.address, 1, 501)
      ).to.be.revertedWith("CarbonCredit: insufficient balance to retire");
    });

    it("should reject retirement from non-approved caller", async function () {
      await expect(
        contract.connect(other).retireCredits(buyer.address, 1, 100)
      ).to.be.revertedWith("CarbonCredit: caller is not holder nor approved");
    });

    it("should track cumulative retirements per holder", async function () {
      await contract.retireCredits(buyer.address, 1, 50);
      await contract.retireCredits(buyer.address, 1, 75);

      expect(await contract.getRetiredAmount(1, buyer.address)).to.equal(125);
    });
  });

  // ── URI ──────────────────────────────────────────────────────────────

  describe("URI", function () {
    it("should return batch-specific metadata URI", async function () {
      await contract.mintBatch(issuer.address, 100, PROJECT_HASH, METADATA_URI);
      expect(await contract.uri(1)).to.equal(METADATA_URI);
    });

    it("should return base URI for unminted tokens", async function () {
      const baseURI = await contract.uri(999);
      expect(baseURI).to.equal("https://api.carbonbazaar.in/metadata/");
    });
  });

  // ── Helpers ──────────────────────────────────────────────────────────

  async function getBlockTimestamp() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  }
});
