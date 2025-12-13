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

function handleFileUpload(event) {
    const file = event.target.files[0];
    
    if (!file) {
        return;
    }
    
    const reader = new FileReader();

    reader.onload = function(e) {
        const jsonText = e.target.result;
        
        try {
            const worksData = JSON.parse(jsonText);
            
            performDataAnalysis(worksData);
        } catch (error) {
            document.getElementById('results').innerHTML = 
                `<p style="color: red; font-weight: bold;">Error: The file may be corrupt or not valid JSON.</p>`;
            console.error("JSON Parsing Error:", error);
        }
    };
    
    reader.readAsText(file);
}

function analyzeTagColumn(df, colName1, colName2, valueKey) {
    let allValues = [];
    df[colName1].values.forEach(item => {
        let list = item;
        if (colName2) {
            list = item[colName2];
        }
        
        if (list && Array.isArray(list)) {
            list.forEach(tagObj => {
                allValues.push(tagObj[valueKey]);
            });
        }
    });

    if (allValues.length === 0) {
        return new dfd.DataFrame([['No Data Found', 0]], { columns: ['ItemName', 'ItemName_count'] });
    }
    const longDf = new dfd.DataFrame(allValues, { columns: ['ItemName'] });
    const countsDf = longDf.groupby(['ItemName']).count();
    
    countsDf.sortValues({ by: 'ItemName_count', ascending: false, inplace: true });
    
    return countsDf.head(5);
}


function performDataAnalysis(data) {
    let resultsDiv = document.getElementById('results');
    
    resultsDiv.innerHTML = `<p style="color: green; font-weight: bold;">✅ Successfully loaded ${data.length} works. Running analysis...</p>`;

    const df = new dfd.DataFrame(data);

    const topFandoms = analyzeTagColumn(df, 'fandoms', null, 'name');
    const topShips = analyzeTagColumn(df, 'tags', 'relationships', 'name');
    const topFreeformTags = analyzeTagColumn(df, 'tags', 'freeforms', 'name');
    
    
    topFandoms.toString().then(str => {
        resultsDiv.innerHTML += '<h4>⭐ Fandoms:</h4>' + `<pre>${str}</pre>`;
    });

    topShips.toString().then(str => {
        resultsDiv.innerHTML += '<h4>💖 Ships/Relationships:</h4>' + `<pre>${str}</pre>`;
    });

    topFreeformTags.toString().then(str => {
        resultsDiv.innerHTML += '<h4>🏷️ Freeform Tags:</h4>' + `<pre>${str}</pre>`;
    });
}


function initApp() {
    if (typeof dfd !== 'undefined') {
        document.getElementById('json-file').addEventListener('change', handleFileUpload);
        console.log("Danfo.js loaded and application initialized.");
    } else {
        console.log("Waiting for Danfo.js to load...");
        setTimeout(initApp, 100);
    }
}

initApp();
