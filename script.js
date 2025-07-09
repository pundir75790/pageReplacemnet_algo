// DOM Elements
const referenceStringInput = document.getElementById('referenceString');
const frameCountInput = document.getElementById('frameCount');
const randomizeBtn = document.getElementById('randomizeBtn');
const startBtn = document.getElementById('startBtn');
const compareBtn = document.getElementById('compareBtn');
const clearBtn = document.getElementById('clearBtn');
const prevStepBtn = document.getElementById('prevStepBtn');
const nextStepBtn = document.getElementById('nextStepBtn');
const playBtn = document.getElementById('playBtn');
const simulationSpeedInput = document.getElementById('simulationSpeed');
const currentPageElem = document.getElementById('currentPage');
const currentStepElem = document.getElementById('currentStep');
const totalStepsElem = document.getElementById('totalSteps');
const stepResultElem = document.getElementById('stepResult');
const memoryFramesElem = document.getElementById('memoryFrames');
const referenceStringVisualElem = document.getElementById('referenceStringVisual');
const pageFaultsElem = document.getElementById('pageFaults');
const pageHitsElem = document.getElementById('pageHits');
const faultRatioElem = document.getElementById('faultRatio');
const hitRatioElem = document.getElementById('hitRatio');
const comparisonContainerElem = document.getElementById('comparisonContainer');
const comparisonResultsElem = document.getElementById('comparisonResults');
const comparisonChartElem = document.getElementById('comparisonChart');

// Simulation state
let referenceString = [];
let frameCount = 3;
let currentAlgorithm = 'fifo';
let currentStep = 0;
let simulationSteps = [];
let playInterval = null;
let comparisonResults = {};
let chart = null;

// Event Listeners
window.addEventListener('DOMContentLoaded', initialize);
randomizeBtn.addEventListener('click', generateRandomReferenceString);
startBtn.addEventListener('click', startSimulation);
compareBtn.addEventListener('click', compareAlgorithms);
clearBtn.addEventListener('click', resetSimulation);
prevStepBtn.addEventListener('click', goToPreviousStep);
nextStepBtn.addEventListener('click', goToNextStep);
playBtn.addEventListener('click', togglePlaySimulation);

// Initialize the application
function initialize() {
    referenceStringInput.value = '7, 0, 1, 2, 0, 3, 0, 4';
    frameCountInput.value = '3';
    
    // Set up event listeners for algorithm selection
    document.querySelectorAll('input[name="algorithm"]').forEach(radio => {
        radio.addEventListener('change', function() {
            currentAlgorithm = this.value;
            if (simulationSteps.length > 0) {
                startSimulation();
            }
        });
    });
}

// Generate a random reference string
function generateRandomReferenceString() {
    const length = 10 + Math.floor(Math.random() * 10); // 10-20 pages
    const maxPageNumber = 9; // 0-9 page numbers
    let randomString = [];
    
    for (let i = 0; i < length; i++) {
        randomString.push(Math.floor(Math.random() * (maxPageNumber + 1)));
    }
    
    referenceStringInput.value = randomString.join(', ');
}

// Parse the reference string from input
function parseReferenceString() {
    const input = referenceStringInput.value.trim();
    if (!input) return [];
    
    return input.split(',')
        .map(num => num.trim())
        .filter(num => !isNaN(parseInt(num)))
        .map(num => parseInt(num));
}

// Start the simulation with the selected algorithm
function startSimulation() {
    // Parse input values
    referenceString = parseReferenceString();
    frameCount = parseInt(frameCountInput.value);
    
    // Validate inputs
    if (referenceString.length === 0) {
        alert('Please enter a valid reference string.');
        return;
    }
    
    if (isNaN(frameCount) || frameCount < 1 || frameCount > 10) {
        alert('Please enter a valid number of frames (1-10).');
        return;
    }
    
    // Hide comparison container if it was visible
    comparisonContainerElem.style.display = 'none';
    
    // Run the selected algorithm
    switch (currentAlgorithm) {
        case 'fifo':
            simulationSteps = simulateFIFO(referenceString, frameCount);
            break;
        case 'lru':
            simulationSteps = simulateLRU(referenceString, frameCount);
            break;
        case 'optimal':
            simulationSteps = simulateOptimal(referenceString, frameCount);
            break;
    }
    
    // Reset to the first step and update UI
    currentStep = 0;
    updateUI();
    
    // Enable simulation controls
    prevStepBtn.disabled = true;
    nextStepBtn.disabled = false;
    playBtn.disabled = false;
    
    // Update play button icon to play
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
}

