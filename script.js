document.addEventListener("DOMContentLoaded", async () => {
    if (typeof window.ethereum !== "undefined") {
        window.web3 = new Web3(window.ethereum);
        document.getElementById("connectWallet").addEventListener("click", connectWallet);
        document.getElementById("loginZKP").addEventListener("click", registerWithZKP);
        document.getElementById("sendTransaction").addEventListener("click", sendTransaction);
        document.getElementById("recoverAccount").addEventListener("click", recoverAccount);
    } else {
        alert("Please install MetaMask to use Auth3 Guard.");
    }
});

const contractABI = [];  // Paste your contract ABI here
const contractAddress = "0xYourDeployedContractAddress";
const auth3Guard = new web3.eth.Contract(contractABI, contractAddress);

async function connectWallet() {
    try {
        const accounts = await ethereum.request({ method: "eth_requestAccounts" });
        document.getElementById("userInfo").innerText = `✅ Connected: ${accounts[0]}`;
    } catch (error) {
        console.error("Wallet connection failed", error);
    }
}

async function registerWithZKP() {
    document.getElementById("loginStatus").innerText = "🔄 Generating ZKP...";

    const accounts = await ethereum.request({ method: "eth_requestAccounts" });

    // Generate a random Ethereum address for ZKP proof hash simulation
    function generateRandomEthereumAddress() {
        return "0x" + [...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
    }

    const zkpProofHash = generateRandomEthereumAddress();
    const guardians = [generateRandomEthereumAddress(), generateRandomEthereumAddress()];

    try {
        await auth3Guard.methods.register(zkpProofHash, guardians)
            .send({ from: accounts[0] });

        document.getElementById("loginStatus").innerText = `✅ Registered Successfully!\nZKP Hash: ${zkpProofHash}`;
    } catch (error) {
        console.error("Registration failed", error);
    }
}

async function sendTransaction() {
    const recipient = document.getElementById("recipient").value;
    const amount = document.getElementById("amount").value;

    if (!recipient || !amount) {
        alert("❌ Please enter recipient address and amount");
        return;
    }

    document.getElementById("transactionStatus").innerText = "🔄 Checking AI Risk Engine...";
    setTimeout(async () => {
        document.getElementById("transactionStatus").innerText = "✅ Transaction Approved & Sent!";
    }, 3000);
}

async function recoverAccount() {
    document.getElementById("recoveryStatus").innerText = "🔄 Initiating Guardian Recovery...";

    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    const newWallet = generateRandomEthereumAddress();
    const newZkpHash = generateRandomEthereumAddress();
    const guardianApprovals = [generateRandomEthereumAddress(), generateRandomEthereumAddress()];

    try {
        await auth3Guard.methods.recoverAccount(newWallet, newZkpHash, guardianApprovals)
            .send({ from: accounts[0] });

        document.getElementById("recoveryStatus").innerText = `✅ Account Successfully Recovered!\nNew Wallet: ${newWallet}`;
    } catch (error) {
        console.error("Recovery failed", error);
    }
}
