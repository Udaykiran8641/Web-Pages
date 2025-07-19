// Import Firebase SDKs for authentication (for user ID display, as in previous versions)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; // Firestore is imported but not used for this specific functionality

// Global variables provided by the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let auth = null;
let userId = null;
let isAuthReady = false;

// Get DOM elements
const pdfInput = document.getElementById('pdfInput');
const copyCountInput = document.getElementById('copyCount');
const downloadZipBtn = document.getElementById('downloadZipBtn');
const selectedFileNameDisplay = document.getElementById('selected-file-name');
const messageBox = document.getElementById('message-box');
const messageContent = document.getElementById('message-content');
const userIdDisplay = document.getElementById('user-id-display');
const userIdValueSpan = document.getElementById('user-id-value');

// Function to display messages in the custom message box
function showMessage(msg, isError = false) {
    messageContent.textContent = msg;
    messageBox.classList.remove('hidden');
    if (isError) {
        messageBox.classList.remove('bg-blue-50', 'text-blue-700', 'border-blue-200');
        messageBox.classList.add('bg-red-100', 'text-red-700', 'border-red-200');
    } else {
        messageBox.classList.remove('bg-red-100', 'text-red-700', 'border-red-200');
        messageBox.classList.add('bg-blue-50', 'text-blue-700', 'border-blue-200');
    }
}

// Initialize Firebase and set up authentication listener
window.onload = async () => {
    try {
        const app = initializeApp(firebaseConfig);
        // db = getFirestore(app); // Firestore not directly used here
        auth = getAuth(app);

        // Listen for auth state changes
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                userIdValueSpan.textContent = userId;
                userIdDisplay.classList.remove('hidden');
            } else {
                // If no user, try to sign in with custom token or anonymously
                if (initialAuthToken) {
                    try {
                        await signInWithCustomToken(auth, initialAuthToken);
                        userId = auth.currentUser?.uid;
                        userIdValueSpan.textContent = userId;
                        userIdDisplay.classList.remove('hidden');
                    } catch (error) {
                        console.error("Error signing in with custom token:", error);
                        await signInAnonymously(auth);
                        userId = auth.currentUser?.uid;
                        userIdValueSpan.textContent = userId;
                        userIdDisplay.classList.remove('hidden');
                    }
                } else {
                    await signInAnonymously(auth);
                    userId = auth.currentUser?.uid;
                    userIdValueSpan.textContent = userId;
                    userIdDisplay.classList.remove('hidden');
                }
            }
            isAuthReady = true; // Mark auth as ready after initial check
        });
    } catch (error) {
        console.error("Error initializing Firebase:", error);
        showMessage("Error initializing the application. Please try again.", true);
    }
};

// Event listener for file input change
pdfInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
        selectedFileNameDisplay.querySelector('span').textContent = file.name;
        selectedFileNameDisplay.classList.remove('hidden');
        messageBox.classList.add('hidden'); // Hide message when a valid file is selected
    } else {
        selectedFileNameDisplay.classList.add('hidden');
        showMessage('Please select a valid PDF file.', true);
        pdfInput.value = ''; // Clear invalid file
    }
});

// Event listener for Download ZIP button click
downloadZipBtn.addEventListener('click', async () => {
    const file = pdfInput.files[0];
    if (!file) {
        showMessage("Please select a PDF file first.", true);
        return;
    }

    const copyCount = parseInt(copyCountInput.value, 10);
    // Removed the upper limit check (e.g., copyCount > 500) to allow for 2000+ copies.
    // Be aware that generating a very large number of files client-side can be
    // memory-intensive and may cause performance issues or browser crashes,
    // especially for large original PDF files.
    if (isNaN(copyCount) || copyCount < 1) {
        showMessage("Please enter a valid number of copies (1 or more).", true);
        return;
    }

    showMessage(`Generating ${copyCount} PDF copies and zipping... This may take a while for large numbers. Please do not close your browser.`);
    downloadZipBtn.disabled = true; // Disable button during processing

    try {
        const arrayBuffer = await file.arrayBuffer();
        const zip = new JSZip();
        const originalFileName = file.name.split('.').slice(0, -1).join('.'); // Get name without extension

        for (let i = 1; i <= copyCount; i++) {
            const fileName = `${originalFileName}_copy_${i}.pdf`;
            zip.file(fileName, arrayBuffer);
        }

        const content = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 9 } });

        const a = document.createElement("a");
        a.href = URL.createObjectURL(content);
        a.download = `duplicated_pdfs_${originalFileName}_${copyCount}_copies.zip`; // Dynamic zip file name
        document.body.appendChild(a); // Append to body to make it clickable in some browsers
        a.click();
        document.body.removeChild(a); // Clean up the element
        URL.revokeObjectURL(a.href); // Release the object URL

        showMessage(`ZIP file with ${copyCount} PDF copies downloaded successfully!`);
        pdfInput.value = ''; // Clear file input
        selectedFileNameDisplay.classList.add('hidden');
        copyCountInput.value = '100'; // Reset count
    } catch (error) {
        console.error("Error generating ZIP:", error);
        showMessage("Failed to generate ZIP file. This might be due to a very large number of copies or file size. Please try a smaller number or file. Error: " + error.message, true);
    } finally {
        downloadZipBtn.disabled = false; // Re-enable button
    }
});
