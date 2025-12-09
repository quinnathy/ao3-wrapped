/* ao3-worker.js — Web Worker: decodes, parses, and analyzes JSON off the main thread.
   Add this file to the same directory where ao3-script.js is served so the Worker can be created with:
   new Worker('ao3-worker.js')
*/

self.onmessage = function (e) {
    const { type, buffer } = e.data;
    if (type !== 'processFile' || !buffer) {
        postMessage({ type: 'error', payload: 'Worker received invalid message.' });
        return;
    }

    try {
        postMessage({ type: 'progress', payload: 'Decoding file...' });
        const text = new TextDecoder('utf-8').decode(buffer);

        postMessage({ type: 'progress', payload: 'Parsing JSON...' });
        const data = JSON.parse(text);

        if (!Array.isArray(data)) {
            postMessage({ type: 'error', payload: 'Expected a top-level array of works.' });
            return;
        }

        postMessage({ type: 'progress', payload: 'Analyzing data...' });

        // counting helpers
        function counts(arr) {
            const map = new Map();
            for (const v of arr) {
                if (v == null) continue;
                const k = String(v).trim();
                if (k === '') continue;
                map.set(k, (map.get(k) || 0) + 1);
            }
            return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
        }

        function extractTagValues(dataArray, colName1, colName2, valueKey) {
            const out = [];
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
                            if (value !== undefined) out.push(value);
                        } else {
                            out.push(tagObj);
                        }
                    }
                } else if (typeof list === 'object') {
                    for (const v of Object.values(list)) {
                        if (v && typeof v === 'object') {
                            const value = (valueKey && v[valueKey]) || v.name || v;
                            if (value !== undefined) out.push(value);
                        } else if (v) {
                            out.push(v);
                        }
                    }
                } else if (typeof list === 'string') {
                    out.push(list);
                }
            }
            return out;
        }

        const fandomsArr = extractTagValues(data, 'fandoms', null, 'name');
        const shipsArr = extractTagValues(data, 'tags', 'relationships', 'name');
        const freeformsArr = extractTagValues(data, 'tags', 'freeforms', 'name');

        const topFandoms = counts(fandomsArr).slice(0, 5);
        const topShips = counts(shipsArr).slice(0, 5);
        const topFreeform = counts(freeformsArr).slice(0, 5);

        postMessage({
            type: 'done',
            payload: {
                length: data.length,
                topFandoms,
                topShips,
                topFreeform
            }
        });
    } catch (err) {
        postMessage({ type: 'error', payload: err && err.message ? err.message : String(err) });
    }
};
