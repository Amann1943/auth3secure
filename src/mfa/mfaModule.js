const { ethers } = require('ethers');
const crypto = require('crypto');
const { WebAuthn } = require('@simplewebauthn/server');
const { BiometricVerifier } = require('./biometric');

class MFAModule {
    constructor(config) {
        this.config = config;
        this.webAuthn = new WebAuthn(config.webAuthn);
        this.biometricVerifier = new BiometricVerifier(config.biometric);
        this.initialize();
    }

    async initialize() {
        try {
            await this.webAuthn.initialize();
            await this.biometricVerifier.initialize();
            console.log("MFA Module initialized successfully");
        } catch (error) {
            console.error("Error initializing MFA Module:", error);
            throw error;
        }
    }

    async verifyWalletSignature(message, signature, address) {
        try {
            const recoveredAddress = ethers.utils.verifyMessage(message, signature);
            return {
                isValid: recoveredAddress.toLowerCase() === address.toLowerCase(),
                timestamp: Date.now(),
                metadata: {
                    signatureType: 'ECDSA',
                    recoveredAddress
                }
            };
        } catch (error) {
            console.error("Wallet signature verification error:", error);
            return { isValid: false, error: error.message };
        }
    }

    async verifyBiometric(biometricData, storedTemplate) {
        try {
            const verificationResult = await this.biometricVerifier.verify(
                biometricData,
                storedTemplate
            );

            return {
                isValid: verificationResult.score > this.config.biometric.threshold,
                score: verificationResult.score,
                metadata: verificationResult.metadata
            };
        } catch (error) {
            console.error("Biometric verification error:", error);
            return { isValid: false, error: error.message };
        }
    }

    async verifyWebAuthn(credential, challenge) {
        try {
            const verification = await this.webAuthn.verifyAuthentication(
                credential,
                challenge
            );

            return {
                isValid: verification.verified,
                metadata: verification.authenticatorData
            };
        } catch (error) {
            console.error("WebAuthn verification error:", error);
            return { isValid: false, error: error.message };
        }
    }

    async initiateRecovery(userAddress, guardians) {
        const recoveryRequest = {
            userAddress,
            timestamp: Date.now(),
            nonce: crypto.randomBytes(32).toString('hex')
        };

        const message = this.formatRecoveryMessage(recoveryRequest);
        const signatures = await this.collectGuardianSignatures(message, guardians);

        return {
            recoveryRequest,
            signatures,
            threshold: Math.ceil(guardians.length * 0.66) // 66% threshold
        };
    }

    async verifyRecovery(recoveryData) {
        const {
            recoveryRequest,
            signatures,
            threshold
        } = recoveryData;

        let validSignatures = 0;
        const message = this.formatRecoveryMessage(recoveryRequest);

        for (const signature of signatures) {
            const recovery = await this.verifyGuardianSignature(
                message,
                signature,
                recoveryRequest.userAddress
            );
            if (recovery.isValid) validSignatures++;
        }

        return {
            isValid: validSignatures >= threshold,
            validSignatures,
            threshold
        };
    }

    private formatRecoveryMessage(request) {
        return ethers.utils.solidityKeccak256(
            ['address', 'uint256', 'bytes32'],
            [request.userAddress, request.timestamp, request.nonce]
        );
    }

    private async verifyGuardianSignature(message, signature, userAddress) {
        try {
            const recoveredAddress = ethers.utils.verifyMessage(message, signature);
            return { isValid: true, guardian: recoveredAddress };
        } catch (error) {
            return { isValid: false, error: error.message };
        }
    }
}

module.exports = MFAModule;