import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth/mammoth.browser.js';
import * as XLSX from 'xlsx';
const send = value => window.ReactNativeWebView.postMessage(JSON.stringify(value));
window.ckaiRead = async ({ id, type, data }) => {
  try {
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0)); let text = ''; let pages = 0;
    if (type === 'pdf') {
      const pdf = await pdfjs.getDocument({ data: bytes, isEvalSupported: false, useWorkerFetch: false, disableFontFace: true }).promise;
      pages = pdf.numPages;
      try { for (let i = 1; i <= Math.min(pages, 300); i++) {
        const page = await pdf.getPage(i); const content = await page.getTextContent();
        text += `\n[Page ${i}]\n` + content.items.map(item => item.str || '').join(' '); page.cleanup();
        if (text.length > 200000) break;
      } } finally { await pdf.destroy(); }
      if (!text.trim()) throw new Error('Ce PDF ne contient pas de texte extractible. Importe une photo des pages pour une analyse visuelle.');
    } else if (type === 'docx') text = (await mammoth.extractRawText({ arrayBuffer: bytes.buffer })).value;
    else if (['xlsx', 'xls', 'ods'].includes(type)) {
      const workbook = XLSX.read(bytes, { type: 'array', cellFormula: false, sheetRows: 1000 });
      text = workbook.SheetNames.slice(0, 15).map(name => `[Feuille : ${name}]\n${XLSX.utils.sheet_to_csv(workbook.Sheets[name])}`).join('\n\n');
    } else throw new Error('Format non pris en charge.');
    send({ id, text: text.slice(0, 200000), truncated: text.length > 200000 || pages > 300, pages });
  } catch (error) { send({ id, error: error.message || 'Lecture impossible.' }); }
};
send({ ready: true });
