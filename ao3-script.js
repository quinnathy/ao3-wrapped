function showPage(targetId, direction = 'left') {
    const currentActive = document.querySelector('.page-section.active');
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


document.getElementById('json-file').addEventListener('change', handleFileUpload);

function handleFileUpload(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const worksData = JSON.parse(e.target.result);
        performDataAnalysis(worksData);
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
        
        list.forEach(tagObj => {
            allValues.push(tagObj[valueKey]);
        });
    });

    const longDf = new dfd.DataFrame(allValues, { columns: ['ItemName'] });
    const countsDf = longDf.groupby(['ItemName']).count();
    
    countsDf.sortValues({ by: 'ItemName_count', ascending: false, inplace: true });
    
    return countsDf.head(5);
}

function performDataAnalysis(data) {
    const df = new dfd.DataFrame(data);

    const topFandoms = analyzeTagColumn(df, 'fandoms', null, 'name');
    const topShips = analyzeTagColumn(df, 'tags', 'relationships', 'name');
    const topFreeformTags = analyzeTagColumn(df, 'tags', 'freeforms', 'name');
    
    let resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<h3>Analysis Complete! (Top 5)</h3>';
    
    topFandoms.toString().then(str => {
        resultsDiv.innerHTML += '<h4>⭐ Fandoms:</h4>' + '<pre>${str}</pre>';
    });

    topShips.toString().then(str => {
        resultsDiv.innerHTML += '<h4>💖 Ships/Relationships:</h4>' + '<pre>${str}</pre>';
    });

    topFreeformTags.toString().then(str => {
        resultsDiv.innerHTML += '<h4>🏷️ Freeform Tags:</h4>' + '<pre>${str}</pre>';
    });
}