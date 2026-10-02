// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CarbonCreditBatch
 * @notice ERC-1155 contract for tokenized carbon credit batches on Carbon Bazaar.
 *
 * Design:
 *   - Each token ID represents one verified carbon credit batch.
 *   - The contract owner (backend server wallet) is the only minter.
 *   - Credits can be transferred between wallets (sale settlement).
 *   - Credits can be retired (burned) to prove carbon offset.
 *   - Batch metadata (project hash, issuer, vintage) is stored on-chain.
 *
 * The backend is the gatekeeper: it only calls mintBatch after admin approval
 * of land verification. Business logic (payments, listings, negotiations)
 * stays off-chain in MongoDB; this contract handles ownership and provenance.
 */
contract CarbonCreditBatch is ERC1155, Ownable {
    // ── State ──────────────────────────────────────────────────────────

    /// @dev Auto-incrementing token ID counter
    uint256 private _nextTokenId;

    /// @dev Metadata for each carbon credit batch
    struct BatchInfo {
        address issuer;         // Wallet of the farmer/company who produced the credits
        uint256 totalSupply;    // Total credits minted in this batch (in wei-like units, 4 decimals)
        uint256 totalRetired;   // Total credits retired (burned) from this batch
        string projectHash;     // SHA-256 hash of the project verification data
        string metadataURI;     // URI pointing to full batch metadata JSON
        uint256 mintedAt;       // Block timestamp of minting
        bool exists;            // Whether this batch exists
    }

    /// @dev tokenId => BatchInfo
    mapping(uint256 => BatchInfo) public batches;

    /// @dev tokenId => (holder => amount retired by that holder)
    mapping(uint256 => mapping(address => uint256)) public retiredByHolder;

    // ── Events ─────────────────────────────────────────────────────────

    event BatchMinted(
        uint256 indexed tokenId,
        address indexed issuer,
        uint256 amount,
        string projectHash,
        string metadataURI
    );

    event CreditsTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 amount
    );

    event CreditsRetired(
        uint256 indexed tokenId,
        address indexed holder,
        uint256 amount,
        uint256 timestamp
    );

    // ── Constructor ────────────────────────────────────────────────────

    /**
     * @param baseURI  Base URI for token metadata (e.g. "https://api.carbonbazaar.in/metadata/")
     */
    constructor(string memory baseURI) ERC1155(baseURI) Ownable(msg.sender) {
        _nextTokenId = 1; // Token IDs start at 1
    }

    // ── Minting (owner only) ───────────────────────────────────────────

    /**
     * @notice Mint a new carbon credit batch after admin verification.
     * @param issuer      Wallet address of the credit producer (farmer/company)
     * @param amount      Number of credits to mint (use 4-decimal precision, e.g. 1000.5 = 10005000)
     * @param projectHash SHA-256 hash of the verification documents
     * @param metadataURI URI pointing to the full batch metadata JSON
     * @return tokenId    The ID of the newly minted batch
     */
    function mintBatch(
        address issuer,
        uint256 amount,
        string calldata projectHash,
        string calldata metadataURI
    ) external onlyOwner returns (uint256) {
        require(issuer != address(0), "CarbonCredit: issuer cannot be zero address");
        require(amount > 0, "CarbonCredit: amount must be greater than 0");
        require(bytes(projectHash).length > 0, "CarbonCredit: projectHash is required");

        uint256 tokenId = _nextTokenId++;

        // Store batch metadata
        batches[tokenId] = BatchInfo({
            issuer: issuer,
            totalSupply: amount,
            totalRetired: 0,
            projectHash: projectHash,
            metadataURI: metadataURI,
            mintedAt: block.timestamp,
            exists: true
        });

        // Mint tokens to the issuer
        _mint(issuer, tokenId, amount, "");

        emit BatchMinted(tokenId, issuer, amount, projectHash, metadataURI);

        return tokenId;
    }

    // ── Transfer ───────────────────────────────────────────────────────

    /**
     * @notice Transfer credits from seller to buyer (called by owner/operator after payment).
     * @dev The owner (server wallet) must be an approved operator for the seller,
     *      or this must be called by the seller directly.
     * @param from    Seller wallet
     * @param to      Buyer wallet
     * @param tokenId The batch token ID
     * @param amount  Number of credits to transfer
     */
    function transferCredits(
        address from,
        address to,
        uint256 tokenId,
        uint256 amount
    ) external {
        require(batches[tokenId].exists, "CarbonCredit: batch does not exist");
        require(amount > 0, "CarbonCredit: amount must be greater than 0");
        require(to != address(0), "CarbonCredit: cannot transfer to zero address");

        // The caller must be the token holder OR an approved operator OR the contract owner (custodial operator)
        require(
            from == msg.sender || isApprovedForAll(from, msg.sender) || msg.sender == owner(),
            "CarbonCredit: caller is not owner nor approved"
        );

        _safeTransferFrom(from, to, tokenId, amount, "");

        emit CreditsTransferred(tokenId, from, to, amount);
    }

    // ── Retirement (burn) ──────────────────────────────────────────────

    /**
     * @notice Retire (burn) credits to prove carbon offset. This is irreversible.
     * @param holder  The wallet holding the credits to retire
     * @param tokenId The batch token ID
     * @param amount  Number of credits to retire
     */
    function retireCredits(
        address holder,
        uint256 tokenId,
        uint256 amount
    ) external {
        require(batches[tokenId].exists, "CarbonCredit: batch does not exist");
        require(amount > 0, "CarbonCredit: amount must be greater than 0");
        require(
            holder == msg.sender || isApprovedForAll(holder, msg.sender) || msg.sender == owner(),
            "CarbonCredit: caller is not holder nor approved"
        );
        require(
            balanceOf(holder, tokenId) >= amount,
            "CarbonCredit: insufficient balance to retire"
        );

        // Burn the tokens
        _burn(holder, tokenId, amount);

        // Track retirement
        batches[tokenId].totalRetired += amount;
        retiredByHolder[tokenId][holder] += amount;

        emit CreditsRetired(tokenId, holder, amount, block.timestamp);
    }

    // ── View functions ─────────────────────────────────────────────────

    /**
     * @notice Get batch metadata for a token ID.
     */
    function getBatchInfo(uint256 tokenId)
        external
        view
        returns (
            address issuer,
            uint256 totalSupply,
            uint256 totalRetired,
            uint256 activeSupply,
            string memory projectHash,
            string memory metadataURI,
            uint256 mintedAt
        )
    {
        require(batches[tokenId].exists, "CarbonCredit: batch does not exist");
        BatchInfo storage info = batches[tokenId];
        return (
            info.issuer,
            info.totalSupply,
            info.totalRetired,
            info.totalSupply - info.totalRetired,
            info.projectHash,
            info.metadataURI,
            info.mintedAt
        );
    }

    /**
     * @notice Get the number of credits retired by a specific holder for a batch.
     */
    function getRetiredAmount(uint256 tokenId, address holder)
        external
        view
        returns (uint256)
    {
        return retiredByHolder[tokenId][holder];
    }

    /**
     * @notice Get the next token ID that will be assigned.
     */
    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @notice Override URI to return batch-specific metadata URI if set.
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        if (batches[tokenId].exists && bytes(batches[tokenId].metadataURI).length > 0) {
            return batches[tokenId].metadataURI;
        }
        return super.uri(tokenId);
    }
}
