

document.addEventListener('DOMContentLoaded', () => {
    const appRoot = document.getElementById('app-root');

    // State variables (mimicking React useState)
    let pdfFiles = [];
    let newNamesText = '';
    let isLoading = false;
    let message = '';
    let downloadUrl = null;
    let progress = 0;

    // Function to update the DOM based on current state
    const renderApp = () => {
        appRoot.innerHTML = `
            <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 hover:scale-[1.01] border border-blue-200">
                <h1 class="text-4xl font-extrabold text-center text-gray-800 mb-6 drop-shadow-sm">
                    PDF Bulk Renamer
                </h1>
                <p class="text-center text-gray-600 mb-8">
                    Upload your PDF files and provide a list of new names (one per line). The app will generate a ZIP file with your "renamed" PDFs.
                </p>

                <div class="mb-6">
                    <label for="pdf-upload" class="block text-lg font-semibold text-gray-700 mb-2">
                        1. Upload PDF Files (Max 2000)
                    </label>
                    <input
                        id="pdf-upload"
                        type="file"
                        multiple
                        accept=".pdf"
                        class="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    ${pdfFiles.length > 0 ? `
                        <p class="mt-2 text-sm text-gray-500">
                            Selected: <span class="font-medium text-blue-600">${pdfFiles.length}</span> PDF file(s)
                        </p>
                    ` : ''}
                </div>

                <div class="mb-8">
                    <label for="names-input" class="block text-lg font-semibold text-gray-700 mb-2">
                        2. Enter New Names/Serial Numbers (One per line)
                    </label>
                    <textarea
                        id="names-input"
                        rows="10"
                        placeholder="e.g.,
Serial_Number_001
Invoice_2025_Q3_Report
Project_Alpha_Document
..."
                        class="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[150px] transition duration-150 ease-in-out"
                    >${newNamesText}</textarea>
                    ${newNamesText.split('\n').filter(name => name.trim() !== '').length > 0 ? `
                        <p class="mt-2 text-sm text-gray-500">
                            Entered: <span class="font-medium text-blue-600">${newNamesText.split('\n').filter(name => name.trim() !== '').length}</span> name(s)
                        </p>
                    ` : ''}
                </div>

                <button
                    id="rename-btn"
                    class="w-full py-3 px-6 rounded-lg text-white font-bold text-lg transition duration-300 ease-in-out transform hover:scale-105
                    ${isLoading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 shadow-lg'
                    }"
                    ${isLoading || pdfFiles.length === 0 || newNamesText.trim() === '' ? 'disabled' : ''}
                >
                    ${isLoading ? `
                        <span class="flex items-center justify-center">
                            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing... (${progress}%)
                        </span>
                    ` : 'Rename & Download PDFs'}
                </button>

                ${message ? `
                    <p class="mt-6 text-center text-lg ${message.startsWith('Error') ? 'text-red-600' : 'text-green-700'} font-medium">
                        ${message}
                    </p>
                ` : ''}

                ${downloadUrl ? `
                    <div class="mt-6 text-center">
                        <a
                            id="download-link"
                            href="${downloadUrl}"
                            download="renamed_pdfs.zip"
                            class="inline-flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download Renamed PDFs (.zip)
                        </a>
                    </div>
                ` : ''}

                <p class="mt-8 text-xs text-gray-500 text-center">
                    Note: This application processes files locally in your browser. No files are uploaded to any server.
                </p>
            </div>
        `;

        // Attach event listeners after rendering
        document.getElementById('pdf-upload').addEventListener('change', handlePdfFileChange);
        // The names-input event listener is now handled differently to prevent re-rendering on every keypress
        const namesInput = document.getElementById('names-input');
        if (namesInput) {
            namesInput.value = newNamesText; // Ensure the value is always in sync
            namesInput.removeEventListener('input', handleNamesChange); // Remove previous listener to avoid duplicates
            namesInput.addEventListener('input', handleNamesChange);
        }
        document.getElementById('rename-btn').addEventListener('click', handleRenameAndDownload);
        if (downloadUrl) {
            document.getElementById('download-link').addEventListener('click', () => {
                // Clean up the object URL after download starts
                setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
                downloadUrl = null; // Clear the link after click
                renderApp(); // Re-render to remove the download link
            });
        }
    };

    // Event handlers
    const handlePdfFileChange = (event) => {
        pdfFiles = Array.from(event.target.files);
        message = '';
        downloadUrl = null;
        progress = 0;
        renderApp(); // Re-render to update file count and clear messages
    };

    const handleNamesChange = (event) => {
        // Only update the newNamesText state variable
        newNamesText = event.target.value;
        message = ''; // Clear messages when user starts typing
        downloadUrl = null; // Clear download link when user starts typing

        // Manually update the button's disabled state
        const renameBtn = document.getElementById('rename-btn');
        if (renameBtn) {
            renameBtn.disabled = isLoading || pdfFiles.length === 0 || newNamesText.trim() === '';
        }
        // Do NOT call renderApp() here to prevent re-rendering and losing focus
    };

    const handleRenameAndDownload = async () => {
        // Check if pdf-lib and JSZip are available globally
        if (typeof PDFLib === 'undefined' || typeof JSZip === 'undefined') {
            message = 'Libraries are still loading or failed to load. Please wait a moment and try again.';
            renderApp();
            return;
        }

        if (pdfFiles.length === 0) {
            message = 'Please select PDF files to upload.';
            renderApp();
            return;
        }

        const newNames = newNamesText
            .split('\n')
            .map((name) => name.trim())
            .filter((name) => name !== '');

        if (newNames.length === 0) {
            message = 'Please provide a list of new names/serial numbers.';
            renderApp();
            return;
        }

        if (pdfFiles.length !== newNames.length) {
            message = `Error: Number of PDF files (${pdfFiles.length}) does not match the number of names provided (${newNames.length}). Please ensure they match.`;
            renderApp();
            return;
        }

        isLoading = true;
        message = 'Processing files... This may take a while for many PDFs.';
        downloadUrl = null;
        progress = 0;
        renderApp();

        const zip = new JSZip();
        const { PDFDocument } = PDFLib;

        try {
            for (let i = 0; i < pdfFiles.length; i++) {
                const file = pdfFiles[i];
                const newName = newNames[i];
                const fileNameWithExtension = newName.endsWith('.pdf') ? newName : `${newName}.pdf`;

                try {
                    // Read the PDF file
                    const arrayBuffer = await file.arrayBuffer();

                    // Load the PDF document
                    const pdfDoc = await PDFDocument.load(arrayBuffer);

                    // Create a new PDF document to copy pages into
                    const newPdfDoc = await PDFDocument.create();

                    // Copy all pages from the original PDF to the new one
                    const copiedPages = await newPdfDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
                    copiedPages.forEach((page) => newPdfDoc.addPage(page));

                    // Save the new PDF
                    const pdfBytes = await newPdfDoc.save();

                    // Add the "renamed" PDF to the ZIP file
                    zip.file(fileNameWithExtension, pdfBytes);

                    progress = Math.round(((i + 1) / pdfFiles.length) * 100);
                    renderApp(); // Update progress
                } catch (fileError) {
                    console.error(`Error processing file ${file.name}:`, fileError);
                    message = `Error processing "${file.name}". It might be corrupted or an unsupported PDF format. Skipping this file.`;
                    renderApp(); // Update message
                    // Continue to next file even if one fails
                }
            }

            message = 'Generating ZIP file...';
            renderApp();
            const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
                // Optional: Update progress for zip generation
                if (metadata.percent) {
                    // You can show a separate progress for zip generation if needed
                    // console.log(`ZIP progress: ${metadata.percent.toFixed(2)}%`);
                }
            });

            downloadUrl = URL.createObjectURL(zipBlob);
            message = `Successfully processed ${pdfFiles.length} files! Click the link below to download.`;
            renderApp();
        } catch (error) {
            console.error('Error during processing:', error);
            message = `An unexpected error occurred: ${error.message}. Please try again.`;
            renderApp();
        } finally {
            isLoading = false;
            renderApp();
        }
    };

    // Initial render when the DOM is ready
    renderApp();
});