// FIFO Page Replacement Algorithm
function simulateFIFO(referenceString, frameCount) {
    const frames = Array(frameCount).fill(null);
    let fifoQueue = [];
    let pageFaults = 0;
    let steps = [];
    
    // Create initial step
    steps.push({
        page: null,
        frames: [...frames],
        fifoQueue: [...fifoQueue],
        result: 'Initial state',
        isHit: false,
        isFault: false,
        pageFaults,
        pageHits: 0
    });
    
    // Process each page in the reference string
    referenceString.forEach((page, index) => {
        const pageIndex = frames.indexOf(page);
        let isHit = pageIndex !== -1;
        let replacedPage = null;
        
        if (!isHit) {
            // Page fault - need to replace a page
            pageFaults++;
            
            // If there's an empty frame, use it
            const emptyIndex = frames.indexOf(null);
            if (emptyIndex !== -1) {
                frames[emptyIndex] = page;
                fifoQueue.push(emptyIndex); // Add to queue
            } else {
                // Replace the oldest page (FIFO)
                const replaceIndex = fifoQueue.shift(); // Get the oldest frame index
                replacedPage = frames[replaceIndex];
                frames[replaceIndex] = page;
                fifoQueue.push(replaceIndex); // Add to queue
            }
        }
        
        // Create a step for this page reference
        steps.push({
            page,
            frames: [...frames],
            fifoQueue: [...fifoQueue],
            result: isHit ? 'Page Hit' : 'Page Fault',
            isHit,
            isFault: !isHit,
            replacedPage,
            pageFaults,
            pageHits: index + 1 - pageFaults
        });
    });
    
    return steps;
}

// LRU (Least Recently Used) Page Replacement Algorithm
function simulateLRU(referenceString, frameCount) {
    const frames = Array(frameCount).fill(null);
    let lruOrder = []; // Keeps track of order of use (most recently used at the end)
    let pageFaults = 0;
    let steps = [];
    
    // Create initial step
    steps.push({
        page: null,
        frames: [...frames],
        lruOrder: [...lruOrder],
        result: 'Initial state',
        isHit: false,
        isFault: false,
        pageFaults,
        pageHits: 0
    });
    
    // Process each page in the reference string
    referenceString.forEach((page, index) => {
        const pageIndex = frames.indexOf(page);
        let isHit = pageIndex !== -1;
        let replacedPage = null;
        
        // Update LRU order - remove if exists, then add to end (most recently used)
        const lruIndex = lruOrder.indexOf(pageIndex);
        if (lruIndex !== -1) {
            lruOrder.splice(lruIndex, 1);
        }
        
        if (!isHit) {
            // Page fault - need to replace a page
            pageFaults++;
            
            // If there's an empty frame, use it
            const emptyIndex = frames.indexOf(null);
            if (emptyIndex !== -1) {
                frames[emptyIndex] = page;
                lruOrder.push(emptyIndex); // Add to LRU order
            } else {
                // Replace the least recently used page
                const replaceIndex = lruOrder.shift(); // Get the least recently used frame index
                replacedPage = frames[replaceIndex];
                frames[replaceIndex] = page;
                lruOrder.push(replaceIndex); // Add to LRU order
            }
        } else {
            // Page hit - update LRU order
            lruOrder.push(pageIndex);
        }
        
        // Create a step for this page reference
        steps.push({
            page,
            frames: [...frames],
            lruOrder: [...lruOrder],
            result: isHit ? 'Page Hit' : 'Page Fault',
            isHit,
            isFault: !isHit,
            replacedPage,
            pageFaults,
            pageHits: index + 1 - pageFaults
        });
    });
    
    return steps;
}

// Optimal Page Replacement Algorithm
function simulateOptimal(referenceString, frameCount) {
    const frames = Array(frameCount).fill(null);
    let pageFaults = 0;
    let steps = [];
    
    // Create initial step
    steps.push({
        page: null,
        frames: [...frames],
        result: 'Initial state',
        isHit: false,
        isFault: false,
        pageFaults,
        pageHits: 0
    });
    
    // Process each page in the reference string
    referenceString.forEach((page, index) => {
        const pageIndex = frames.indexOf(page);
        let isHit = pageIndex !== -1;
        let replacedPage = null;
        
        if (!isHit) {
            // Page fault - need to replace a page
            pageFaults++;
            
            // If there's an empty frame, use it
            const emptyIndex = frames.indexOf(null);
            if (emptyIndex !== -1) {
                frames[emptyIndex] = page;
            } else {
                // Replace the page that won't be used for the longest time in the future
                let farthestIndex = -1;
                let farthestDistance = -1;
                
                // Check each frame to find the one that won't be used for the longest time
                for (let i = 0; i < frames.length; i++) {
                    const currentPage = frames[i];
                    let nextUseDistance = referenceString.slice(index + 1).indexOf(currentPage);
                    
                    // If the page won't be used again, it's the best candidate for replacement
                    if (nextUseDistance === -1) {
                        farthestIndex = i;
                        break;
                    }
                    
                    // Otherwise, find the page that will be used farthest in the future
                    if (nextUseDistance > farthestDistance) {
                        farthestDistance = nextUseDistance;
                        farthestIndex = i;
                    }
                }
                
                // Replace the selected page
                replacedPage = frames[farthestIndex];
                frames[farthestIndex] = page;
            }
        }
        
        // Create a step for this page reference
        steps.push({
            page,
            frames: [...frames],
            result: isHit ? 'Page Hit' : 'Page Fault',
            isHit,
            isFault: !isHit,
            replacedPage,
            pageFaults,
            pageHits: index + 1 - pageFaults
        });
    });
    
    return steps;
}

