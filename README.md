# Code to Chart
Code to Chart is a lightweight, zero-backend, browser-based tool for writing, previewing, and exporting high-resolution charts and diagrams. It supports rendering complex data visualizations and exporting them as scalable SVGs or transparent PNGs.

## ✨ Features

* **Multi-Engine Support:** Write raw configuration objects for **Chart.js**, or use markdown syntax for **Mermaid.js**.
* **Vector & Raster Export:** Download your charts as crisp `.png` files or infinitely scalable `.svg` files.
* **Customization Overlays:** Inject transparent backgrounds and toggle dynamically colored data labels instantly.
* **Privacy-First & Local:** Everything renders client-side. No servers, no data logging, no dependencies to install.
* **Smart UI:** Features a guided onboarding tour, a persistent Dark/Light mode toggle, and mobile-responsive layout.

## 🚀 Getting Started

1. Visit [Code to Chart](https://muhammed.me/CodetoChart/)
3. Select your engine, write your code, and click **Render**.


## 📊 Quick Guide: Writing Chart.js

Chart.js uses a single JavaScript Object to define the chart. Do not write variable declarations (like `const chart = ...`), just output the raw JSON-like object.

**Basic Structure:**

```javascript
{
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
}

```

*💡 Tip: When using the Exporter Studio, checking the "Labels" box will automatically draw the exact data values on top of your bars and lines, ignoring normal Chart.js tooltip rules.*


## 🌊 Quick Guide: Writing Mermaid.js

Mermaid uses a simple, Markdown-inspired text syntax to generate diagrams. Do not wrap it in code blocks, just write the raw text.

**1. Flowcharts:**
Declare the graph type and direction (`TD` = Top-Down, `LR` = Left-Right). Use brackets for shapes.

```text
graph LR
    A[Hard Drive] -->|Reads Data| B(CPU)
    B --> C{Decision}
    C -->|Store| D[(Database)]
    C -->|Display| E[Monitor]

```

**2. Sequence Diagrams:**
Track interactions between systems over time.

```text
sequenceDiagram
    participant User
    participant API
    participant Database

    User->>API: Request Data
    API->>Database: Query User Table
    Database-->>API: Return Row
    API-->>User: JSON Response

```

**3. Gantt Charts:**

```text
gantt
    title Project Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1
    Design UI           :a1, 2026-06-01, 7d
    Backend Setup       :after a1, 5d

```



## 🤖 AI Prompting Guide

If you want to use an AI (like ChatGPT, Gemini, or Claude) to generate the code for this tool, you need to give it specific instructions. Because this studio uses a custom sandbox, the AI must output *raw code* without standard web boilerplate.

Copy and paste these "Magic Prompts" into your AI before asking it to build your chart.

### 📊 For Chart.js

Use this prompt to ensure the AI uses the correct version and formatting, and takes advantage of our custom label features:

**Copy & Paste this to your AI:**
> "I am using a custom Chart.js viewer that uses Chart.js version 2.9.4. I need you to generate a chart based on my data.
> **CRITICAL RULES:**
> 1. ONLY output the raw JavaScript configuration object starting with `{ type: ... }`.
> 2. DO NOT output any HTML, `<script>` tags, or markdown code blocks.
> 3. DO NOT assign the object to a variable (e.g., no `const config =`).
> 4. Set `options.animation: false` and `options.maintainAspectRatio: false`.
> 5. (Optional) If the chart needs custom text labels on the points, include a `customLabels: ['Text1', 'Text2']` array and a `customLabelColors: ['#hex', '#hex']` array inside the dataset object.
> 
> 
> Here is the data I want you to chart: [INSERT YOUR DATA HERE]"

### 🌊 For Mermaid.js

Use this prompt to ensure the AI outputs clean text that the studio can parse instantly:

**Copy & Paste this to your AI:**
> "I am using a custom Mermaid.js viewer. I need you to generate a diagram based on my workflow.
> **CRITICAL RULES:**
> 1. ONLY output the raw Mermaid text syntax.
> 2. DO NOT wrap the output in markdown code blocks (e.g., no ````mermaid`).
> 3. DO NOT include any explanatory text before or after the code. Just output the raw graph commands.
> 
> 
> Here is the workflow I want you to diagram: [INSERT YOUR WORKFLOW HERE]"

---
