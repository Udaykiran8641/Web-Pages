async function renameAndDownload() {
    const pdfInput = document.getElementById("pdfFiles");
    const nameFileInput = document.getElementById("nameList");
    const status = document.getElementById("status");
  
    if (!pdfInput.files.length || !nameFileInput.files.length) {
      alert("Please upload both PDF files and name list.");
      return;
    }
  
    const pdfFiles = Array.from(pdfInput.files);
    const nameText = await nameFileInput.files[0].text();
    const names = nameText.split(/\r?\n/).map(name => name.trim()).filter(n => n);
  
    if (pdfFiles.length !== names.length) {
      alert(`Mismatch: You selected ${pdfFiles.length} PDFs and provided ${names.length} names.`);
      return;
    }
  
    status.textContent = "⏳ Renaming and zipping...";
  
    const zip = new JSZip();
  
    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      const cleanName = names[i].replace(/[<>:"\/\\|?*]/g, "").trim(); // sanitize filename
      const newName = `${cleanName}.pdf`;
      const arrayBuffer = await file.arrayBuffer();
      zip.file(newName, arrayBuffer);
    }
  
    zip.generateAsync({ type: "blob" }).then(blob => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "renamed_pdfs.zip";
      link.click();
      status.textContent = "✅ Download ready!";
    });
  }
  