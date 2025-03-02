const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Auth3Guard", function () {
    let auth3Guard;
    let owner;
    let user;
    let guardians;
    let attacker;

    beforeEach(async function () {
        [owner, user, ...guardians] = await ethers.getSigners();
        
        // Deploy contract
        const Auth3Guard = await ethers.getContractFactory("Auth3Guard");
        auth3Guard = await Auth3Guard.deploy();
        await auth3Guard.deployed();
    });

    describe("User Registration", function () {
        it("should register a new user with valid parameters", async function () {
            const zkpCommitment = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
            const guardianAddresses = guardians.slice(0, 3).map(g => g.address);
            const biometricHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-biometric"));

            await expect(auth3Guard.connect(user).registerUser(
                zkpCommitment,
                guardianAddresses,
                biometricHash
            )).to.emit(auth3Guard, "UserRegistered")
              .withArgs(user.address);
        });

        it("should not allow registration with insufficient guardians", async function () {
            const zkpCommitment = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
            const guardianAddresses = guardians.slice(0, 2).map(g => g.address); // Only 2 guardians
            const biometricHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-biometric"));

            await expect(
                auth3Guard.connect(user).registerUser(
                    zkpCommitment,
                    guardianAddresses,
                    biometricHash
                )
            ).to.be.revertedWith("Insufficient guardians");
        });
    });

    describe("Authentication", function () {
        beforeEach(async function () {
            const zkpCommitment = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
            const guardianAddresses = guardians.slice(0, 3).map(g => g.address);
            const biometricHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-biometric"));

            await auth3Guard.connect(user).registerUser(
                zkpCommitment,
                guardianAddresses,
                biometricHash
            );
        });

        it("should authenticate with valid credentials", async function () {
            const message = ethers.utils.solidityKeccak256(
                ["address"],
                [user.address]
            );
            const signature = await user.signMessage(ethers.utils.arrayify(message));
            const zkProof = ethers.utils.hexZeroPad("0x1", 32); // Mock ZKP
            const biometricHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-biometric"));

            const result = await auth3Guard.connect(user).authenticate(
                signature,
                zkProof,
                biometricHash
            );
            
            expect(result).to.be.true;
        });
    });

    describe("Recovery", function () {
        beforeEach(async function () {
            const zkpCommitment = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
            const guardianAddresses = guardians.slice(0, 3).map(g => g.address);
            const biometricHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-biometric"));

            await auth3Guard.connect(user).registerUser(
                zkpCommitment,
                guardianAddresses,
                biometricHash
            );
        });

        it("should initiate recovery with sufficient guardian signatures", async function () {
            const message = ethers.utils.solidityKeccak256(
                ["string", "address"],
                ["Recover:", user.address]
            );

            const signatures = await Promise.all(
                guardians.slice(0, 3).map(guardian =>
                    guardian.signMessage(ethers.utils.arrayify(message))
                )
            );

            await expect(
                auth3Guard.connect(user).initiateRecovery(signatures)
            ).to.emit(auth3Guard, "RecoveryInitiated")
             .withArgs(user.address);
        });
    });
});