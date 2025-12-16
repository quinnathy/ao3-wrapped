document.getElementById('json-file').addEventListener('change', handleFileSelect);

function findMode(array) {
    if (array.length === 0) {
        return null;
    }

    const frequencyMap = {};
    let maxCount = 0;
    let mode = '';

    for (const item of array) {
        const key = String(item);
        frequencyMap[key] = (frequencyMap[key] || 0) + 1;

        if (frequencyMap[key] > maxCount) {
            maxCount = frequencyMap[key];
            mode = key;
        }
    }

    return { value: mode, count: maxCount };
}

function renderTopItems(array, limit, title) {
    const frequencyMap = {};
    for (const item of array) {
        const key = String(item);
        frequencyMap[key] = (frequencyMap[key] || 0) + 1;
    }

    const sortedItems = Object.entries(frequencyMap)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, limit);

    if (sortedItems.length === 0) {
        return `<p>${title}: No data found.</p>`;
    }

    let html = `<h4>${title}</h4><ul class="tag-list">`;
    html += sortedItems.map(([name, count]) => `<li><span class="count">${count}<span class="tooltiptext">How many fics you read</span></span> ${name}</li>`).join('');
    html += '</ul>';
    return html;
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    const mainContainer = document.getElementById('step-3'); 

    if (!mainContainer) return; 

    mainContainer.innerHTML = '<p>Processing...</p>';

    if (!file) {
        mainContainer.innerHTML = '<p>No file selected.</p>';
        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (!Array.isArray(data) || data.length === 0) {
                mainContainer.innerHTML = `<p style="color: red;">Error: The JSON file is empty or not a valid list (${data.length} works found).</p>`;
                return;
            }

            const allRatings = [];
            const allRelationships = [];
            const allFreeformTags = [];
            const allAuthors = [];
            const allFandoms = [];

            for (const work of data) {
                if (work.rating) allRatings.push(work.rating);
                if (work.author) allAuthors.push(work.author);

                const relationships = work.tags?.relationships;
                if (Array.isArray(relationships)) {
                    for (const relationship of relationships) {
                        if (relationship.name) allRelationships.push(relationship.name);
                    }
                }

                const freeforms = work.tags?.freeforms;
                if (Array.isArray(freeforms)) {
                    for (const freeform of freeforms) {
                        if (freeform.name) allFreeformTags.push(freeform.name);
                    }
                }

                const fandoms = work.fandoms;
                if (Array.isArray(fandoms)) {
                    for (const fandom of fandoms) {
                        if (fandom.name) allFandoms.push(fandom.name);
                    }
                }
            }

            const mostCommonRating = findMode(allRatings);
            const mostReadRelationship = findMode(allRelationships);
            const mostReadAuthor = findMode(allAuthors);

            let outputHTML = `<h3>Out of ${data.length} fics read, this is what we found...</h3>`;
            
            const renderSingleStat = (mode, label, unit) => {
                if (!mode) return 'N/A';
                return `${mode.value} <span class="count">${label} ${mode.count} ${unit}</span>`;
            };
            
            outputHTML += `
                <div class="results-container">
                    <div id="top-ship">
                        You shipped <strong>${mostReadRelationship.value}</strong> the most! (Read ${mostReadRelationship.count} times)
                    </div>
                    <div id="top-rating">
                        You mostly read fics labelled <strong>${mostCommonRating.value}</strong>. (Read ${mostCommonRating.count} times)
                    </div>
                    <div id="fave-author">
                        Your favorite writer was <strong>${mostReadAuthor.value}</strong>! Drop them some extra kudos. (Read ${mostReadAuthor.count} times)
                    </div>
                    
                    <hr>
                    
                    <div id="top-fandom">
                        ${renderTopItems(allFandoms, 5, 'Your top fandoms were')}
                    </div>
                    <div id="top-tags">
                        ${renderTopItems(allFreeformTags, 5, 'These were your favorite tags:')}
                    </div>
                    
                    <hr>

                    <details>
                        <summary>Other Data Counts (Top 5s)</summary>
                        ${renderTopItems(allRatings, 5, 'Top 5 Ratings')}
                        ${renderTopItems(allAuthors, 5, 'Top 5 Authors')}
                        ${renderTopItems(allFandoms, 5, 'Top 5 Fandoms')}
                        ${renderTopItems(allRelationships, 5, 'Top 5 Relationships')}
                        ${renderTopItems(allFreeformTags, 5, 'Top 5 Freeform Tags')}
                    </details>
                </div>
            `;

            mainContainer.innerHTML = outputHTML;

        } catch (error) {
            mainContainer.innerHTML = `<p style="color: red;">Error processing file: ${error.message}</p>`;
            console.error('Processing error:', error);
        }
    };

    reader.onerror = () => {
        mainContainer.innerHTML = `<p style="color: red;">Error reading file: ${reader.error.message}</p>`;
    };

    reader.readAsText(file);
}