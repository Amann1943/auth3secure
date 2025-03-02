const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize SDK
const Auth3GuardSDK = require('./src/sdk/integration');
const auth3Guard = new Auth3GuardSDK({
    contractAddress: process.env.CONTRACT_ADDRESS,
    rpcUrl: process.env.RPC_URL
});

// API Routes
app.post('/api/register', async (req, res) => {
    try {
        const result = await auth3Guard.registerUser(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/authenticate', async (req, res) => {
    try {
        const result = await auth3Guard.authenticate(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});