// Update the UI with the current step
function updateUI() {
    if (simulationSteps.length === 0) return;
    
    const step = simulationSteps[currentStep];
    
    // Update step information
    currentPageElem.textContent = step.page !== null ? step.page : '-';
    currentStepElem.textContent = currentStep;
    totalStepsElem.textContent = simulationSteps.length - 1;
    stepResultElem.textContent = step.result;
    
    // Update memory frames visualization
    updateMemoryFramesVisualization(step);
    
    // Update reference string visualization
    updateReferenceStringVisualization();
    
    // Update results
    if (currentStep > 0) {
        const lastStep = simulationSteps[simulationSteps.length - 1];
        pageFaultsElem.textContent = lastStep.pageFaults;
        pageHitsElem.textContent = lastStep.pageHits;
        
        const totalPages = lastStep.pageFaults + lastStep.pageHits;
        faultRatioElem.textContent = `${((lastStep.pageFaults / totalPages) * 100).toFixed(1)}%`;
        hitRatioElem.textContent = `${((lastStep.pageHits / totalPages) * 100).toFixed(1)}%`;
    } else {
        pageFaultsElem.textContent = '0';
        pageHitsElem.textContent = '0';
        faultRatioElem.textContent = '0%';
        hitRatioElem.textContent = '0%';
    }
    
    // Enable/disable step buttons
    prevStepBtn.disabled = currentStep === 0;
    nextStepBtn.disabled = currentStep === simulationSteps.length - 1;
}

// Update the memory frames visualization
function updateMemoryFramesVisualization(step) {
    memoryFramesElem.innerHTML = '';
    
    const frameRow = document.createElement('div');
    frameRow.className = 'frame-row';
    
    const frameLabel = document.createElement('div');
    frameLabel.className = 'frame-label';
    frameLabel.textContent = 'Frames:';
    frameRow.appendChild(frameLabel);
    
    const framesContainer = document.createElement('div');
    framesContainer.className = 'frames';
    
    step.frames.forEach((page, index) => {
        const frameElement = document.createElement('div');
        frameElement.className = 'frame';
        
        if (page === null) {
            frameElement.classList.add('empty');
            frameElement.textContent = '-';
        } else {
            frameElement.textContent = page;
            
            // Highlight the frame based on the result of the current step
            if (currentStep > 0 && step.page === page) {
                if (step.isHit) {
                    frameElement.classList.add('hit');
                } else {
                    frameElement.classList.add('fault');
                }
            }
        }
        
        framesContainer.appendChild(frameElement);
    });
    
    frameRow.appendChild(framesContainer);
    memoryFramesElem.appendChild(frameRow);
}

// Update the reference string visualization
function updateReferenceStringVisualization() {
    referenceStringVisualElem.innerHTML = '';
    
    referenceString.forEach((page, index) => {
        const refElement = document.createElement('div');
        refElement.className = 'reference-item';
        refElement.textContent = page;
        
        // Mark current, past, hit, or fault
        if (index < currentStep - 1) {
            refElement.classList.add('past');
            
            const stepForThisPage = simulationSteps[index + 1];
            if (stepForThisPage.isHit) {
                refElement.classList.add('hit');
            } else {
                refElement.classList.add('fault');
            }
        } else if (index === currentStep - 1) {
            refElement.classList.add('current');
            
            const stepForThisPage = simulationSteps[currentStep];
            if (stepForThisPage.isHit) {
                refElement.classList.add('hit');
            } else {
                refElement.classList.add('fault');
            }
        }
        
        referenceStringVisualElem.appendChild(refElement);
    });
}

// Go to the previous step in the simulation
function goToPreviousStep() {
    if (currentStep > 0) {
        currentStep--;
        updateUI();
    }
}

// Go to the next step in the simulation
function goToNextStep() {
    if (currentStep < simulationSteps.length - 1) {
        currentStep++;
        updateUI();
    }
}

