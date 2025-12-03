const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileSelected = document.getElementById('fileSelected');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeFile = document.getElementById('removeFile');
const skinsGrid = document.getElementById('skinsGrid');
const skinsLoading = document.getElementById('skinsLoading');

let selectedSkin = null;
let certificateKey = null;

loadSkins();

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('dragleave', handleDragLeave);
uploadArea.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);
removeFile.addEventListener('click', clearFile);

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
}

async function handleFile(file) {
    if (file.type !== 'image/png') {
        showError('Please upload a PNG image file');
        return;
    }

    const maxSize = 500 * 1024;
    if (file.size > maxSize) {
        showError('File size must be under 500KB');
        return;
    }

    try {
        const key = await extractNoskidKey(file);
        certificateKey = key;

        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);

        uploadArea.style.display = 'none';
        fileSelected.style.display = 'flex';

        showProgress();

    } catch (error) {
        showError(error);
    }
}

function clearFile() {
    uploadArea.style.display = 'block';
    fileSelected.style.display = 'none';
    fileInput.value = '';
    certificateKey = null;
    showProgress();
}


function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function extractNoskidKey(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                const extractedText = await extractTextFromPng(e.target.result);

                if (!extractedText) {
                    const arrayBuffer = e.target.result;
                    const uint8Array = new Uint8Array(arrayBuffer);

                    let content = '';
                    for (let i = 0; i < uint8Array.length; i++) {
                        content += String.fromCharCode(uint8Array[i]);
                    }

                    const keyPattern = /-----BEGIN NOSKID KEY-----\s*([a-f0-9]{64})/i;
                    const match = content.match(keyPattern);

                    if (match) {
                        resolve(match[1]);
                    } else {
                        reject('No valid NOSKID key found in the image');
                    }
                } else {
                    const keyPattern = /-*BEGIN NOSKID KEY-*\s*([a-f0-9]{64})/i;
                    const match = extractedText.match(keyPattern);

                    if (match) {
                        resolve(match[1]);
                    } else {
                        reject('No valid NOSKID key pattern found in the extracted text');
                    }
                }
            } catch (error) {
                reject('Failed to extract key from image: ' + error.message);
            }
        };
        reader.onerror = () => {
            reject('Failed to read file');
        };
        reader.readAsArrayBuffer(file);
    });
}

async function extractTextFromPng(arrayBuffer) {
    return new Promise((resolve) => {
        try {
            const bytes = new Uint8Array(arrayBuffer);

            if (!(bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47)) {
                resolve(null);
                return;
            }

            let pos = 8;
            let extractedText = null;

            while (pos < bytes.length) {
                const length = (
                    (bytes[pos] << 24) |
                    (bytes[pos + 1] << 16) |
                    (bytes[pos + 2] << 8) |
                    (bytes[pos + 3])
                );

                const type = String.fromCharCode(
                    bytes[pos + 4],
                    bytes[pos + 5],
                    bytes[pos + 6],
                    bytes[pos + 7]
                );

                if (type === 'tEXt') {
                    const chunkData = bytes.slice(pos + 8, pos + 8 + length);
                    const text = new TextDecoder('utf-8').decode(chunkData);

                    const separatorIndex = text.indexOf('\0');
                    const keyword = text.substring(0, separatorIndex);
                    const value = text.substring(separatorIndex + 1);

                    if (keyword === 'noskid-key') {
                        extractedText = value;
                        break;
                    }
                }

                pos += 8 + length + 4;
            }

            resolve(extractedText);
        } catch (error) {
            resolve(null);
        }
    });
}

async function loadSkins() {
    try {
        const response = await fetch('skins/');
        const data = await response.json();

        if (data.success) {
            displaySkins(data.data.skins);
        } else {
            showError('Failed to load skins');
        }
    } catch (error) {
        showError('Failed to load skins: ' + error.message);
    } finally {
        skinsLoading.style.display = 'none';
    }
}

