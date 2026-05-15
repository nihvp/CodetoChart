/* ==========================================================================
   1. GLOBAL STATE & BOILERPLATES
   ========================================================================== */
let currentChartJs = null;
let labelTransforms = {}; 

mermaid.initialize({ startOnLoad: false, theme: 'default' });

const boilerplates = {
    // Notice the new 'customLabelColors' array added to the boilerplate
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
                    
                    // Determine Color: Use custom array if it exists, otherwise use UI fallback
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