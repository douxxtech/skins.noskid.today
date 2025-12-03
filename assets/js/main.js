const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileSelected = document.getElementById('fileSelected');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeFile = document.getElementById('removeFile');
const skinsGrid = document.getElementById('skinsGrid');
const skinsLoading = document.getElementById('skinsLoading');
const nskd = new NskdLbr();

let selectedSkin = null;
let localSkin = null;
let certData = null;

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

async function handleFile(file, isLocalSkin = false) {
    if (file.type !== 'image/png' && file.name.toLowerCase().endsWith('.png')) {
        showError('Please upload a PNG image file');
        return;
    }

    if (isLocalSkin) {
        localSkin = file;

        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        uploadArea.style.display = 'none';
        fileSelected.style.display = 'flex';

        showProgress();
        return;
    }

    const maxSize = 500 * 1024;
    if (file.size > maxSize) {
        showError('File size must be under 500KB');
        return;
    }

    try {
        const result = await nskd.loadFromFile(file);

        if (!result.valid) {
            showError('Provided image doesn\'t seem to be a valid noskid.today certificate.');
            return;
        }

        certData = result;

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
    certData = null;
    showProgress();
}


function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

    const customImageCard = document.createElement('div');
    customImageCard.className = 'skin-card contribute-card';
    customImageCard.onclick = () => {
        let input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png';

        input.onchange = async e => {
            const file = e.target.files[0];
            if (file) {
                selectLocalSkin(file);
            }
        }

        input.click();
    }

    customImageCard.innerHTML = `
        <div class="contribute-content">
            <i class="ri-image-add-line contribute-icon"></i>
            <div class="contribute-text">
                <div class="contribute-title">Your Own Image</div>
                <div class="contribute-subtitle">Upload custom skin locally</div>
            </div>
        </div>
    `;

    skinsGrid.appendChild(customImageCard);

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
    localSkin = null;
    showProgress();
}

function selectLocalSkin(file) {
    document.querySelectorAll('.skin-card').forEach(card => {
        card.classList.remove('selected');
    });

    const previewUrl = URL.createObjectURL(file);

    let localCard = document.querySelector('.local-skin-card');
    if (!localCard) {
        localCard = document.createElement('div');
        localCard.className = 'skin-card local-skin-card';
        skinsGrid.insertBefore(localCard, document.querySelector('.contribute-card'));
    }

    localCard.classList.add('selected');
    localCard.innerHTML = `
        <img src="${previewUrl}" alt="Local skin" class="skin-preview">
        <div class="skin-name">Your Custom Image</div>
    `;

    selectedSkin = null;
    localSkin = file;
    
    showProgress();
}

async function handleDownload() {
    if (!certData) return;
    if (!selectedSkin && !localSkin) return;

    try {
        if (localSkin) {
            const skinBuffer = await localSkin.arrayBuffer();

            const modifiedBuffer = addNoSkidKeyToPNG(skinBuffer, certData);

            const blob = new Blob([modifiedBuffer], { type: 'image/png' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `noskid-${localSkin.name}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            showSuccess();
            return;
        }


        const response = await fetch(`/download?skin=${encodeURIComponent(selectedSkin)}&key=${encodeURIComponent(certData.query)}`);

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
        skinsLoading.style.display = 'none';
    }
}

function getStep() {
    const hasCert = certData !== null;
    const hasSkin = selectedSkin !== null || localSkin !== null;

    if (hasCert && hasSkin) return "Step 3/3";
    if (hasCert || hasSkin) return "Step 2/3";
    return "Step 1/3";
}

function getComment() {
    const hasCert = certData !== null;
    const hasSkin = selectedSkin !== null || localSkin !== null;

    if (hasCert && hasSkin) {
        return localSkin
            ? "Download your certificate with custom image."
            : "Download your custom certificate.";
    }
    if (hasCert) return "Select a skin for your certificate.";
    if (hasSkin) return "Upload your noskid certificate.";
    return "Upload your noskid certificate.";
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
        buttonEl.onclick = buttonAction || (() => { });
    } else if (buttonEl) {
        buttonEl.style.display = 'none';
    }
}

// local skin
function readUint32(buffer, offset) {
    const view = new DataView(buffer);
    return view.getUint32(offset, false);
}

function writeUint32(buffer, offset, value) {
    const view = new DataView(buffer);
    view.setUint32(offset, value, false);
}

function calculateCRC32(data) {
    let crc = 0xFFFFFFFF;
    const table = [];

    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c;
    }

    for (let i = 0; i < data.length; i++) {
        crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }

    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createTextChunk(keyword, text) {
    const keywordBytes = new TextEncoder().encode(keyword);
    const textBytes = new TextEncoder().encode(text);
    const data = new Uint8Array(keywordBytes.length + 1 + textBytes.length);

    data.set(keywordBytes, 0);
    data[keywordBytes.length] = 0;
    data.set(textBytes, keywordBytes.length + 1);

    const chunkType = new TextEncoder().encode('tEXt');
    const lengthBuffer = new ArrayBuffer(4);
    writeUint32(lengthBuffer, 0, data.length);

    const crcData = new Uint8Array(4 + data.length);
    crcData.set(chunkType, 0);
    crcData.set(data, 4);

    const crc = calculateCRC32(crcData);
    const crcBuffer = new ArrayBuffer(4);
    writeUint32(crcBuffer, 0, crc);

    const chunk = new Uint8Array(4 + 4 + data.length + 4);
    chunk.set(new Uint8Array(lengthBuffer), 0);
    chunk.set(chunkType, 4);
    chunk.set(data, 8);
    chunk.set(new Uint8Array(crcBuffer), 8 + data.length);

    return chunk;
}

function addNoSkidKeyToPNG(pngBuffer, certData) {
    const verificationText = createVerificationText(certData.data, certData.query);
    
    const data = new Uint8Array(pngBuffer);
    const chunks = [];
    let offset = 8;

    while (offset < data.length) {
        const length = readUint32(pngBuffer, offset);
        const chunkSize = 8 + length + 4;
        const chunk = data.slice(offset, offset + chunkSize);
        const type = String.fromCharCode(...data.slice(offset + 4, offset + 8));

        if (type === 'IEND') {
            const textChunk = createTextChunk('noskid-key', verificationText);
            chunks.push(textChunk);
        }

        chunks.push(chunk);
        offset += chunkSize;
    }

    let totalSize = 8;
    for (const chunk of chunks) {
        totalSize += chunk.length;
    }

    const newPng = new Uint8Array(totalSize);
    newPng.set(data.slice(0, 8), 0);

    let newOffset = 8;
    for (const chunk of chunks) {
        newPng.set(chunk, newOffset);
        newOffset += chunk.length;
    }

    return newPng.buffer;
}

function createVerificationText(certData, certKey) {
    const certNumber = certData.certificate_number;
    const nickname = certData.nickname;
    const certNumberData = `CERT-${certNumber.padStart(5, '0')}-${nickname}`;
    const certBasedChars = btoa(certNumberData).padEnd(64, '=').substring(0, 64);
    
    const creationDate = certData.creationDate;
    const timeData = `CREATED-${creationDate}`;
    const timeBasedChars = btoa(timeData).padEnd(64, '=').substring(0, 64);
    
    const verificationText = 
        `-----BEGIN NOSKID KEY-----\n` +
        `${certKey}\n` +
        `${certBasedChars}\n` +
        `${timeBasedChars}\n` +
        `-----END NOSKID KEY-----`;
    
    return verificationText;
}


showProgress();