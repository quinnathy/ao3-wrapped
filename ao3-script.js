/* ao3-script.js — worker-based implementation (main thread)
   Replace the existing ao3-script.js with this file.
   It expects ao3-worker.js to be served at the same path (relative URL).
*/

function showPage(targetId, direction = 'left') {
    const currentActive = document.querySelector('.section.active');
    const nextActive = document.getElementById(targetId);

    if (!currentActive || !nextActive) return;

    const inClass = (direction === 'left') ? 'slide-in-start' : 'slide-out-end';
    nextActive.classList.add(inClass);

    currentActive.classList.remove('active');
    const outClass = (direction === 'left') ? 'slide-out-end' : 'slide-in-start';
    currentActive.classList.add(outClass);

    void currentActive.offsetWidth;

    nextActive.classList.remove(inClass);
    nextActive.classList.add('active');

    setTimeout(() => {
        currentActive.classList.remove(outClass);
    }, 500);
}

const fileInput = document.getElementById('json-file');
if (fileInput) fileInput.addEventListener('change', handleFileUpload);

let worker; // keep worker alive between uploads to reuse

function ensureWorker() {
    if (typeof Worker === 'undefined') return null;
    if (!worker) {
        try {
            worker = new Worker('ao3-worker.js');
            worker.onmessage = (e) => {
                const { type, payload } = e.data;
                const resultsDiv = document.getElementById('results');
                if (!resultsDiv) return;
                if (type === 'progress') {
                    resultsDiv.innerHTML = `<p>${escapeHtml(payload)}</p>`;
                    return;
                }
                if (type === 'error') {
                    resultsDiv.innerHTML = `<p style="color: red; font-weight: bold;">Error: ${escapeHtml(payload)}</p>`;
                    return;
                }
                if (type === 'done') {
                    const { length, topFandoms, topShips, topFreeform } = payload;
                    resultsDiv.innerHTML = `<p style="color: green; font-weight: bold;">✅ Successfully loaded ${length} works. Results below.</p>`;
                    resultsDiv.innerHTML += '<h4>⭐ Fandoms:</h4>' + formatTopList(topFandoms);
                    resultsDiv.innerHTML += '<h4>💖 Ships/Relationships:</h4>' + formatTopList(topShips);
                    resultsDiv.innerHTML += '<h4>🏷️ Freeform Tags:</h4>' + formatTopList(topFreeform);
                }
            };
        } catch (err) {
            console.error('Failed to create Worker:', err);
            worker = null;
        }
    }
    return worker;
}

async function handleFileUpload(event) {
    const file = event.target.files && event.target.files[0];
    const resultsDiv = document.getElementById('results');
    if (!file) {
        if (resultsDiv) resultsDiv.innerHTML = '';
        return;
    }

    if (!resultsDiv) {
        console.error('No #results element to render to.');
        return;
    }

    resultsDiv.innerHTML = `<p>Reading file “${escapeHtml(file.name)}” (${Math.round(file.size / 1024)} KB)...</p>`;

    // Prefer Worker-based processing
    const w = ensureWorker();
    if (w) {
        try {
            // Use arrayBuffer + transfer to avoid copying the raw bytes
            const buffer = await file.arrayBuffer();
            resultsDiv.innerHTML = `<p>Transferring file to worker for parsing and analysis...</p>`;
            // Post buffer with transfer
            w.postMessage({ type: 'processFile', buffer }, [buffer]);
        } catch (err) {
            resultsDiv.innerHTML = `<p style="color: red; font-weight: bold;">Error reading file: ${escapeHtml(err.message || String(err))}</p>`;
            console.error(err);
        }
        return;
    }

    // Fallback: No Worker support — parse and analyze on main thread (may freeze UI for large files)
    resultsDiv.innerHTML += `<p style="color: orange;">Web Worker not available — parsing on main thread (may freeze UI for large files).</p>`;
    try {
        const text = await file.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (err) {
            resultsDiv.innerHTML = `<p style="color: red; font-weight: bold;">Error: The file may be corrupt or not valid JSON.</p>`;
            console.error("JSON Parsing Error:", err);
            return;
        }
        // Run the same analysis logic inline
        if (!Array.isArray(data)) {
            resultsDiv.innerHTML = `<p style="color: red; font-weight: bold;">Expected a top-level array of works in the JSON file.</p>`;
            return;
        }
        resultsDiv.innerHTML = `<p style="color: green; font-weight: bold;">✅ Successfully loaded ${data.length} works. Running analysis...</p>`;

        const topFandoms = analyzeTagColumnMainThread(data, 'fandoms', null, 'name');
        const topShips = analyzeTagColumnMainThread(data, 'tags', 'relationships', 'name');
        const topFreeformTags = analyzeTagColumnMainThread(data, 'tags', 'freeforms', 'name');

        resultsDiv.innerHTML += '<h4>⭐ Fandoms:</h4>' + formatTopList(topFandoms);
        resultsDiv.innerHTML += '<h4>💖 Ships/Relationships:</h4>' + formatTopList(topShips);
        resultsDiv.innerHTML += '<h4>🏷️ Freeform Tags:</h4>' + formatTopList(topFreeformTags);
    } catch (err) {
        resultsDiv.innerHTML = `<p style="color: red; font-weight: bold;">Error: ${escapeHtml(err.message || String(err))}</p>`;
        console.error(err);
    }
}

// Helper: escape HTML for safe output
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function formatTopList(entries) {
    if (!entries || entries.length === 0) return '<pre>(no entries)</pre>';
    let out = 'Item\tCount\n';
    out += entries.map(([k, v]) => `${escapeHtml(k)}\t${v}`).join('\n');
    return `<pre>${out}</pre>`;
}

// A simple main-thread version of the tag-analysis (used only as fallback)
function analyzeTagColumnMainThread(dataArray, colName1, colName2, valueKey, topN = 5) {
    const allValues = [];

    for (const item of dataArray) {
        if (!item) continue;
        let list = item[colName1];
        if (colName2 && list && list[colName2]) list = list[colName2];
        if (!list) continue;

        if (Array.isArray(list)) {
            for (const tagObj of list) {
                if (tagObj == null) continue;
                if (typeof tagObj === 'object') {
                    const value = (valueKey && tagObj[valueKey]) || tagObj.name || tagObj.tag;
                    if (value !== undefined) allValues.push(value);
                } else {
                    allValues.push(tagObj);
                }
            }
        } else if (typeof list === 'object') {
            for (const v of Object.values(list)) {
                if (v && typeof v === 'object') {
                    const value = (valueKey && v[valueKey]) || v.name || v;
                    if (value !== undefined) allValues.push(value);
                } else if (v) {
                    allValues.push(v);
                }
            }
        } else if (typeof list === 'string') {
            allValues.push(list);
        }
    }

    const counts = new Map();
    for (const v of allValues) {
        if (v == null) continue;
        const k = String(v).trim();
        if (k === '') continue;
        counts.set(k, (counts.get(k) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, topN);
}