function displaySkins(skins) {
    skinsGrid.innerHTML = '';

    skins.forEach(skin => {
        const skinCard = document.createElement('div');
        skinCard.className = 'skin-card';
        skinCard.onclick = () => selectSkin(skin, skinCard);

        skinCard.innerHTML = `
            <img src="preview/${skin}.png" alt="${skin}" class="skin-preview" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlkYTJhOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIFByZXZpZXc8L3RleHQ+PC9zdmc+'">
            <div class="skin-name">${skin}</div>
        `;

        skinsGrid.appendChild(skinCard);
    });

    const contributeCard = document.createElement('div');
    contributeCard.className = 'skin-card contribute-card';
    contributeCard.onclick = () => {
        window.open('https://github.com/douxxtech/skins.noskid.today/blob/main/contribute.md', '_blank');
    };

    contributeCard.innerHTML = `
        <div class="contribute-content">
            <i class="ri-add-circle-line contribute-icon"></i>
            <div class="contribute-text">
                <div class="contribute-title">Add Your Own Skin</div>
                <div class="contribute-subtitle">Contribute to the project</div>
            </div>
        </div>
    `;

    skinsGrid.appendChild(contributeCard);
}

function selectSkin(skin, element) {
    document.querySelectorAll('.skin-card').forEach(card => {
        card.classList.remove('selected');
    });

    element.classList.add('selected');
    selectedSkin = skin;
    showProgress();
}

async function handleDownload() {
    if (!certificateKey || !selectedSkin) return;

    try {
        const response = await fetch(`download?skin=${encodeURIComponent(selectedSkin)}&key=${encodeURIComponent(certificateKey)}`);

        if (response.ok) {
            const blob = await response.blob();

            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `cert_${selectedSkin}.png`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;

            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);

            showSuccess();
        } else {
            const data = await response.json();
            showError(data.message || 'Failed to generate certificate');
        }
    } catch (error) {
        showError('Failed to download certificate: ' + error.message);
    } finally {
        loading.style.display = 'none';
        downloadBtn.style.display = 'block';
    }
}

function getStep() {
    if (certificateKey && selectedSkin) {
        return "Step 3/3";
    } else if (certificateKey && !selectedSkin) {
        return "Step 2/3";
    } else if (!certificateKey && selectedSkin) {
        return "Step 2/3";
    } else if (!certificateKey && !selectedSkin) {
        return "Step 1/3";
    }
}

function getComment() {
    if (certificateKey && selectedSkin) {
        return "Download your custom certificate.";
    } else if (certificateKey && !selectedSkin) {
        return "Select a skin for your certificate.";
    } else if (!certificateKey && selectedSkin) {
        return "Upload your noskid certificate.";
    } else if (!certificateKey && !selectedSkin) {
        return "Upload your noskid certificate.";
    }
}

function showProgress() {

    if (getStep() === "Step 3/3") {
        updateStatusBox({
            type: 'info',
            title: getStep(),
            description: getComment(),
            buttonHtml: '<i class="ri-download-line"></i>',
            buttonAction: handleDownload
        });
    } else {
        updateStatusBox({
            type: 'info',
            title: getStep(),
            description: getComment()
        });
    }
}

function showSuccess() {
    updateStatusBox({
        type: 'success',
        title: 'Success',
        description: 'Your certificate has been downloaded successfully.',
    });
}

function showError(message) {
    updateStatusBox({
    type: 'error',
    title: 'Error',
    description: message
});
}


function updateStatusBox({ type = 'info', title = '', description = '', buttonHtml = '', buttonAction = null }) {
    const box = document.getElementById('statusBox');
    const titleEl = document.getElementById('statusTitle');
    const descEl = document.getElementById('statusDescription');
    const buttonEl = document.getElementById('statusButton');


    box.classList.remove('info', 'success', 'warning', 'error');
    box.classList.add(type);

    titleEl.textContent = title;
    descEl.textContent = description;

    if (buttonHtml && buttonEl) {
        buttonEl.innerHTML = buttonHtml;
        buttonEl.style.display = 'inline-block';
        buttonEl.onclick = buttonAction || (() => {});
    } else if(buttonEl) {
        buttonEl.style.display = 'none';
    }
}


showProgress();