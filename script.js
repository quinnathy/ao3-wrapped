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