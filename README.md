# 🛡️ JSON Converter — Client-Side & DevSecOps Hardened

<!-- Badges do Topo -->
[![CI Pipeline](https://github.com/Mdsoare/json-converter/actions/workflows/ci-pipeline.yml/badge.svg)](https://github.com/Mdsoare/json-converter/actions/workflows/ci-pipeline.yml)
[![Security Rating](https://img.shields.io/badge/Security-DevSecOps%20Hardened-green?style=flat&logo=github)](https://github.com/Mdsoare/json-converter/security/code-scanning)
![Security: CSP Compliant](https://img.shields.io/badge/Security-CSP--Compliant-success.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

<!-- Tech Stack & DevSecOps Ecosystem -->
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![NPM](https://img.shields.io/badge/NPM-CB3837?style=for-the-badge&logo=npm&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)
![Stylelint](https://img.shields.io/badge/Stylelint-264DE4?style=for-the-badge&logo=stylelint&logoColor=white)
![SAST & SCA](https://img.shields.io/badge/DevSecOps-SAST%20%26%20SCA-red?style=for-the-badge&logo=shield&logoColor=white)

---

Uma solução **100% client-side**, leve, rápida e centrada em privacidade para conversão e visualização bidirecional entre arquivos estritamente estruturados (JSON) e formatos tabulares (CSV e Microsoft Excel `.xlsx`).

Projetada sob o paradigma **Zero-Trust** e princípios de **Privacy by Design**, a aplicação opera inteiramente no navegador do usuário — **nenhum dado digitado ou arquivo carregado é enviado para servidores externos ou armazenado na rede**.

---

## 🚀 Demonstração & Live Access

Acesse a versão estável diretamente via GitHub Pages:  
👉 **[https://mdsoare.github.io/json-converter](https://mdsoare.github.io/json-converter)**

---

## 💡 O Problema e a Solução

Relatórios de auditoria e scans estáticos/dinâmicos de segurança (como outputs SAST, DAST e SCA gerados por ferramentas como Horusec, Fortify, SonarQube, Trivy e OSV-Scanner) costumam ser gerados em arquivos **JSON complexos e profundamente aninhados**.

Converter esses dados para relatórios gerenciais em planilhas sem expor informações sensíveis ou segredos de código a conversores *online* não confiáveis é um desafio comum em operações de DevSecOps. O **JSON Converter** resolve essa dor ao realizar todo o parsing, normalização e renderização estritamente em memória local no browser.

---

## ✨ Principais Funcionalidades

- 🔄 **Conversão Bidirecional Inteligente:**
  - **JSON ➔ CSV / XLSX:** Transforma coleções de objetos ou relatórios de segurança em planilhas estruturadas.
  - **CSV / XLSX ➔ JSON:** Lê planilhas locais e gera estruturas JSON organizadas e devidamente formatadas.
- 🌳 **Aplatamento Recursivo (Nested JSON Flattening):** Converte estruturas JSON aninhadas em colunas tabulares sem perder contexto ou gerar saídas corrompidas do tipo `[object Object]`.
- 🛡️ **Prevenção Ativa de CSV / Formula Injection:** Sanitização automática de células iniciadas por caracteres especiais (`=`, `+`, `-`, `@`, `\t`, `\r`) para evitar execução arbitrária de código/RCE no Microsoft Excel ou LibreOffice Calc.
- 👁️ **Preview Dinâmico de Dados:** Tabela interativa e bloco de código sanitizado para inspeção antes de efetuar o download.
- 📥 **Upload & Drag-and-Drop:** Suporte nativo para arrastar ou carregar arquivos `.json`, `.csv`, `.xlsx` e `.xls`.
- 🧹 **Gestão de Estado & Memória Local:** Botão de reset rápido que limpa seletores, buffers de memória e revoga URLs de objetos Blob (`URL.revokeObjectURL`).

---

## 🛠️ Tecnologias Utilizadas

- **HTML5 Semantic:** Estrutura focada em acessibilidade (WCAG) e SEO.
- **CSS3 Moderno:** Design System com suporte a Dark Theme, variáveis CSS, CSS Grid e Flexbox.
- **Vanilla JavaScript (ES6+):** Execução otimizada em escopo estrito, manipulando buffers locais via `FileReader` e `Blob` API.
- **SheetJS (xlsx.full.min.js):** Processamento local de planilhas Excel hospedado localmente no repositório para total conformidade com CSP.

---

## 🔒 Postura de Segurança (DevSecOps)

O projeto foi submetido a auditorias estáticas de código (SAST) e análise de dependências (SCA), contando com *hardening* específico para execução segura no navegador:

| Vetor de Risco | Status | Ação / Mitigação Aplicada |
| :--- | :---: | :--- |
| **Data Exfiltration** | 🛡️ Protegido | Processamento 100% Client-Side. Comunicação externa bloqueada via CSP (`connect-src 'none'`). |
| **CSV / Formula Injection** | 🛡️ Protegido | Prefixo sanitizador aplicado a células com caracteres de controle (`=`, `+`, `-`, `@`). |
| **DOM-XSS** | 🛡️ Protegido | Renderização de preview e células via propriedades puras como `textContent` e APIs DOM nativas. |
| **Clickjacking** | 🛡️ Protegido | Proteção por script Frame-Busting ativo no carregamento e diretiva CSP `frame-ancestors 'none'`. |
| **Bypass de Bibliotecas** | 🛡️ Protegido | Bundle da biblioteca `SheetJS` mantido e servido localmente (`/assets/js/xlsx.full.min.js`). |
| **Linter & Code Quality** | 🛡️ Protegido | Pipeline validado via ESLint (Flat Config), Stylelint, HTMLHint e Markdownlint. |

---

## ⚙️ Como Executar Localmente

Como a aplicação é 100% estática, não é necessário servidor web ou ambiente de execução no backend.

1. **Clone o repositório:**
  
   ```bash
   git clone https://github.com/Mdsoare/json-converter.git
   cd json-converter
    ```

2. Execute o projeto:

- Basta abrir o arquivo `index.html` diretamente em qualquer navegador moderno.

- Ou utilize a extensão `Live Server` no VS Code.

---

## 📜 Licença

Este projeto está sob a licença [MIT](LICENSE).

---

*Desenvolvido por **Marcelo Soares** | Especialista em Segurança da Informação e Computação Forense.*