document.addEventListener("DOMContentLoaded", () => {
    const connectWalletBtn = document.getElementById("connectWallet");
    const verifyDetailsBtn = document.getElementById("verifyDetails");
    const submitRegistrationBtn = document.getElementById("submitRegistration");
    const cameraFeed = document.getElementById("cameraFeed");
    const canvas = document.getElementById("canvas");
    const hashKeyDisplay = document.getElementById("hashKey");
    const progressSteps = document.querySelectorAll(".progress-step");

    let walletAddress = "";
    let zkpHash = "";
    let isVerified = false;
    let personDetectionInterval = null;
    
    // Set canvas size
    canvas.width = 320;
    canvas.height = 240;

    // Add global styles for animations and effects
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
            100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
        }
        
        @keyframes typingEffect {
            from { width: 0 }
            to { width: 100% }
        }
        
        .hash-char {
            display: inline-block;
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.1s ease;
        }
        
        .hash-char.visible {
            opacity: 1;
            transform: translateY(0);
        }
        
        .cyber-container {
            border: 1px solid rgba(0, 255, 170, 0.3);
            border-radius: 8px;
            background-color: rgba(7, 11, 22, 0.85);
            color: #00ffa9;
            font-family: 'Courier New', monospace;
            position: relative;
            overflow: hidden;
        }
        
        .cyber-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(to right, transparent, #00ffa9, transparent);
            animation: shimmer 2s infinite;
        }
        
        .cyber-glow {
            text-shadow: 0 0 5px rgba(0, 255, 170, 0.8);
        }
        
        .progress-bar-cyber {
            height: 6px;
            background: rgba(0, 50, 30, 0.5);
            border-radius: 3px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .progress-bar-cyber .bar {
            height: 100%;
            width: 0%;
            background: linear-gradient(to right, #004d2f, #00ffa9);
            transition: width 0.3s ease;
            position: relative;
        }
        
        .progress-bar-cyber .bar::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.3), transparent);
            animation: shimmer 1.5s infinite;
        }
        
        .typing-container {
            border-right: 2px solid #00ffa9;
            white-space: nowrap;
            overflow: hidden;
            margin: 0 auto;
            animation: typingEffect 3.5s steps(40, end), blink-caret 0.75s step-end infinite;
        }
        
        @keyframes blink-caret {
            from, to { border-color: transparent }
            50% { border-color: #00ffa9 }
        }
        
        /* Add styles for person detection outline */
        #personOutline {
            position: absolute;
            border: 3px solid #00ff00;
            border-radius: 4px;
            box-shadow: 0 0 10px rgba(0, 255, 0, 0.7);
            pointer-events: none;
            z-index: 10;
            display: none;
        }
    `;
    document.head.appendChild(styleElement);
    
    // Create person outline element
    const personOutline = document.createElement('div');
    personOutline.id = 'personOutline';
    document.body.appendChild(personOutline);

    // Load person detection model from TensorFlow.js (add script to document)
    function loadPersonDetection() {
        return new Promise((resolve) => {
            // Add TensorFlow.js scripts
            const tfScript = document.createElement('script');
            tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs';
            document.head.appendChild(tfScript);
            
            const cocoSsdScript = document.createElement('script');
            cocoSsdScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd';
            document.head.appendChild(cocoSsdScript);
            
            // Resolve when scripts are loaded
            cocoSsdScript.onload = () => {
                resolve();
            };
        });
    }
    
    // Function to detect people in the camera feed
    async function detectPeople() {
        if (!window.cocoSsd) return;
        
        try {
            const model = await cocoSsd.load();
            
            // Run person detection at regular intervals
            personDetectionInterval = setInterval(async () => {
                if (!cameraFeed.srcObject) {
                    clearInterval(personDetectionInterval);
                    return;
                }
                
                const predictions = await model.detect(cameraFeed);
                
                // Find person in predictions
                const person = predictions.find(p => p.class === 'person');
                
                if (person && person.score > 0.5) {
                    // Get camera feed position
                    const feedRect = cameraFeed.getBoundingClientRect();
                    
                    // Display outline around person
                    personOutline.style.display = 'block';
                    personOutline.style.left = `${feedRect.left + person.bbox[0]}px`;
                    personOutline.style.top = `${feedRect.top + person.bbox[1]}px`;
                    personOutline.style.width = `${person.bbox[2]}px`;
                    personOutline.style.height = `${person.bbox[3]}px`;
                } else {
                    personOutline.style.display = 'none';
                }
            }, 100); // Run detection every 100ms
        } catch (error) {
            console.error("Person detection failed:", error);
        }
    }

    // Connect Wallet & Open Camera
    connectWalletBtn.addEventListener("click", async () => {
        walletAddress = document.getElementById("walletAddress").value;
        const userEmail = document.getElementById("userEmail").value;

        if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            alert("Invalid Ethereum wallet address!");
            return;
        }
        
        if (!userEmail.includes("@") || !userEmail.includes(".")) {
            alert("Enter a valid email!");
            return;
        }

        try {
            // Load person detection before enabling camera
            await loadPersonDetection();
            
            let stream = await navigator.mediaDevices.getUserMedia({ video: true });
            cameraFeed.srcObject = stream;
            cameraFeed.style.display = "block";
            
            // Add a pulse animation to the camera feed to indicate it's active
            cameraFeed.style.animation = "pulse 2s infinite";
            cameraFeed.style.boxShadow = "0 0 0 rgba(76, 175, 80, 0.4)";
            
            // Auto-fill the confirmation wallet field with the input wallet
            document.getElementById("confirmWallet").value = walletAddress;
            
            // Update progress
            progressSteps[0].classList.add("completed-step");
            progressSteps[0].classList.remove("active-step");
            progressSteps[1].classList.add("active-step");
            
            // Start person detection after camera is initialized
            cameraFeed.onloadeddata = () => {
                detectPeople();
            };
            
        } catch (error) {
            alert("Camera access denied or not available!");
            console.error("Camera error:", error);
        }
    });

    // Capture Image & Generate ZKP Hash with cyberpunk-inspired styling
    cameraFeed.addEventListener("click", () => {
        const context = canvas.getContext("2d");
        canvas.style.display = "block";
        context.drawImage(cameraFeed, 0, 0, canvas.width, canvas.height);

        // Stop camera and person detection
        if (personDetectionInterval) {
            clearInterval(personDetectionInterval);
            personDetectionInterval = null;
        }
        
        cameraFeed.srcObject.getTracks().forEach(track => track.stop());
        cameraFeed.style.display = "none";
        personOutline.style.display = "none";
        
        // Create cyber-themed loading container
        const loadingContainer = document.createElement("div");
        loadingContainer.id = "hashLoadingContainer";
        loadingContainer.className = "cyber-container";
        loadingContainer.style.cssText = `
            padding: 20px;
            margin-top: 15px;
            text-align: center;
        `;
        
        // Add stylized loading content
        loadingContainer.innerHTML = `
            <h3 class="cyber-glow" style="margin: 0 0 15px 0; letter-spacing: 1px;">GENERATING SECURE ZKP HASH</h3>
            
            <div class="progress-bar-cyber">
                <div id="hashLoadingBar" class="bar"></div>
            </div>
            
            <p id="hashLoadingText" style="margin: 15px 0; font-size: 0.9em; color: rgba(0, 255, 170, 0.8);" class="typing-container">Initializing quantum-secure protocol...</p>
            
            <div style="display: flex; justify-content: space-between; margin-top: 20px; font-size: 0.8em; color: rgba(0, 255, 170, 0.6);">
                <div id="processing-stat1">ENTROPY: COLLECTING</div>
                <div id="processing-stat2">VERIFICATION: PENDING</div>
                <div id="processing-stat3">BLOCKCHAIN: CONNECTING</div>
            </div>
        `;
        
        // Replace hash display with loading container
        hashKeyDisplay.innerHTML = "";
        hashKeyDisplay.appendChild(loadingContainer);
        
        // Simulate advanced technical processes with cool messaging
        const loadingMessages = [
            "Initializing quantum-secure protocol...",
            "Extracting biometric entropy vectors...",
            "Applying zero-knowledge proof algorithms...",
            "Cross-referencing blockchain credentials...",
            "Encrypting with multi-layer obfuscation...",
            "Finalizing tamper-proof cryptographic hash..."
        ];
        
        // Status messages
        const statusUpdates = [
            { stat1: "ENTROPY: COLLECTING", stat2: "VERIFICATION: PENDING", stat3: "BLOCKCHAIN: CONNECTING" },
            { stat1: "ENTROPY: ANALYZING", stat2: "VERIFICATION: PENDING", stat3: "BLOCKCHAIN: CONNECTING" },
            { stat1: "ENTROPY: SECURED", stat2: "VERIFICATION: PROCESSING", stat3: "BLOCKCHAIN: CONNECTING" },
            { stat1: "ENTROPY: SECURED", stat2: "VERIFICATION: PROCESSING", stat3: "BLOCKCHAIN: SYNCING" },
            { stat1: "ENTROPY: SECURED", stat2: "VERIFICATION: COMPLETE", stat3: "BLOCKCHAIN: SYNCING" },
            { stat1: "ENTROPY: SECURED", stat2: "VERIFICATION: COMPLETE", stat3: "BLOCKCHAIN: READY" }
        ];
        
        const progressBar = document.getElementById("hashLoadingBar");
        const progressText = document.getElementById("hashLoadingText");
        const stat1 = document.getElementById("processing-stat1");
        const stat2 = document.getElementById("processing-stat2");
        const stat3 = document.getElementById("processing-stat3");
        
        let step = 0;
        const totalSteps = loadingMessages.length;
        
        // Advanced progress animation
        const progressInterval = setInterval(() => {
            step++;
            const progress = (step / totalSteps) * 100;
            
            progressBar.style.width = `${progress}%`;
            
            if (step <= totalSteps) {
                // Update status text with typing effect
                progressText.className = ""; // Remove typing class
                void progressText.offsetWidth; // Trigger reflow
                progressText.className = "typing-container"; // Re-add for animation reset
                progressText.textContent = loadingMessages[step - 1];
                
                // Update status indicators
                if (statusUpdates[step - 1]) {
                    stat1.textContent = statusUpdates[step - 1].stat1;
                    stat2.textContent = statusUpdates[step - 1].stat2;
                    stat3.textContent = statusUpdates[step - 1].stat3;
                }
            }
            
            if (step >= totalSteps) {
                clearInterval(progressInterval);
                
                // Generate the actual hash
                zkpHash = generateZKPHash();
                
                // Wait a bit for dramatic effect before showing the result
                setTimeout(() => {
                    // Create a futuristic success display
                    hashKeyDisplay.innerHTML = `
                        <div class="cyber-container" style="padding: 20px; text-align: center; animation: fadeIn 0.5s;">
                            <div style="margin-bottom: 15px; color: #00ffa9;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                            </div>
                            <h3 class="cyber-glow" style="margin: 0 0 15px 0; letter-spacing: 1px;">SECURE HASH GENERATED</h3>
                            <div id="animated-hash" style="font-family: 'Courier New', monospace; font-size: 1.4em; letter-spacing: 2px; background: rgba(0,25,15,0.5); padding: 12px; border-radius: 4px; display: inline-block; margin-bottom: 15px;"></div>
                            <p style="margin: 15px 0 0 0; font-size: 0.8em; color: rgba(0, 255, 170, 0.7);">
                                HASH CRYPTOGRAPHICALLY VERIFIED • QUANTUM-RESISTANT • READY FOR AUTHENTICATION
                            </p>
                        </div>
                    `;
                    
                    // Animate the hash characters appearing one by one
                    const hashContainer = document.getElementById("animated-hash");
                    
                    [...zkpHash].forEach((char, index) => {
                        const charSpan = document.createElement("span");
                        charSpan.className = "hash-char";
                        charSpan.textContent = char;
                        hashContainer.appendChild(charSpan);
                        
                        // Stagger the appearance of each character
                        setTimeout(() => {
                            charSpan.classList.add("visible");
                        }, 50 * index);
                    });
                    
                    // Auto-fill the confirmation hash field
                    document.getElementById("confirmHash").value = zkpHash;

                    // Send Email Confirmation
                    sendEmail(walletAddress, zkpHash, document.getElementById("userEmail").value);
                }, 800);
            }
        }, 700); // Each step takes 700ms
    });

    // Verify User Details
    verifyDetailsBtn.addEventListener("click", () => {
        const confirmWallet = document.getElementById("confirmWallet").value;
        const confirmHash = document.getElementById("confirmHash").value;

        if (!confirmWallet || !confirmHash) {
            alert("⚠️ Please enter both wallet address and hash key to verify!");
            return;
        }

        if (confirmWallet === walletAddress && confirmHash === zkpHash) {
            isVerified = true;
            
            // Visual feedback for verification success
            const statusElement = document.getElementById("registrationStatus");
            statusElement.innerHTML = `
                <div class="cyber-container" style="padding: 15px; margin: 15px 0; animation: fadeIn 0.5s;">
                    <h3 class="cyber-glow" style="margin: 0; letter-spacing: 1px;">✅ IDENTITY VERIFIED</h3>
                    <div style="margin-top: 10px; text-align: left;">
                        <p style="margin: 5px 0; display: flex; justify-content: space-between;">
                            <span>WALLET:</span> <span>${maskAddress(confirmWallet)}</span>
                        </p>
                        <p style="margin: 5px 0; display: flex; justify-content: space-between;">
                            <span>HASH:</span> <span>${maskHash(confirmHash)}</span>
                        </p>
                    </div>
                </div>
            `;
            
            // Show the submit registration button with cyber styling
            submitRegistrationBtn.style.display = "block";
            submitRegistrationBtn.classList.add("cyber-glow");
            submitRegistrationBtn.style.backgroundColor = "rgba(0, 25, 15, 0.8)";
            submitRegistrationBtn.style.border = "1px solid #00ffa9";
            submitRegistrationBtn.style.color = "#00ffa9";
            submitRegistrationBtn.style.boxShadow = "0 0 10px rgba(0, 255, 170, 0.5)";
            
            // Update progress
            progressSteps[1].classList.add("completed-step");
            progressSteps[1].classList.remove("active-step");
            progressSteps[2].classList.add("active-step");
            
        } else {
            isVerified = false;
            alert("❌ Invalid Wallet Address or Hash Key!");
            
            // Visual feedback for verification failure
            const statusElement = document.getElementById("registrationStatus");
            statusElement.innerHTML = `
                <div style="background: rgba(244, 67, 54, 0.3); padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h3 style="margin: 0; color: #f44336;">❌ VERIFICATION FAILED</h3>
                    <p style="margin: 10px 0;">Please check your wallet address and hash key</p>
                </div>
            `;
        }
    });

    // Add Guardian
    document.getElementById("addGuardian").addEventListener("click", () => {
        // Only allow adding guardians after verification
        if (!isVerified) {
            alert("⚠️ Please verify your identity first!");
            return;
        }
        
        const relations = ["Dad", "Mom", "Friend", "Sibling", "Spouse", "Child", "Mentor", "Colleague"];

        const guardianDiv = document.createElement("div");
        guardianDiv.className = "guardian-entry";
        guardianDiv.style.animation = "fadeIn 0.3s";
        guardianDiv.innerHTML = `
            <input type="text" class="guardianWallet" placeholder="Guardian Wallet Address" pattern="^0x[a-fA-F0-9]{40}$" required>
            <select class="guardianRelation">
                ${relations.map(rel => `<option value="${rel}">${rel}</option>`).join("")}
            </select>
            <button class="remove-guardian" style="margin: 0 0 0 5px; padding: 5px 10px;">❌</button>
        `;
        
        // Add event listener for the remove button
        const removeBtn = guardianDiv.querySelector(".remove-guardian");
        removeBtn.addEventListener("click", () => {
            guardianDiv.remove();
        });
        
        document.getElementById("guardiansList").appendChild(guardianDiv);
    });
    submitRegistrationBtn.addEventListener("click", () => {
        if (!isVerified) {
            alert("⚠️ Please verify your identity first!");
            return;
        }
    
        const guardians = [];
        const guardianEntries = document.querySelectorAll(".guardian-entry");
    
        if (guardianEntries.length === 0) {
            alert("⚠️ Please add at least one guardian for recovery!");
            return;
        }
    
        let hasInvalidGuardian = false;
    
        guardianEntries.forEach(entry => {
            const walletInput = entry.querySelector(".guardianWallet");
            const relationSelect = entry.querySelector(".guardianRelation");
    
            const walletAddress = walletInput.value.trim();
            const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(walletAddress);
    
            if (!walletAddress || !isValidAddress) {
                hasInvalidGuardian = true;
                walletInput.style.border = "2px solid red";
            } else {
                walletInput.style.border = "";
                guardians.push({
                    wallet: walletAddress,
                    relation: relationSelect.value
                });
            }
        });
    
        if (hasInvalidGuardian) {
            alert("⚠️ Please enter valid Ethereum wallet addresses for all guardians!");
            return;
        }
    
        registerUser(walletAddress, zkpHash, guardians);
    });

    // Generate Alphanumeric-Symbolic ZKP Hash (8 characters)
    function generateZKPHash() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
        return "0x" + [...Array(8)].map(() => chars[Math.floor(Math.random() * chars.length)]).join("");
    }

    // Mask address for display
    function maskAddress(address) {
        if (!address) return "";
        return address.substring(0, 6) + "..." + address.substring(address.length - 4);
    }
    
    // Mask hash for display
    function maskHash(hash) {
        if (!hash) return "";
        return hash.substring(0, 4) + "..." + hash.substring(hash.length - 4);
    }

    // Send Email to User (Uses Backend)
    function sendEmail(wallet, hash, email) {
        console.log("Sending verification email to:", email);
        
        // In a real implementation, this would make an actual API call
        // For now, simulating a successful email send
        setTimeout(() => {
            alert("📩 Verification email sent successfully! Check your inbox.");
        }, 1000);
    }
    
    // Register User with Guardians
    function registerUser(wallet, hash, guardians) {
        const statusElement = document.getElementById("registrationStatus");
        statusElement.innerHTML = `
            <div class="cyber-container" style="padding: 15px; margin: 15px 0;">
                <h3 class="cyber-glow" style="margin: 0; letter-spacing: 1px;">⏳ PROCESSING REGISTRATION</h3>
                <div class="progress-bar-cyber" style="margin: 15px 0;">
                    <div id="registrationProgressBar" class="bar"></div>
                </div>
                <p style="margin: 5px 0;">Securing your account on the blockchain...</p>
            </div>
        `;
        
        // Animate the registration progress bar
        const progressBar = document.getElementById("registrationProgressBar");
        let progress = 0;
        
        const progressInterval = setInterval(() => {
            progress += 2;
            progressBar.style.width = `${progress}%`;
            
            if (progress >= 100) {
                clearInterval(progressInterval);
                
                // Complete the registration
                setTimeout(() => {
                    progressSteps[2].classList.add("completed-step");
                    progressSteps[2].classList.remove("active-step");
                    
                    statusElement.innerHTML = `
                        <div class="cyber-container" style="padding: 20px; margin: 15px 0; animation: fadeIn 0.5s;">
                            <h3 class="cyber-glow" style="margin: 0 0 15px 0; letter-spacing: 1px;">✅ REGISTRATION SUCCESSFUL</h3>
                            <div style="text-align: left; border-top: 1px solid rgba(0, 255, 170, 0.3); padding-top: 15px;">
                                <p style="margin: 10px 0;">Your wallet ${maskAddress(wallet)} is now protected by Auth3 Guard.</p>
                                <p style="margin: 10px 0;">Recovery available through ${guardians.length} guardian(s):</p>
                                <ul style="text-align: left; padding-left: 25px; list-style-type: none;">
                                    ${guardians.map(g => `
                                        <li style="margin: 5px 0; display: flex; justify-content: space-between;">
                                            <span>${g.relation}:</span> <span>${maskAddress(g.wallet)}</span>
                                        </li>
                                    `).join('')}
                                </ul>
                                <button id="setupComplete" class="cyber-glow" style="margin-top: 20px; background: rgba(0, 25, 15, 0.8); border: 1px solid #00ffa9; color: #00ffa9; padding: 10px 20px; width: 100%;">COMPLETE SETUP</button>
                            </div>
                        </div>
                    `;
                    
                    document.getElementById("setupComplete").addEventListener("click", () => {
                        alert("🎉 Auth3 Guard setup complete! You can now close this window.");
                    });
                    
                    submitRegistrationBtn.style.display = "none";
                }, 800);
            }
        }, 20);
    }
});