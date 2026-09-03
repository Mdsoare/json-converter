/**
 * Application: Secure Data Converter (Client-Side)
 * DevSecOps Focus: Strict CSP, Dynamic Flattening & Anti-CSV Injection.
 */

'use strict';

// Anti-Clickjacking Frame Buster
if (self !== top) {
    top.location = self.location;
}

document.addEventListener('DOMContentLoaded', () => {
    const conversionModeSelect = document.getElementById('conversion-mode');
    const targetFormatSelect = document.getElementById('target-format');
    const targetFormatGroup = document.getElementById('target-format-group');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');
    const rawInput = document.getElementById('raw-input');
    const btnConvert = document.getElementById('btn-convert');
    const btnClear = document.getElementById('btn-clear');
    const btnDownload = document.getElementById('btn-download');

    const outputSection = document.getElementById('output-section');
    const tablePreviewContainer = document.getElementById('table-preview-container');
    const jsonPreviewContainer = document.getElementById('json-preview-container');
    const tableHead = document.getElementById('table-head');
    const tableBody = document.getElementById('table-body');
    const jsonOutput = document.getElementById('json-output');
    const statusMessage = document.getElementById('status-message');

    let processedData = null;

    /**
     * Prevenção de CSV/Formula Injection
     */
    const sanitizeForCSV = (value) => {
        if (typeof value === 'string') {
            const forbiddenPrefixes = ['=', '+', '-', '@', '\t', '\r'];
            if (forbiddenPrefixes.some(prefix => value.startsWith(prefix))) {
                return `'${value}`;
            }
        }
        return value;
    };

    /**
     * Achatamento recursivo seguro de objetos JSON aninhados
     */
    const flattenObject = (obj, prefix = '', res = {}) => {
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const propName = prefix ? `${prefix}.${key}` : key;
                const val = obj[key];

                if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
                    flattenObject(val, propName, res);
                } else if (Array.isArray(val)) {
                    // Se for um array de primitivos, une por vírgula; se for de objetos, serializa em string
                    res[propName] = val.map(v => typeof v === 'object' ? JSON.stringify(v) : v).join('; ');
                } else {
                    res[propName] = val;
                }
            }
        }
        return res;
    };

    /**
     * Normalizador inteligente para relatórios complexos (ex: SAST / Vulnerabilidades)
     */
    const normalizeJsonData = (parsed) => {
        // Caso 1: Array simples na raiz -> aplata cada item
        if (Array.isArray(parsed)) {
            return parsed.map(item => flattenObject(item));
        }

        // Caso 2: Objeto raiz contendo uma chave com Array principal (ex: { sumario: {}, vulnerabilidades: [...] })
        if (typeof parsed === 'object' && parsed !== null) {
            const arrayKeys = Object.keys(parsed).filter(k => Array.isArray(parsed[k]));

            if (arrayKeys.length > 0) {
                // Pega a primeira chave que é uma lista (ex: "vulnerabilidades" ou "items")
                const primaryArrayKey = arrayKeys[0];
                const baseMetaData = { ...parsed };
                delete baseMetaData[primaryArrayKey]; // Separa os metadados do array principal

                const flatMeta = flattenObject(baseMetaData);

                return parsed[primaryArrayKey].map(item => {
                    const flatItem = flattenObject(item);
                    // Combina metadados (como sumario) em cada linha do relatório
                    return { ...flatMeta, ...flatItem };
                });
            }

            // Caso 3: Objeto único na raiz
            return [flattenObject(parsed)];
        }

        throw new Error('Formato JSON não suportado para tabulação.');
    };

    const showStatus = (message, type = 'error') => {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
    };

    const clearStatus = () => {
        statusMessage.textContent = '';
        statusMessage.className = 'status-message hidden';
    };

    conversionModeSelect.addEventListener('change', () => {
        const isJsonToTabular = conversionModeSelect.value === 'json-to-tabular';
        targetFormatGroup.classList.toggle('hidden', !isJsonToTabular);
        clearOutput();
    });

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        fileNameDisplay.textContent = file.name;
        clearStatus();

        const reader = new FileReader();

        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            reader.readAsArrayBuffer(file);
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonResult = XLSX.utils.sheet_to_json(worksheet);

                    rawInput.value = JSON.stringify(jsonResult, null, 2);
                    showStatus('Arquivo Excel carregado com sucesso!', 'success');
                } catch {
                    showStatus('Falha ao processar o arquivo Excel selecionado.');
                }
            };
        } else {
            reader.readAsText(file, 'UTF-8');
            reader.onload = (e) => {
                rawInput.value = e.target.result;
                showStatus('Arquivo lido com sucesso!', 'success');
            };
        }
    });

    btnConvert.addEventListener('click', () => {
        clearStatus();
        const inputData = rawInput.value.trim();

        if (!inputData) {
            showStatus('Por favor, insira os dados no campo de texto ou carregue um arquivo.');
            return;
        }

        try {
            if (conversionModeSelect.value === 'json-to-tabular') {
                processJsonToTabular(inputData);
            } else {
                processTabularToJson(inputData);
            }
            outputSection.classList.remove('hidden');
        } catch (error) {
            showStatus(`Erro no processamento: ${error.message}`);
        }
    });

    const processJsonToTabular = (jsonText) => {
        let parsedJSON;
        try {
            parsedJSON = JSON.parse(jsonText);
        } catch {
            throw new Error('JSON inválido. Verifique a sintaxe.');
        }

        const normalizedArray = normalizeJsonData(parsedJSON);

        // Aplica Sanitização Anti-CSV Injection em todas as chaves/valores
        processedData = normalizedArray.map(row => {
            const sanitizedRow = {};
            Object.keys(row).forEach(key => {
                sanitizedRow[key] = sanitizeForCSV(row[key]);
            });
            return sanitizedRow;
        });

        renderTablePreview(processedData);
    };

    const processTabularToJson = (csvText) => {
        const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
        if (lines.length < 1) throw new Error('Conteúdo CSV vazio.');

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const result = [];

        for (let i = 1; i < lines.length; i++) {
            const currentLine = lines[i].split(',');
            if (currentLine.length === headers.length) {
                const obj = {};
                headers.forEach((header, index) => {
                    let val = currentLine[index].trim().replace(/^"|"$/g, '');
                    obj[header] = val;
                });
                result.push(obj);
            }
        }

        processedData = JSON.stringify(result, null, 2);
        renderJsonPreview(processedData);
    };

    const renderTablePreview = (data) => {
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';

        if (!data || data.length === 0) return;

        // Extrai todas as colunas possíveis de todos os objetos
        const headers = Array.from(new Set(data.flatMap(obj => Object.keys(obj))));

        const trHead = document.createElement('tr');
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            trHead.appendChild(th);
        });
        tableHead.appendChild(trHead);

        data.forEach(row => {
            const tr = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                td.textContent = row[header] !== undefined ? row[header] : '';
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });

        jsonPreviewContainer.classList.add('hidden');
        tablePreviewContainer.classList.remove('hidden');
    };

    const renderJsonPreview = (jsonString) => {
        jsonOutput.value = jsonString;
        tablePreviewContainer.classList.add('hidden');
        jsonPreviewContainer.classList.remove('hidden');
    };

    btnDownload.addEventListener('click', () => {
        if (!processedData) return;

        const targetFormat = targetFormatSelect.value;
        if (conversionModeSelect.value === 'json-to-tabular') {
            if (targetFormat === 'csv') {
                downloadCSV(processedData);
            } else {
                downloadXLSX(processedData);
            }
        } else {
            downloadJSON(processedData);
        }
    });

    const downloadCSV = (data) => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
        triggerDownload(csvOutput, 'arquivo_processado.csv', 'text/csv;charset=utf-8;');
    };

    const downloadXLSX = (data) => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Vulnerabilidades');
        XLSX.writeFile(workbook, 'arquivo_processado.xlsx');
    };

    const downloadJSON = (jsonString) => {
        triggerDownload(jsonString, 'arquivo_processado.json', 'application/json;charset=utf-8;');
    };

    const triggerDownload = (content, fileName, mimeType) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const clearOutput = () => {
        processedData = null;
        rawInput.value = '';
        fileInput.value = '';
        fileNameDisplay.textContent = 'Nenhum arquivo selecionado';
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';
        jsonOutput.value = '';
        outputSection.classList.add('hidden');
        clearStatus();
    };

    btnClear.addEventListener('click', clearOutput);
});