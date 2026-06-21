import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { TIMEOUTS, USER_AGENT } from '../../config/constants.js';
export function safeFilename(value, fallback = 'paper') {
    const safe = value.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^[_\-.]+|[_\-.]+$/g, '');
    return (safe || fallback).slice(0, 120);
}
export function isPdfBuffer(buffer, contentType = '') {
    return contentType.toLowerCase().includes('pdf') || buffer.subarray(0, 4).toString() === '%PDF';
}
async function getStreamSnippet(stream, maxBytes = 240) {
    return new Promise((resolve) => {
        let buffer = Buffer.alloc(0);
        const onData = (chunk) => {
            buffer = Buffer.concat([buffer, chunk]);
            if (buffer.length >= maxBytes) {
                cleanup();
                stream.destroy?.();
            }
        };
        const cleanup = () => {
            if (typeof stream.off === 'function') {
                stream.off('data', onData);
            }
        };
        stream.on('data', onData);
        stream.on('end', () => {
            cleanup();
            resolve(buffer.subarray(0, maxBytes).toString('utf8').replace(/\s+/g, ' ').trim());
        });
        stream.on('close', () => {
            cleanup();
            resolve(buffer.subarray(0, maxBytes).toString('utf8').replace(/\s+/g, ' ').trim());
        });
        stream.on('error', () => {
            cleanup();
            resolve(buffer.subarray(0, maxBytes).toString('utf8').replace(/\s+/g, ' ').trim());
        });
    });
}
function removePartialDownload(filePath) {
    try {
        fs.rmSync(filePath, { force: true });
    }
    catch {
        // Best-effort cleanup only; preserve the original download error.
    }
}
export async function downloadPdfFromUrl(pdfUrl, savePath, filenameHint, options = {}) {
    if (!pdfUrl) {
        throw new Error('Missing PDF URL');
    }
    if (pdfUrl.startsWith('ftp://')) {
        throw new Error(`FTP PDF links are not supported by the Node downloader: ${pdfUrl}`);
    }
    fs.mkdirSync(savePath, { recursive: true });
    const outputPath = path.join(savePath, `${safeFilename(filenameHint)}.pdf`);
    const response = await axios.get(pdfUrl, {
        responseType: 'stream',
        timeout: TIMEOUTS.DOWNLOAD,
        maxRedirects: 5,
        headers: {
            'User-Agent': USER_AGENT,
            Accept: 'application/pdf,*/*',
            ...(options.headers || {})
        },
        validateStatus: status => status < 500
    });
    if (response.status >= 400) {
        let errStream = response.data;
        if (!(errStream instanceof Readable) && !(errStream && typeof errStream.on === 'function')) {
            errStream = Readable.from(Buffer.isBuffer(errStream) ? errStream : Buffer.from(errStream || ''));
        }
        const errorSnippet = await getStreamSnippet(errStream);
        const cfHeader = response.headers['cf-mitigated'];
        const challenge = !!cfHeader || /cloudflare|challenge|just a moment/i.test(errorSnippet);
        const reason = challenge ? 'provider returned an HTML anti-bot challenge instead of a PDF' : 'provider refused the request';
        throw new Error(`PDF download failed with HTTP ${response.status}: ${reason}`);
    }
    return new Promise((resolve, reject) => {
        let reader = response.data;
        if (!(reader instanceof Readable) && !(reader && typeof reader.on === 'function')) {
            reader = Readable.from(Buffer.isBuffer(reader) ? reader : Buffer.from(reader || ''));
        }
        let writer;
        let checked = false;
        let settled = false;
        let totalBytes = 0;
        const contentLengthHeader = response.headers['content-length'];
        const expectedLength = contentLengthHeader ? parseInt(String(contentLengthHeader), 10) : 0;
        const fail = (err) => {
            if (settled)
                return;
            settled = true;
            if (typeof reader.destroy === 'function')
                reader.destroy();
            if (writer) {
                writer.once('close', () => {
                    removePartialDownload(outputPath);
                    reject(err);
                });
                writer.destroy();
                return;
            }
            removePartialDownload(outputPath);
            reject(err);
        };
        const ensureWriter = () => {
            if (writer)
                return writer;
            writer = fs.createWriteStream(outputPath);
            writer.on('error', fail);
            writer.on('drain', () => {
                if (typeof reader.resume === 'function')
                    reader.resume();
            });
            writer.on('finish', () => {
                if (settled)
                    return;
                if (expectedLength && totalBytes !== expectedLength) {
                    settled = true;
                    writer?.once('close', () => {
                        removePartialDownload(outputPath);
                        reject(new Error(`PDF download incomplete: received ${totalBytes} bytes, expected ${expectedLength} bytes`));
                    });
                    return;
                }
                settled = true;
                resolve(outputPath);
            });
            return writer;
        };
        reader.on('data', (chunk) => {
            totalBytes += chunk.length;
            if (!checked) {
                checked = true;
                const contentType = String(response.headers['content-type'] || '').toLowerCase();
                const isPdf = contentType.includes('pdf') || chunk.subarray(0, 4).toString() === '%PDF';
                if (!isPdf) {
                    const snippet = chunk.subarray(0, 240).toString('utf8').replace(/\s+/g, ' ').trim();
                    const cfHeader = response.headers['cf-mitigated'];
                    const challenge = !!cfHeader || /cloudflare|challenge|preparing to download|proof-of-work|<!doctype html/i.test(snippet);
                    const reason = challenge
                        ? 'the provider returned an HTML challenge page instead of a PDF'
                        : `content-type was ${contentType || 'unknown'}`;
                    fail(new Error(`Resolved URL did not return a PDF (${reason}): ${pdfUrl}`));
                    return;
                }
            }
            if (!ensureWriter().write(chunk)) {
                if (typeof reader.pause === 'function')
                    reader.pause();
            }
        });
        reader.on('end', () => {
            if (settled)
                return;
            if (!checked) {
                fail(new Error(`Resolved URL did not return a PDF (empty response): ${pdfUrl}`));
                return;
            }
            writer?.end();
        });
        reader.on('close', () => {
            if (typeof reader.destroy === 'function')
                reader.destroy();
        });
        reader.on('error', (err) => {
            fail(err);
        });
    });
}
//# sourceMappingURL=PdfDownload.js.map