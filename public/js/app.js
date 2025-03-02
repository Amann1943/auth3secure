class Auth3Guard {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.userAddress = null;
        this.isRegistered = false;
        this.isLoggedIn = false;
        this.beneficiaries = []; // Store beneficiary data
        
        // Contract configuration
        this.contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Update with your deployed address
        this.contractABI = [
            "function register(address user, bytes32 zkpProofHash, address[] guardians) external",
            "function verifyLogin(address user, bytes32 zkpProofHash) external view returns (bool)",
            "function recover(address oldAddress, address newAddress, bytes32 zkpProofHash) external",
            "function createWill(address[] beneficiaries, uint256[] percentages) external"
        ];

        this.guardians = [
            "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
        ];

        this.initializeEventListeners();
        this.checkConnection();
    }

    async checkConnection() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    await this.setupConnection(accounts[0]);
                }
            } catch (error) {
                console.error("Error checking connection:", error);
            }

            window.ethereum.on('accountsChanged', async (accounts) => {
                if (accounts.length > 0) {
                    await this.setupConnection(accounts[0]);
                } else {
                    this.disconnectWallet();
                }
            });
        }
    }

    initializeEventListeners() {
        document.getElementById('selectedAccount').innerText = 'Not connected';
        this.updateStatus('Ready');
    }

    updateStatus(message, isError = false) {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = message;
        statusDiv.className = isError ? 'error' : 'success';
    }

    async connectWallet() {
        if (typeof window.ethereum === 'undefined') {
            this.updateStatus('Please install MetaMask!', true);
            return;
        }

        try {
            this.updateStatus('Connecting to MetaMask...');
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            await this.setupConnection(accounts[0]);
            this.updateStatus('Wallet connected successfully!');
        } catch (error) {
            console.error('Error connecting wallet:', error);
            this.updateStatus('Failed to connect wallet: ' + error.message, true);
        }
    }

    async setupConnection(address) {
        try {
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = this.provider.getSigner();
            this.userAddress = address;

            document.getElementById('selectedAccount').innerText = 
                `${this.userAddress.substring(0, 6)}...${this.userAddress.substring(38)}`;

            const balance = await this.provider.getBalance(this.userAddress);
            const ethBalance = ethers.utils.formatEther(balance);
            document.getElementById('balance').innerText = `${ethBalance.substring(0, 6)} ETH`;

            // Enable buttons
            document.getElementById('registerBtn').disabled = false;
            document.getElementById('loginBtn').disabled = false;
            document.getElementById('transactBtn').disabled = !this.isLoggedIn;
            document.getElementById('willBtn').disabled = !this.isLoggedIn;
        } catch (error) {
            console.error('Setup connection error:', error);
            this.updateStatus('Failed to setup connection', true);
        }
    }

    disconnectWallet() {
        this.provider = null;
        this.signer = null;
        this.userAddress = null;
        this.isRegistered = false;
        this.isLoggedIn = false;

        document.getElementById('selectedAccount').innerText = 'Not connected';
        document.getElementById('balance').innerText = '-';
        document.getElementById('registerBtn').disabled = true;
        document.getElementById('loginBtn').disabled = true;
        document.getElementById('transactBtn').disabled = true;
        document.getElementById('willBtn').disabled = true;
        document.getElementById('willForm').style.display = 'none';
        
        this.updateStatus('Wallet disconnected');
    }

    async register() {
        if (!this.signer) {
            this.updateStatus('Connect wallet first!', true);
            return;
        }
        try {
            const challenge = ethers.utils.hexlify(ethers.utils.randomBytes(32));
            const zkpProofHash = this.generateZKPProof(challenge);

            const contract = new ethers.Contract(this.contractAddress, this.contractABI, this.signer);
            const tx = await contract.register(this.userAddress, zkpProofHash, this.guardians);
            await tx.wait();

            this.isRegistered = true;
            this.updateStatus('Registration successful! You can now login.');
        } catch (error) {
            console.error('Registration error:', error);
            this.updateStatus('Registration failed: ' + error.message, true);
        }
    }

    async login() {
        if (!this.signer) {
            this.updateStatus('Connect wallet first!', true);
            return;
        }
        try {
            const challenge = ethers.utils.hexlify(ethers.utils.randomBytes(32));
            const zkpProofHash = this.generateZKPProof(challenge);

            const contract = new ethers.Contract(this.contractAddress, this.contractABI, this.signer);
            const isValid = await contract.verifyLogin(this.userAddress, zkpProofHash);

            if (isValid) {
                this.isLoggedIn = true;
                document.getElementById('transactBtn').disabled = false;
                document.getElementById('willBtn').disabled = false;
                this.updateStatus('Login successful! You can now make transactions or create a will.');
            } else {
                this.updateStatus('Login failed: Invalid proof.', true);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.updateStatus('Login failed: ' + error.message, true);
        }
    }

    async makeTransaction() {
        if (!this.signer || !this.isLoggedIn) {
            this.updateStatus('Login first!', true);
            return;
        }
        try {
            const transactionParameters = {
                to: '0x0000000000000000000000000000000000000000',
                from: this.userAddress,
                value: '0x0' // 0 ETH
            };

            const tx = await this.signer.sendTransaction(transactionParameters);
            await tx.wait();

            this.updateStatus('Transaction successful!');
        } catch (error) {
            console.error('Transaction error:', error);
            this.updateStatus('Transaction failed: ' + error.message, true);
        }
    }

    generateZKPProof(challenge) {
        const biometricSimulation = "simulatedFaceID";
        const proofInput = `${this.userAddress}${challenge}${biometricSimulation}`;
        return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(proofInput));
    }

    showWillForm() {
        if (!this.isLoggedIn) {
            this.updateStatus('Login first to create a will!', true);
            return;
        }
        this.beneficiaries = [];
        document.getElementById('beneficiaries').innerHTML = '';
        this.addBeneficiary(); // Add first beneficiary input
        document.getElementById('willForm').style.display = 'block';
        this.updateStatus('Add beneficiaries for your decentralized will.');
    }

    addBeneficiary() {
        const beneficiaryDiv = document.createElement('div');
        beneficiaryDiv.className = 'beneficiary';
        beneficiaryDiv.innerHTML = `
            <input type="text" placeholder="Address (0x...)" class="benAddress">
            <input type="number" placeholder="Percentage (0-100)" min="0" max="100" class="benPercentage">
            <input type="text" placeholder="Relation (e.g., Friend)" class="benRelation">
        `;
        document.getElementById('beneficiaries').appendChild(beneficiaryDiv);
    }

    async submitWill() {
        if (!this.signer || !this.isLoggedIn) {
            this.updateStatus('Login first!', true);
            return;
        }

        try {
            const benElements = document.getElementsByClassName('beneficiary');
            let totalPercentage = 0;
            const addresses = [];
            const percentages = [];

            for (let i = 0; i < benElements.length; i++) {
                const address = benElements[i].querySelector('.benAddress').value;
                const percentage = parseInt(benElements[i].querySelector('.benPercentage').value);
                const relation = benElements[i].querySelector('.benRelation').value;

                if (!ethers.utils.isAddress(address)) {
                    throw new Error(`Invalid address for beneficiary ${i + 1}`);
                }
                if (isNaN(percentage) || percentage < 0 || percentage > 100) {
                    throw new Error(`Invalid percentage for beneficiary ${i + 1}`);
                }

                addresses.push(address);
                percentages.push(percentage);
                totalPercentage += percentage;
                this.beneficiaries.push({ address, percentage, relation });
            }

            if (totalPercentage !== 100) {
                throw new Error('Total percentage must equal 100%');
            }

            // Simulate smart contract interaction
            const contract = new ethers.Contract(this.contractAddress, this.contractABI, this.signer);
            const tx = await contract.createWill(addresses, percentages);
            await tx.wait();

            document.getElementById('willForm').style.display = 'none';
            this.updateStatus('Decentralized will created successfully!');
        } catch (error) {
            console.error('Will creation error:', error);
            this.updateStatus('Failed to create will: ' + error.message, true);
        }
    }
}

// Initialize Auth3Guard instance
const auth3Guard = new Auth3Guard();

// Export for global access
window.auth3Guard = auth3Guard;

// Listen for window load
window.addEventListener('load', () => {
    if (typeof window.ethereum === 'undefined') {
        auth3Guard.updateStatus('Please install MetaMask to use this dApp', true);
    }
});