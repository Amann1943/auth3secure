const { ethers } = require('ethers');
const { RiskEngine } = require('../ai/riskEngine');
const { ZKPEngine } = require('../zkp/zkpEngine');
const { MFAModule } = require('../mfa/mfaModule');

class Auth3GuardSDK {
    constructor(config) {
        this.config = config;
        this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
        this.contract = new ethers.Contract(
            config.contractAddress,
            config.contractAbi,
            this.provider
        );
        
        this.riskEngine = new RiskEngine(config.riskEngine);
        this.zkpEngine = new ZKPEngine(config.zkpEngine);
        this.mfaModule = new MFAModule(config.mfa);

        this.initialize();
    }

    async initialize() {
        try {
            await Promise.all([
                this.riskEngine.initialize(),
                this.zkpEngine.initialize(),
                this.mfaModule.initialize()
            ]);
            console.log("Auth3Guard SDK initialized successfully");
        } catch (error) {
            console.error("Error initializing Auth3Guard SDK:", error);
            throw error;
        }
    }

    async registerUser(userData) {
        try {
            const {
                address,
                biometricData,
                guardians,
                deviceInfo
            } = userData;

            // Generate ZKP commitment
            const zkpCommitment = await this.zkpEngine.generateCommitment(userData);

            // Register biometric template
            const biometricTemplate = await this.mfaModule.registerBiometric(biometricData);

            // Assess initial risk score
            const riskAssessment = await this.riskEngine.assessLoginRisk({
                userAddress: address,
                deviceInfo,
                timestamp: Date.now()
            });

            // Submit registration transaction
            const tx = await this.contract.registerUser(
                zkpCommitment,
                guardians,
                biometricTemplate.hash
            );

            return {
                success: true,
                transactionHash: tx.hash,
                zkpCommitment,
                biometricTemplate: biometricTemplate.hash,
                riskAssessment
            };
        } catch (error) {
            console.error("Error in user registration:", error);
            throw error;
        }
    }

    async authenticate(authData) {
        try {
            const {
                address,
                signature,
                biometricData,
                deviceInfo
            } = authData;

            // Assess authentication risk
            const riskAssessment = await this.riskEngine.assessLoginRisk({
                userAddress: address,
                deviceInfo,
                timestamp: Date.now()
            });

            if (riskAssessment.isHighRisk) {
                return {
                    success: false,
                    reason: 'High risk authentication attempt',
                    riskDetails: riskAssessment
                };
            }

            // Verify all factors
            const [walletVerification, biometricVerification] = await Promise.all([
                this.mfaModule.verifyWalletSignature(
                    authData.message,
                    signature,
                    address
                ),
                this.mfaModule.verifyBiometric(
                    biometricData,
                    authData.storedTemplate
                )
            ]);

            if (!walletVerification.isValid || !biometricVerification.isValid) {
                return {
                    success: false,
                    reason: 'Invalid credentials',
                    walletVerification,
                    biometricVerification
                };
            }

            // Generate and verify ZKP
            const zkProof = await this.zkpEngine.generate