// Toggle play/pause of the simulation
function togglePlaySimulation() {
    if (playInterval) {
        // Pause the simulation
        clearInterval(playInterval);
        playInterval = null;
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    } else {
        // Play the simulation
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        
        // Reset to beginning if at the end
        if (currentStep === simulationSteps.length - 1) {
            currentStep = 0;
        }
        
        const speed = 1100 - (simulationSpeedInput.value * 100); // Convert 1-10 to 1000-100ms
        
        playInterval = setInterval(() => {
            if (currentStep < simulationSteps.length - 1) {
                currentStep++;
                updateUI();
            } else {
                // End of simulation, stop playing
                clearInterval(playInterval);
                playInterval = null;
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        }, speed);
    }
}

// Compare all algorithms
function compareAlgorithms() {
    // Parse input values
    referenceString = parseReferenceString();
    frameCount = parseInt(frameCountInput.value);
    
    // Validate inputs
    if (referenceString.length === 0) {
        alert('Please enter a valid reference string.');
        return;
    }
    
    if (isNaN(frameCount) || frameCount < 1 || frameCount > 10) {
        alert('Please enter a valid number of frames (1-10).');
        return;
    }
    
    // Run all algorithms
    const fifoSteps = simulateFIFO(referenceString, frameCount);
    const lruSteps = simulateLRU(referenceString, frameCount);
    const optimalSteps = simulateOptimal(referenceString, frameCount);
    
    // Store results
    comparisonResults = {
        fifo: fifoSteps[fifoSteps.length - 1],
        lru: lruSteps[lruSteps.length - 1],
        optimal: optimalSteps[optimalSteps.length - 1]
    };
    
    // Display comparison results
    updateComparisonUI();
    
    // Show comparison section
    comparisonContainerElem.style.display = 'block';
}

// Update the comparison UI
function updateComparisonUI() {
    comparisonResultsElem.innerHTML = '';
    
    // Create result cards for each algorithm
    const algorithms = [
        { key: 'fifo', name: 'FIFO (First In First Out)' },
        { key: 'lru', name: 'LRU (Least Recently Used)' },
        { key: 'optimal', name: 'Optimal' }
    ];
    
    algorithms.forEach(algorithm => {
        const result = comparisonResults[algorithm.key];
        if (!result) return;
        
        const totalPages = result.pageFaults + result.pageHits;
        const hitRatio = ((result.pageHits / totalPages) * 100).toFixed(1);
        const faultRatio = ((result.pageFaults / totalPages) * 100).toFixed(1);
        
        const resultCard = document.createElement('div');
        resultCard.className = 'algorithm-result';
        
        resultCard.innerHTML = `
            <h3>${algorithm.name}</h3>
            <div class="result-detail">
                <span>Page Faults:</span>
                <strong>${result.pageFaults}</strong>
            </div>
            <div class="result-detail">
                <span>Page Hits:</span>
                <strong>${result.pageHits}</strong>
            </div>
            <div class="result-detail">
                <span>Fault Ratio:</span>
                <strong>${faultRatio}%</strong>
            </div>
            <div class="result-detail">
                <span>Hit Ratio:</span>
                <strong>${hitRatio}%</strong>
            </div>
        `;
        
        comparisonResultsElem.appendChild(resultCard);
    });
    
    // Create comparison chart
    createComparisonChart();
}

// Create a chart to compare algorithms
function createComparisonChart() {
    if (chart) {
        chart.destroy();
    }
    
    const ctx = comparisonChartElem.getContext('2d');
    
    const pageFaults = [
        comparisonResults.fifo.pageFaults,
        comparisonResults.lru.pageFaults,
        comparisonResults.optimal.pageFaults
    ];
    
    const pageHits = [
        comparisonResults.fifo.pageHits,
        comparisonResults.lru.pageHits,
        comparisonResults.optimal.pageHits
    ];
    
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['FIFO', 'LRU', 'Optimal'],
            datasets: [
                {
                    label: 'Page Faults',
                    data: pageFaults,
                    backgroundColor: '#ef4444',
                    borderColor: '#ef4444',
                    borderWidth: 1
                },
                {
                    label: 'Page Hits',
                    data: pageHits,
                    backgroundColor: '#10b981',
                    borderColor: '#10b981',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Algorithms'
                    }
                }
            }
        }
    });
}

// Reset the simulation
function resetSimulation() {
    // Clear simulation
    simulationSteps = [];
    currentStep = 0;
    
    // Reset UI elements
    currentPageElem.textContent = '-';
    currentStepElem.textContent = '0';
    totalStepsElem.textContent = '0';
    stepResultElem.textContent = '-';
    memoryFramesElem.innerHTML = '';
    referenceStringVisualElem.innerHTML = '';
    pageFaultsElem.textContent = '0';
    pageHitsElem.textContent = '0';
    faultRatioElem.textContent = '0%';
    hitRatioElem.textContent = '0%';
    
    // Hide comparison container
    comparisonContainerElem.style.display = 'none';
    
    // Disable controls
    prevStepBtn.disabled = true;
    nextStepBtn.disabled = true;
    playBtn.disabled = true;
    
    // Stop playing if active
    if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
} 