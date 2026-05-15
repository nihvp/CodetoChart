/* ==========================================================================
   1. GLOBAL STATE & BOILERPLATES
   ========================================================================== */
let currentChartJs = null;
let labelTransforms = {}; 

mermaid.initialize({ startOnLoad: false, theme: 'default' });

const boilerplates = {
    chartjs: `{\n  type: 'bar',\n  data: {\n    labels: ['Red', 'Blue', 'Yellow', 'Green'],\n    datasets: [{\n      label: '# of Votes',\n      data: [12, 19, 3, 5],\n      customLabels: ['Good', 'Great', 'Bad', 'Okay'],\n      customLabelColors: ['#bc6c25', '#dda15e', '#606c38', '#283618'],\n      backgroundColor: ['#bc6c25', '#dda15e', '#606c38', '#283618']\n    }]\n  },\n  options: {\n    animation: false,\n    maintainAspectRatio: false,\n    legend: { labels: { boxWidth: 0, fontColor: '#283618', fontFamily: 'Instrument Serif' } }\n  }\n}`,
    mermaid: `graph TD\n    A[Hard Drive] -->|Read| B(CPU)\n    B -->|Write| C{RAM}\n    C -->|Store| D[Cloud]`
};

/* ==========================================================================
   2. INITIALIZATION & EVENT LISTENERS
   ========================================================================== */
window.onload = () => {
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
    document.getElementById('helpBtn').addEventListener('click', startTour);
    document.getElementById('engineSelect').addEventListener('change', loadBoilerplate);
    document.getElementById('renderBtn').addEventListener('click', renderPreview);
    document.getElementById('bgTransparent').addEventListener('change', togglePreviewBg);
    document.getElementById('showLabels').addEventListener('change', renderPreview);
    document.getElementById('labelColor').addEventListener('input', renderPreview); 
    document.getElementById('exportPngBtn').addEventListener('click', exportPNG);
    document.getElementById('exportSvgBtn').addEventListener('click', exportSVG);
    document.getElementById('skipTourBtn').addEventListener('click', endTour);
    document.getElementById('nextTourBtn').addEventListener('click', nextTourStep);
    window.addEventListener('resize', handleResize);

    // Guide Modal Listeners
    document.getElementById('guideBtn').addEventListener('click', openGuide);
    document.getElementById('guideCloseBtn').addEventListener('click', closeGuide);
    document.querySelector('.guide-tabs').addEventListener('click', switchGuideTab);
    document.getElementById('guideOverlay').addEventListener('click', (e) => {
        if(e.target.id === 'guideOverlay') closeGuide();
    });

    // EVENT DELEGATION FOR THE COPY BUTTON
    // Bypasses strict Content Security Policies that block inline 'onclick' attributes.
    document.getElementById('guideContentArea').addEventListener('click', (e) => {
        const copyBtn = e.target.closest('.copy-prompt-btn');
        if (copyBtn) {
            const targetId = copyBtn.getAttribute('data-target-id');
            copyPrompt(copyBtn, targetId);
        }
    });

    loadSavedTheme();
    loadBoilerplate();
    checkFirstVisit(); 
};

/* ==========================================================================
   3. CORE APPLICATION LOGIC & CANVAS PHYSICS
   ========================================================================== */
function getSafeConfig() {
    return new Function("return " + document.getElementById('codeInput').value)();
}

function loadBoilerplate() {
    const engine = document.getElementById('engineSelect').value;
    document.getElementById('codeInput').value = boilerplates[engine];
    
    labelTransforms = {}; 

    const labelOptions = document.getElementById('labelOptions');
    const showLabelsCheckbox = document.getElementById('showLabels');
    const labelColorPicker = document.getElementById('labelColor');
    
    if (engine === 'mermaid') {
        labelOptions.style.textDecoration = 'line-through';
        labelOptions.style.opacity = '0.4';
        labelOptions.style.pointerEvents = 'none';
        showLabelsCheckbox.disabled = true;
        labelColorPicker.disabled = true;
    } else {
        labelOptions.style.textDecoration = 'none';
        labelOptions.style.opacity = '1';
        labelOptions.style.pointerEvents = 'auto';
        showLabelsCheckbox.disabled = false;
        labelColorPicker.disabled = false;
    }
    
    renderPreview(); 
}

