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
const namesInput = document.getElementById('names-input');
const processAndDownloadBtn = document.getElementById('processAndDownloadBtn');
const selectedFileNameDisplay = document.getElementById('selected-file-name');
const namesCountDisplay = document.getElementById('names-count-display');
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

// Event listener for PDF file input change
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

// Event listener for names input change to update count
namesInput.addEventListener('input', () => {
    const names = namesInput.value.split('\n').map(name => name.trim()).filter(name => name !== '');
    namesCountDisplay.querySelector('span').textContent = names.length;
    namesCountDisplay.classList.remove('hidden');
    messageBox.classList.add('hidden'); // Hide message when user starts typing
});

// Event listener for Process & Download button click
processAndDownloadBtn.addEventListener('click', async () => {
    const file = pdfInput.files[0];
    if (!file) {
        showMessage("Please upload your original PDF file first.", true);
        return;
    }

    const copyCount = parseInt(copyCountInput.value, 10);
    if (isNaN(copyCount) || copyCount < 1) {
        showMessage("Please enter a valid number of copies (1 or more).", true);
        return;
    }

    const newNames = namesInput.value.split('\n').map(name => name.trim()).filter(name => name !== '');

    if (newNames.length === 0) {
        showMessage("Please provide new names for the PDF copies (one per line).", true);
        return;
    }

    if (newNames.length !== copyCount) {
        showMessage(`Error: The number of names provided (${newNames.length}) does not match the number of copies requested (${copyCount}). Please ensure they match.`, true);
        return;
    }

    // Check if pdf-lib and JSZip are available globally
    if (typeof PDFLib === 'undefined' || typeof JSZip === 'undefined') {
        showMessage('Libraries are still loading or failed to load. Please wait a moment and try again.', true);
        return;
    }

    showMessage(`Generating ${copyCount} PDF copies and zipping... This may take a while for large numbers. Please do not close your browser.`);
    processAndDownloadBtn.disabled = true; // Disable button during processing

    try {
        const originalPdfBytes = await file.arrayBuffer();
        const zip = new JSZip();
        const { PDFDocument } = PDFLib;

        for (let i = 0; i < copyCount; i++) {
            const newName = newNames[i];
            const fileNameWithExtension = newName.endsWith('.pdf') ? newName : `${newName}.pdf`;

            // Load the original PDF bytes for each copy
            const pdfDoc = await PDFDocument.load(originalPdfBytes);

            // Create a new PDF document to copy pages into (this effectively "renames" by creating a new file)
            const newPdfDoc = await PDFDocument.create();
            const copiedPages = await newPdfDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
            copiedPages.forEach((page) => newPdfDoc.addPage(page));

            // Save the new PDF with the desired name
            const pdfBytes = await newPdfDoc.save();

            // Add the "renamed" PDF to the ZIP file
            zip.file(fileNameWithExtension, pdfBytes);

            // Optional: Update progress (can be added here if needed for large loops)
            // showMessage(`Processing file ${i + 1} of ${copyCount}...`);
        }

        showMessage('All PDFs processed. Generating ZIP file...');
        const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 9 } }, (metadata) => {
            // Optional: You can update a progress bar here for ZIP generation
            // console.log(`ZIP progress: ${metadata.percent.toFixed(2)}%`);
        });

        const a = document.createElement("a");
        a.href = URL.createObjectURL(zipBlob);
        a.download = `renamed_duplicated_pdfs_${copyCount}_copies.zip`; // Dynamic zip file name
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);

        showMessage(`Successfully generated and downloaded ZIP file with ${copyCount} renamed PDF copies!`);
        pdfInput.value = ''; // Clear file input
        namesInput.value = ''; // Clear names input
        selectedFileNameDisplay.classList.add('hidden');
        namesCountDisplay.classList.add('hidden');
        copyCountInput.value = '100'; // Reset count
    } catch (error) {
        console.error("Error during PDF processing or ZIP generation:", error);
        showMessage("An error occurred: " + error.message + ". This might be due to a very large number of copies, file size, or a corrupted PDF. Please try a smaller number or a different file.", true);
    } finally {
        processAndDownloadBtn.disabled = false; // Re-enable button
    }
});
