/**
 * Application: Universal Data Converter & Compatibility Engine
 * DevSecOps Focus: Strict CSP, Dynamic Flattening, Anti-CSV Injection & Multi-Delimiter Parsing.
 */

'use strict';

// Frame Buster para prevenir Clickjacking
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
     * Prevenção de CSV / Formula Injection
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
     * Detecta automaticamente o delimitador mais provável na primeira linha do texto
     */
    const detectDelimiter = (text) => {
        const firstLine = text.split(/\r\n|\n/)[0] || '';
        const delimiters = [',', ';', '\t', '|'];
        
        let bestDelimiter = ',';
        let maxCount = -1;

        delimiters.forEach(delim => {
            // Conta ocorrências do delimitador
            const count = (firstLine.match(new RegExp(`\\${delim}`, 'g')) || []).length;
            if (count > maxCount) {
                maxCount = count;
                bestDelimiter = delim;
            }
        });

        return bestDelimiter;
    };

    /**
     * Parser de linha CSV/Tabular robusto com suporte a delimitadores dinâmicos e aspas
     */
    const parseCSVLine = (line, delimiter) => {
        const escapedDelimiter = delimiter === '\t' ? '\\t' : `\\${delimiter}`;
        const pattern = new RegExp(
            `(\\s*${escapedDelimiter}\\s*|\\r?\\n|\\r|^)` +
            `(?:"((?:""|[^"])*)"|([^"${escapedDelimiter}\r\n]*))`,
            'gi'
        );
        
        const result = [];
        let matches = null;

        while ((matches = pattern.exec(line))) {
            let value = '';
            if (matches[2] !== undefined) {
                // Valor entre aspas (trata aspas duplas escapadas "")
                value = matches[2].replace(/""/g, '"');
            } else if (matches[3] !== undefined) {
                // Valor sem aspas
                value = matches[3].trim();
            }
            
            result.push(value);
        }

        return result;
    };

    /**
     * Achatamento recursivo seguro capaz de lidar com objetos profundos e arrays de objetos/primitivos
     */
    const flattenObject = (obj, prefix = '', res = {}) => {
        if (obj === null || obj === undefined) {
            return res;
        }

        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const propName = prefix ? `${prefix}.${key}` : key;
                const val = obj[key];

                if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
                    flattenObject(val, propName, res);
                } else if (Array.isArray(val)) {
                    if (val.length === 0) {
                        res[propName] = '';
                    } else if (typeof val[0] === 'object' && val[0] !== null) {
                        // Se o array contém objetos, mapeia achatando e une de forma legível
                        res[propName] = val.map(item => {
                            if (typeof item === 'object') {
                                return JSON.stringify(flattenObject(item));
                            }
                            return item;
                        }).join(' | ');
                    } else {
                        // Array de tipos primitivos (strings, números, booleans)
                        res[propName] = val.join('; ');
                    }
                } else {
                    res[propName] = val;
                }
            }
        }
        return res;
    };

    /**
     * Normalizador universal para múltiplos tipos de estruturas JSON
     */
    const normalizeJsonData = (parsed) => {
        // Caso 1: Array simples ou de objetos na raiz
        if (Array.isArray(parsed)) {
            return parsed.map(item => {
                if (typeof item === 'object' && item !== null) {
                    return flattenObject(item);
                }
                return { valor: item };
            });
        }

        // Caso 2: Objeto raiz contendo coleções/listas internas
        if (typeof parsed === 'object' && parsed !== null) {
            const arrayKeys = Object.keys(parsed).filter(k => Array.isArray(parsed[k]));

            if (arrayKeys.length > 0) {
                // Localiza a chave de lista principal (ex: "vulnerabilidades", "data", "items", "results")
                const primaryArrayKey = arrayKeys[0];
                const baseMetaData = { ...parsed };
                delete baseMetaData[primaryArrayKey];

                const flatMeta = flattenObject(baseMetaData);

                return parsed[primaryArrayKey].map(item => {
                    const flatItem = typeof item === 'object' && item !== null ? flattenObject(item) : { valor: item };
                    return { ...flatMeta, ...flatItem };
                });
            }

            // Caso 3: Objeto único na raiz
            return [flattenObject(parsed)];
        }

        throw new Error('O formato informado não é um JSON válido ou legível.');
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
        const extension = file.name.split('.').pop().toLowerCase();

        if (extension === 'xlsx' || extension === 'xls') {
            reader.readAsArrayBuffer(file);
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonResult = XLSX.utils.sheet_to_json(worksheet);

                    rawInput.value = JSON.stringify(jsonResult, null, 2);
                    showStatus('Planilha Excel importada com sucesso!', 'success');
                } catch {
                    showStatus('Erro ao ler a planilha Excel selecionada.');
                }
            };
        } else {
            reader.readAsText(file, 'UTF-8');
            reader.onload = (e) => {
                rawInput.value = e.target.result;
                showStatus(`Arquivo .${extension.toUpperCase()} carregado com sucesso!`, 'success');
            };
        }
    });

    btnConvert.addEventListener('click', () => {
        clearStatus();
        const inputData = rawInput.value.trim();

        if (!inputData) {
            showStatus('Por favor, insira o texto ou carregue um arquivo válido.');
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
            showStatus(`Erro ao processar dados: ${error.message}`);
        }
    });

    const processJsonToTabular = (jsonText) => {
        let parsedJSON;
        try {
            parsedJSON = JSON.parse(jsonText);
        } catch {
            throw new Error('Sintaxe JSON inválida. Certifique-se de que o texto inserido é um JSON válido.');
        }

        const normalizedArray = normalizeJsonData(parsedJSON);

        // Aplica sanitização anti-CSV Injection em todas as chaves e valores
        processedData = normalizedArray.map(row => {
            const sanitizedRow = {};
            Object.keys(row).forEach(key => {
                sanitizedRow[key] = sanitizeForCSV(row[key]);
            });
            return sanitizedRow;
        });

        renderTablePreview(processedData);
    };

    const processTabularToJson = (rawText) => {
        // Separa em linhas não vazias
        const lines = rawText.split(/\r\n|\n/).filter(line => line.trim() !== '');
        if (lines.length < 1) throw new Error('O conteúdo fornecido está vazio.');

        // Auto-detecta o delimitador (, ; \t |)
        const delimiter = detectDelimiter(rawText);
        
        const headers = parseCSVLine(lines[0], delimiter);
        const result = [];

        for (let i = 1; i < lines.length; i++) {
            const currentLine = parseCSVLine(lines[i], delimiter);
            
            // Associa os valores com os cabeçalhos correspondentes
            if (currentLine.length === headers.length) {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = currentLine[index];
                });
                result.push(obj);
            }
        }

        if (result.length === 0) {
            throw new Error('Não foi possível identificar registros válidos com o delimitador detectado.');
        }

        processedData = JSON.stringify(result, null, 2);
        renderJsonPreview(processedData);
    };

    const renderTablePreview = (data) => {
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';

        if (!data || data.length === 0) return;

        // Extração de todos os cabeçalhos das propriedades achatadas
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
        triggerDownload(csvOutput, 'dados_convertidos.csv', 'text/csv;charset=utf-8;');
    };

    const downloadXLSX = (data) => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
        XLSX.writeFile(workbook, 'dados_convertidos.xlsx');
    };

    const downloadJSON = (jsonString) => {
        triggerDownload(jsonString, 'dados_convertidos.json', 'application/json;charset=utf-8;');
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