const ChartLabelsPlugin = {
    id: 'interactiveLabels',
    afterDatasetsDraw: function(chart) {
        if (!document.getElementById('showLabels').checked) return;
        
        const ctx = chart.ctx;
        const defaultColor = document.getElementById('labelColor').value;
        
        chart.labelHitboxes = {}; 

        chart.data.datasets.forEach(function(dataset, datasetIndex) {
            const meta = chart.getDatasetMeta(datasetIndex);
            if (!meta.hidden) {
                meta.data.forEach(function(element, pointIndex) {
                    
                    const key = datasetIndex + '_' + pointIndex;
                    
                    if (!labelTransforms[key]) {
                        labelTransforms[key] = { dx: 0, dy: -8, fontSize: 18 }; 
                    }
                    const transform = labelTransforms[key];
                    
                    let finalColor = defaultColor;
                    if (dataset.customLabelColors && dataset.customLabelColors[pointIndex]) {
                        finalColor = dataset.customLabelColors[pointIndex];
                    }

                    ctx.fillStyle = finalColor;
                    ctx.font = transform.fontSize + 'px "Instrument Serif"';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    
                    let labelText = '';
                    if (dataset.customLabels && dataset.customLabels[pointIndex] !== undefined) {
                        labelText = dataset.customLabels[pointIndex];
                    } else {
                        let dataVal = dataset.data[pointIndex];
                        if(typeof dataVal === 'object') dataVal = dataVal.y; 
                        if(dataVal !== undefined && dataVal !== null) labelText = dataVal.toString();
                    }
                    
                    if(labelText !== '') {
                        const pos = element.tooltipPosition();
                        const finalX = pos.x + transform.dx;
                        const finalY = pos.y + transform.dy;
                        
                        ctx.fillText(labelText, finalX, finalY);

                        const metrics = ctx.measureText(labelText);
                        chart.labelHitboxes[key] = {
                            x: finalX - (metrics.width / 2),
                            y: finalY - transform.fontSize,
                            w: metrics.width,
                            h: transform.fontSize
                        };
                    }
                });
            }
        });
    }
};

