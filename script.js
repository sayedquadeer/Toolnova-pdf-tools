let currentTool = '';

function openTool(toolType) {
    currentTool = toolType;
    const modal = document.getElementById('toolModal');
    const modalTitle = document.getElementById('modalTitle');
    const optionsContainer = document.getElementById('optionsContainer');
    const fileInput = document.getElementById('fileInput');
    
    fileInput.value = '';
    optionsContainer.innerHTML = '';
    document.getElementById('statusMessage').innerText = '';

    if (toolType === 'merge') {
        modalTitle.innerText = 'Merge Multiple PDFs';
        fileInput.accept = '.pdf';
        fileInput.multiple = true;
    } else if (toolType === 'split') {
        modalTitle.innerText = 'Split PDF';
        fileInput.accept = '.pdf';
        fileInput.multiple = false;
    } else if (toolType === 'rotate') {
        modalTitle.innerText = 'Rotate PDF';
        fileInput.accept = '.pdf';
        fileInput.multiple = false;
        optionsContainer.innerHTML = `
            <label>Select Rotation Angle:</label>
            <select id="rotateAngle" style="padding: 8px; width: 100%;">
                <option value="90">90° Clockwise</option>
                <option value="180">180° Flip</option>
                <option value="270">270° Counter-Clockwise</option>
            </select>
        `;
    } else if (toolType === 'jpg2pdf') {
        modalTitle.innerText = 'Convert JPG/PNG to PDF';
        fileInput.accept = 'image/jpeg, image/png';
        fileInput.multiple = true;
    } else if (toolType === 'watermark') {
        modalTitle.innerText = 'Add Watermark to PDF';
        fileInput.accept = '.pdf';
        fileInput.multiple = false;
        optionsContainer.innerHTML = `
            <input type="text" id="watermarkText" placeholder="Enter Watermark Text" style="padding: 8px; width: 100%;">
        `;
    }

    modal.style.display = 'flex';
}

function closeTool() {
    document.getElementById('toolModal').style.display = 'none';
}

document.getElementById('processBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const statusMsg = document.getElementById('statusMessage');
    
    if (!fileInput.files.length) {
        statusMsg.innerText = 'Please select a file first!';
        statusMsg.style.color = 'red';
        return;
    }

    statusMsg.innerText = 'Processing... Please wait.';
    statusMsg.style.color = '#2563eb';

    try {
        if (currentTool === 'merge') {
            await mergePDFs(fileInput.files);
        } else if (currentTool === 'rotate') {
            const angle = parseInt(document.getElementById('rotateAngle').value);
            await rotatePDF(fileInput.files[0], angle);
        } else if (currentTool === 'jpg2pdf') {
            await convertImagesToPDF(fileInput.files);
        } else if (currentTool === 'watermark') {
            const text = document.getElementById('watermarkText').value || 'CONFIDENTIAL';
            await addWatermark(fileInput.files[0], text);
        }
        statusMsg.innerText = 'Done! File downloading...';
        statusMsg.style.color = 'green';
    } catch (err) {
        console.error(err);
        statusMsg.innerText = 'An error occurred during processing.';
        statusMsg.style.color = 'red';
    }
});

// PDF Merging Functionality
async function mergePDFs(files) {
    const { PDFDocument } = PDFLib;
    const mergedPdf = await PDFDocument.create();

    for (let file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
    }

    const pdfBytes = await mergedPdf.save();
    downloadFile(pdfBytes, "merged_document.pdf", "application/pdf");
}

// PDF Rotation Functionality
async function rotatePDF(file, degrees) {
    const { PDFDocument, degrees: pdfDegrees } = PDFLib;
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const pages = pdfDoc.getPages();
    pages.forEach(page => {
        const currentRotation = page.getRotation().angle;
        page.setRotation(pdfDegrees((currentRotation + degrees) % 360));
    });

    const pdfBytes = await pdfDoc.save();
    downloadFile(pdfBytes, "rotated_document.pdf", "application/pdf");
}

// JPG/PNG to PDF Functionality
async function convertImagesToPDF(files) {
    const { PDFDocument } = PDFLib;
    const pdfDoc = await PDFDocument.create();

    for (let file of files) {
        const arrayBuffer = await file.arrayBuffer();
        let image;
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
            image = await pdfDoc.embedJpg(arrayBuffer);
        } else if (file.type === 'image/png') {
            image = await pdfDoc.embedPng(arrayBuffer);
        }

        if (image) {
            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        }
    }

    const pdfBytes = await pdfDoc.save();
    downloadFile(pdfBytes, "converted_images.pdf", "application/pdf");
}

// Add Watermark Functionality
async function addWatermark(file, text) {
    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    pages.forEach(page => {
        const { width, height } = page.getSize();
        page.drawText(text, {
            x: width / 4,
            y: height / 2,
            size: 50,
            font: font,
            color: rgb(0.75, 0.75, 0.75),
            opacity: 0.5,
            rotate: PDFLib.degrees(45)
        });
    });

    const pdfBytes = await pdfDoc.save();
    downloadFile(pdfBytes, "watermarked_document.pdf", "application/pdf");
}

// Helper function to trigger browser download
function downloadFile(data, fileName, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
      }
                 
