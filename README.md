Web-Pages
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PDF Splitter</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>PDF Splitter</h1>
        <p>Upload your PDF and we'll split it into smaller files, 5 pages per file.</p>

        <form id="uploadForm" enctype="multipart/form-data">
            <div class="file-input-wrapper">
                <input type="file" id="pdfFile" name="pdfFile" accept=".pdf" required>
                <label for="pdfFile" class="custom-file-upload">Choose PDF File</label>
                <span id="fileName">No file chosen</span>
            </div>
            <button type="submit" id="splitButton">Split PDF</button>
        </form>

        <div id="loading" class="hidden">
            <div class="spinner"></div>
            <p>Processing your PDF...</p>
        </div>

        <div id="result" class="hidden">
            <h2>Your Split PDFs:</h2>
            <ul id="downloadLinks">
                </ul>
            <p class="note">Links will expire after some time for security and resource management.</p>
        </div>

        <div id="error" class="hidden">
            <p class="error-message"></p>
        </div>
    </div>

    <script src="script.js"></script>
</body>
</html>

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f4f7f6;
    display: flex;
    justify-content: center;
    align-items: flex-start; /* Align to top */
    min-height: 100vh;
    margin: 20px 0; /* Add some vertical margin */
    color: #333;
    line-height: 1.6;
}

.container {
    background-color: #ffffff;
    padding: 40px;
    border-radius: 12px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 600px;
    text-align: center;
    margin: 20px; /* Ensure margin on smaller screens */
}

h1 {
    color: #2c3e50;
    margin-bottom: 15px;
    font-size: 2.2em;
}

p {
    margin-bottom: 25px;
    color: #555;
}

form {
    margin-top: 30px;
}

.file-input-wrapper {
    position: relative;
    overflow: hidden;
    display: inline-block;
    margin-bottom: 25px;
    width: 100%;
    max-width: 350px; /* Limit width of file input */
}

.file-input-wrapper input[type="file"] {
    position: absolute;
    left: 0;
    top: 0;
    opacity: 0;
    cursor: pointer;
    width: 100%;
    height: 100%;
}

.custom-file-upload {
    border: 2px solid #3498db;
    color: #3498db;
    background-color: #eaf6ff;
    padding: 12px 25px;
    border-radius: 8px;
    cursor: pointer;
    display: inline-block;
    transition: background-color 0.3s ease, color 0.3s ease;
    font-weight: bold;
}

.custom-file-upload:hover {
    background-color: #3498db;
    color: #ffffff;
}

#fileName {
    display: block;
    margin-top: 10px;
    font-size: 0.9em;
    color: #777;
}


button {
    background-color: #28a745;
    color: white;
    padding: 14px 30px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1.1em;
    font-weight: bold;
    transition: background-color 0.3s ease, transform 0.2s ease;
    width: 100%;
    max-width: 250px;
}

button:hover {
    background-color: #218838;
    transform: translateY(-2px);
}

button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}

.hidden {
    display: none;
}

/* Loading spinner */
.loading {
    margin-top: 30px;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-left-color: #3498db;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin-bottom: 15px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

#result {
    margin-top: 30px;
    text-align: left;
    border-top: 1px solid #eee;
    padding-top: 20px;
}

#result h2 {
    color: #2c3e50;
    margin-bottom: 20px;
    text-align: center;
}

#downloadLinks {
    list-style: none;
    padding: 0;
}

#downloadLinks li {
    background-color: #f9f9f9;
    border: 1px solid #ddd;
    padding: 12px 18px;
    margin-bottom: 10px;
    border-radius: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

#downloadLinks li a {
    color: #007bff;
    text-decoration: none;
    font-weight: bold;
    transition: color 0.2s ease;
}

#downloadLinks li a:hover {
    color: #0056b3;
}

.note {
    font-size: 0.85em;
    color: #888;
    margin-top: 20px;
}

#error {
    margin-top: 30px;
    background-color: #ffe6e6;
    border: 1px solid #ff9999;
    color: #cc0000;
    padding: 15px;
    border-radius: 8px;
}

.error-message {
    font-weight: bold;
}

document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    const pdfFile = document.getElementById('pdfFile');
    const fileNameSpan = document.getElementById('fileName');
    const splitButton = document.getElementById('splitButton');
    const loadingDiv = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const downloadLinksUl = document.getElementById('downloadLinks');
    const errorDiv = document.getElementById('error');
    const errorMessageP = errorDiv.querySelector('.error-message');

    // Update file name display
    pdfFile.addEventListener('change', () => {
        if (pdfFile.files.length > 0) {
            fileNameSpan.textContent = pdfFile.files[0].name;
        } else {
            fileNameSpan.textContent = 'No file chosen';
        }
    });

    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission

        // Reset previous states
        hideAllSections();
        downloadLinksUl.innerHTML = ''; // Clear previous links

        if (!pdfFile.files.length) {
            showError('Please select a PDF file.');
            return;
        }

        const file = pdfFile.files[0];
        if (file.type !== 'application/pdf') {
            showError('Please upload a valid PDF file.');
            return;
        }

        const formData = new FormData();
        formData.append('pdfFile', file);

        showLoading();
        splitButton.disabled = true; // Disable button during upload

        try {
            // Replace '/upload' with the actual endpoint of your backend
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Something went wrong on the server.');
            }

            const data = await response.json();
            hideLoading();
            showResult(data.download_urls);

        } catch (error) {
            console.error('Error splitting PDF:', error);
            hideLoading();
            showError(error.message);
        } finally {
            splitButton.disabled = false; // Re-enable button
        }
    });

    function hideAllSections() {
        loadingDiv.classList.add('hidden');
        resultDiv.classList.add('hidden');
        errorDiv.classList.add('hidden');
    }

    function showLoading() {
        loadingDiv.classList.remove('hidden');
    }

    function hideLoading() {
        loadingDiv.classList.add('hidden');
    }

    function showResult(urls) {
        if (urls && urls.length > 0) {
            urls.forEach((url, index) => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = url;
                a.textContent = `Part ${index + 1}`;
                a.target = '_blank'; // Open in new tab
                a.download = `split_pdf_part_${index + 1}.pdf`; // Suggest download filename
                li.appendChild(a);
                downloadLinksUl.appendChild(li);
            });
            resultDiv.classList.remove('hidden');
        } else {
            showError('No split PDFs were generated. This might be due to an empty PDF or an internal server error.');
        }
    }

    function showError(message) {
        errorMessageP.textContent = message;
        errorDiv.classList.remove('hidden');
    }
});