function attachCanvasDragEvents(canvas, chart) {
    let isDragging = false;
    let activeKey = null;
    let startX, startY;

    canvas.addEventListener('mousedown', (e) => {
        if (!document.getElementById('showLabels').checked) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        for (const key in chart.labelHitboxes) {
            const box = chart.labelHitboxes[key];
            if (mouseX >= box.x - 5 && mouseX <= box.x + box.w + 5 &&
                mouseY >= box.y - 5 && mouseY <= box.y + box.h + 5) {
                isDragging = true;
                activeKey = key;
                startX = mouseX;
                startY = mouseY;
                canvas.style.cursor = 'grabbing';
                return;
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!document.getElementById('showLabels').checked) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (isDragging && activeKey) {
            const deltaX = mouseX - startX;
            const deltaY = mouseY - startY;
            labelTransforms[activeKey].dx += deltaX;
            labelTransforms[activeKey].dy += deltaY;
            startX = mouseX;
            startY = mouseY;
            chart.update(0); 
        } else {
            let hovering = false;
            for (const key in chart.labelHitboxes) {
                const box = chart.labelHitboxes[key];
                if (mouseX >= box.x - 5 && mouseX <= box.x + box.w + 5 &&
                    mouseY >= box.y - 5 && mouseY <= box.y + box.h + 5) {
                    hovering = true;
                    break;
                }
            }
            canvas.style.cursor = hovering ? 'grab' : 'default';
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
        activeKey = null;
        canvas.style.cursor = 'default';
    });

    canvas.addEventListener('wheel', (e) => {
        if (!document.getElementById('showLabels').checked) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        for (const key in chart.labelHitboxes) {
            const box = chart.labelHitboxes[key];
            if (mouseX >= box.x - 5 && mouseX <= box.x + box.w + 5 &&
                mouseY >= box.y - 5 && mouseY <= box.y + box.h + 5) {
                e.preventDefault(); 
                const sizeChange = e.deltaY < 0 ? 1 : -1; 
                labelTransforms[key].fontSize = Math.max(8, Math.min(60, labelTransforms[key].fontSize + sizeChange));
                chart.update(0);
                return;
            }
        }
    }, { passive: false }); 
}

function renderPreview() {
    const engine = document.getElementById('engineSelect').value;
    const code = document.getElementById('codeInput').value;
    const area = document.getElementById('renderArea');
    const showLabels = document.getElementById('showLabels').checked;
    
    area.innerHTML = '';
    if (currentChartJs) { 
        currentChartJs.destroy(); 
        currentChartJs = null; 
    }

    try {
        if (engine === 'chartjs') {
            area.innerHTML = '<canvas id="previewCanvas"></canvas>';
            const config = getSafeConfig(); 
            
            if(!config.options) config.options = {};
            config.options.animation = false; 
            
            if (showLabels) {
                if (!config.plugins) config.plugins = [];
                config.plugins.push(ChartLabelsPlugin);
            }
            
            const canvas = document.getElementById('previewCanvas');
            currentChartJs = new Chart(canvas.getContext('2d'), config);
            
            if (showLabels) {
                attachCanvasDragEvents(canvas, currentChartJs);
            }
        } 
        else if (engine === 'mermaid') {
            mermaid.mermaidAPI.render('mermaidTemp', code, (svg) => {
                area.innerHTML = svg;
            });
        }
    } catch (e) {
        console.warn("Render Error:", e.message); 
    }
}

/* ==========================================================================
   4. EXPORT LOGIC
   ========================================================================== */
function triggerDownload(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl; link.download = filename; link.click();
}

function exportPNG() {
    const engine = document.getElementById('engineSelect').value;
    const area = document.getElementById('renderArea');
    const isTransparent = document.getElementById('bgTransparent').checked;
    const bgColor = getComputedStyle(document.body).getPropertyValue('--bg-canvas');

    if (engine === 'chartjs') {
        const canvas = document.getElementById('previewCanvas');
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
        const ctx = tempCanvas.getContext('2d');
        
        if (!isTransparent) {
            ctx.fillStyle = bgColor; 
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        }
        
        ctx.drawImage(canvas, 0, 0);
        triggerDownload(tempCanvas.toDataURL('image/png'), 'chart.png');
    } 
    else if (engine === 'mermaid') {
        const svgElement = area.querySelector('svg');
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            canvas.width = 800; canvas.height = 450;
            if (!isTransparent) {
                ctx.fillStyle = bgColor; 
                ctx.fillRect(0, 0, 800, 450);
            }
            const scale = Math.min(800/img.width, 450/img.height) * 0.9;
            const w = img.width * scale; const h = img.height * scale;
            ctx.drawImage(img, (800-w)/2, (450-h)/2, w, h);
            triggerDownload(canvas.toDataURL('image/png'), 'diagram.png');
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
}

function exportSVG() {
    const engine = document.getElementById('engineSelect').value;
    const showLabels = document.getElementById('showLabels').checked;

    if (engine === 'chartjs') {
        const config = getSafeConfig();
        const svgContext = new C2S(800, 450); 
        svgContext.clip = function() {}; 
        
        const dummyCanvas = document.createElement('canvas');
        dummyCanvas.width = 800; dummyCanvas.height = 450;
        dummyCanvas.getContext = ctxType => ctxType === '2d' ? svgContext : null;
        svgContext.canvas = dummyCanvas;
        
        if(!config.options) config.options = {};
        config.options.devicePixelRatio = 1; 
        config.options.animation = false; 
        config.options.responsive = false;
        
        if (showLabels) {
            if (!config.plugins) config.plugins = [];
            config.plugins.push(ChartLabelsPlugin);
        }
        
        new Chart(svgContext, config); 
        const blob = new Blob([svgContext.getSerializedSvg()], { type: "image/svg+xml;charset=utf-8" });
        triggerDownload(URL.createObjectURL(blob), 'chart.svg');
    } 
    else if (engine === 'mermaid') {
        const area = document.getElementById('renderArea');
        const svgElement = area.querySelector('svg');
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        triggerDownload(URL.createObjectURL(blob), 'diagram.svg');
    }
}

/* ==========================================================================
   5. UI & TOUR LOGIC
   ========================================================================== */
function toggleTheme() {
    const html = document.documentElement;
    if (html.getAttribute('data-theme') === 'light') {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark'); 
    } else {
        html.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
}

function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
}

function togglePreviewBg() {
    const container = document.getElementById('renderArea');
    document.getElementById('bgTransparent').checked ? container.classList.add('transparent') : container.classList.remove('transparent');
}

const tourSteps = [
    { id: "engineSelect", title: "1. Choose Engine", text: "Select your preferred graphing engine from the dropdown to load boilerplate code." },
    { id: "codeInput", title: "2. Code", text: "Modify the raw configuration here to build your chart." },
    { id: "renderBtn", title: "3. Render", text: "Click the 'Render' button to preview your changes live." },
    { id: "step4-target", title: "4. Settings", text: "Modify transparency, toggle data labels, and customize label colors." },
    { id: "step5-target", title: "5. Export", text: "Download your finalized chart as a high-resolution PNG or scalable SVG." }
];
let currentTourStep = 0;

function startTour() {
    currentTourStep = 0;
    document.getElementById('tourBackdrop').classList.add('active');
    document.getElementById('tourTooltip').classList.add('active');
    updateTourUI();
}

function nextTourStep() {
    currentTourStep++;
    if (currentTourStep >= tourSteps.length) endTour();
    else updateTourUI();
}

function endTour() {
    document.getElementById('tourBackdrop').classList.remove('active');
    document.getElementById('tourTooltip').classList.remove('active');
    document.querySelectorAll('.tour-spotlight-active').forEach(el => el.classList.remove('tour-spotlight-active'));
    localStorage.setItem('tourCompleted', 'true'); 
}

function updateTourUI() {
    document.querySelectorAll('.tour-spotlight-active').forEach(el => el.classList.remove('tour-spotlight-active'));
    const step = tourSteps[currentTourStep];
    const targetEl = document.getElementById(step.id);
    const tooltip = document.getElementById('tourTooltip');
    
    if(targetEl) targetEl.classList.add('tour-spotlight-active');

    document.getElementById('tourTitle').innerText = step.title;
    document.getElementById('tourContent').innerText = step.text;
    document.getElementById('tourStepBadge').innerText = `${currentTourStep + 1}/${tourSteps.length}`;
    document.getElementById('nextTourBtn').innerText = currentTourStep === tourSteps.length - 1 ? "Finish ✔" : "Next ➔";

    if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
            tooltip.style.top = `${rect.bottom + 15}px`;
            tooltip.style.left = `50%`;
            tooltip.style.transform = `translateX(-50%)`;
        } else {
            if (currentTourStep <= 2) {
                tooltip.style.top = `${rect.top}px`;
                tooltip.style.left = `${rect.right + 20}px`;
                tooltip.style.transform = `none`;
            } else {
                tooltip.style.top = `${rect.bottom + 15}px`;
                tooltip.style.left = `${rect.left - 100}px`;
                tooltip.style.transform = `none`;
            }
        }
    }
}

function checkFirstVisit() {
    if (!localStorage.getItem('tourCompleted')) setTimeout(startTour, 600); 
}

function handleResize() {
    if(document.getElementById('tourTooltip').classList.contains('active')) updateTourUI();
}

/* ==========================================================================
   6. GUIDE MODAL LOGIC & COPY BUTTONS
   ========================================================================== */
const svgCopyIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
const svgCheckIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

// Notice the missing inline 'onclick' attributes here; replaced securely with 'data-target-id'.
const guideData = {
    chartjs: {
        writing: `<h2>📊 Quick Guide: Writing Chart.js</h2>
<p>Chart.js uses a single JavaScript Object to define the chart. Do not write variable declarations (like <code>const chart = ...</code>), just output the raw JSON-like object.</p>
<p><strong>Basic Structure:</strong></p>
<pre><code>{
  type: 'bar', // Change to 'line', 'pie', 'doughnut', 'radar', or 'scatter'
  data: {
    labels: ['January', 'February', 'March'], // X-axis labels
    datasets: [{
      label: 'Monthly Revenue',
      data: [1200, 1900, 3000],               // Y-axis data points
      backgroundColor: ['#bc6c25', '#dda15e', '#606c38']
    }]
  },
  options: {
    maintainAspectRatio: false, // Recommended for the Exporter Studio
    animation: false,           // Required for clean SVG/PNG exports
    scales: {
      yAxes: [{ ticks: { beginAtZero: true } }]
    }
  }
}</code></pre>
<p><em>💡 Tip: When using the Exporter Studio, checking the "Labels" box will automatically draw the exact data values on top of your bars and lines, ignoring normal Chart.js tooltip rules.</em></p>`,
        prompting: `<h3>Prompting guide: 📊 For Chart.js</h3>
<p>Use this prompt to ensure the AI uses the correct version and formatting, and takes advantage of our custom label features:</p>
<p><strong>Copy & Paste this to your AI:</strong></p>
<div class="prompt-container">
    <button class="copy-prompt-btn" aria-label="Copy Prompt" data-target-id="chartjs-prompt-text">${svgCopyIcon}</button>
    <blockquote id="chartjs-prompt-text">"I am using a custom Chart.js viewer that uses Chart.js version 2.9.4. I need you to generate a chart based on my data.<br>
<strong>CRITICAL RULES:</strong><br>
1. ONLY output the raw JavaScript configuration object starting with <code>{ type: ... }</code>.<br>
2. DO NOT output any HTML, <code>&lt;script&gt;</code> tags, or markdown code blocks.<br>
3. DO NOT assign the object to a variable (e.g., no <code>const config =</code>).<br>
4. Set <code>options.animation: false</code> and <code>options.maintainAspectRatio: false</code>.<br>
5. (Optional) If the chart needs custom text labels on the points, include a <code>customLabels: ['Text1', 'Text2']</code> array and a <code>customLabelColors: ['#hex', '#hex']</code> array inside the dataset object.<br><br>
Here is the data I want you to chart: [INSERT YOUR DATA HERE]"</blockquote>
</div>`
    },
    mermaid: {
        writing: `<h2>🌊 Quick Guide: Writing Mermaid.js</h2>
<p>Mermaid uses a simple, Markdown-inspired text syntax to generate diagrams. Do not wrap it in code blocks, just write the raw text.</p>
<p><strong>1. Flowcharts:</strong></p>
<pre><code>graph LR
    A[Hard Drive] -->|Reads Data| B(CPU)
    B --> C{Decision}
    C -->|Store| D[(Database)]
    C -->|Display| E[Monitor]</code></pre>
<p><strong>2. Sequence Diagrams:</strong></p>
<pre><code>sequenceDiagram
    participant User
    participant API
    participant Database

    User->>API: Request Data
    API->>Database: Query User Table
    Database-->>API: Return Row
    API-->>User: JSON Response</code></pre>
<p><strong>3. Gantt Charts:</strong></p>
<pre><code>gantt
    title Project Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1
    Design UI           :a1, 2026-06-01, 7d
    Backend Setup       :after a1, 5d</code></pre>`,
        prompting: `<h3>Prompting guide: 🌊 For Mermaid.js</h3>
<p>Use this prompt to ensure the AI outputs clean text that the studio can parse instantly:</p>
<p><strong>Copy & Paste this to your AI:</strong></p>
<div class="prompt-container">
    <button class="copy-prompt-btn" aria-label="Copy Prompt" data-target-id="mermaid-prompt-text">${svgCopyIcon}</button>
    <blockquote id="mermaid-prompt-text">"I am using a custom Mermaid.js viewer. I need you to generate a diagram based on my workflow.<br>
<strong>CRITICAL RULES:</strong><br>
1. ONLY output the raw Mermaid text syntax.<br>
2. DO NOT wrap the output in markdown code blocks (e.g., no <code>\`\`\`mermaid</code>).<br>
3. DO NOT include any explanatory text before or after the code. Just output the raw graph commands.<br><br>
Here is the workflow I want you to diagram: [INSERT YOUR WORKFLOW HERE]"</blockquote>
</div>`
    }
};

function copyPrompt(btnElement, textElementId) {
    const textElement = document.getElementById(textElementId);
    if (!textElement) return;
    const textToCopy = textElement.innerText;
    
    const showSuccess = () => {
        btnElement.innerHTML = svgCheckIcon;
        const toast = document.getElementById('toastNotification');
        toast.classList.add('show');
        setTimeout(() => {
            btnElement.innerHTML = svgCopyIcon;
            toast.classList.remove('show');
        }, 2000);
    };

    const fallbackCopyTextToClipboard = (text) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
        }
        document.body.removeChild(textArea);
    };

    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(textToCopy);
        showSuccess();
    } else {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showSuccess();
        }).catch(err => {
            console.warn('Modern copy failed, trying fallback: ', err);
            fallbackCopyTextToClipboard(textToCopy);
            showSuccess();
        });
    }
}

function openGuide() {
    const engine = document.getElementById('engineSelect').value;
    const contentArea = document.getElementById('guideContentArea');
    
    contentArea.innerHTML = `
        <div id="writingGuide" class="guide-pane active">${guideData[engine].writing}</div>
        <div id="promptingGuide" class="guide-pane">${guideData[engine].prompting}</div>
    `;
    
    document.querySelectorAll('.guide-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.guide-tab[data-target="writingGuide"]').classList.add('active');

    document.getElementById('guideOverlay').classList.add('active');
}

function closeGuide() {
    document.getElementById('guideOverlay').classList.remove('active');
}

function switchGuideTab(e) {
    if (!e.target.classList.contains('guide-tab')) return;
    
    document.querySelectorAll('.guide-tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    
    const targetId = e.target.getAttribute('data-target');
    document.querySelectorAll('.guide-pane').forEach(p => p.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
}