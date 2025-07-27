# TreeTextLLM

TreeTextLLM is a hierarchical document editor designed for structuring and writing complex, long-form content. It integrates with local Large Language Models (LLMs) to provide optional AI-powered assistance for content generation and transformation.

This project was bootstrapped with [Firebase Studio](https://studio.firebase.google.com).

## Features

*   **Three-Panel Interface:** A UI divided into three main views:
    *   **Outline:** A hierarchical tree view of the document structure. Nodes can be created, deleted, renamed, and reordered (indented/outdented, moved up/down). Double-clicking a node opens it in the editor.
    *   **Editor:** A focused view for writing and modifying the content of a single node. Content is saved automatically.
    *   **Preview:** A stitched-together view of the entire document, rendered as a single continuous file. Clicking on a text block in the preview will navigate to its source node in the outline.
*   **AI-Powered Assistance (Optional):**
    *   **Smart Node Creation:** Provide a text-based intent to have a local LLM generate a title and initial content for a new node.
    *   **Text Transformation:** Use a prompt within the editor to have the LLM modify the current node's text. A diff view is provided to review and accept the changes.
*   **Local LLM Integration:** Connects to any OpenAI-compatible local LLM server (e.g., LM Studio, Llama.cpp) for privacy and offline use. Standard, non-AI node creation is also available.
*   **Data Persistence & Portability:**
    *   All documents are saved automatically to the browser's local storage.
    *   Import and export entire document structures as a single JSON file.
    *   Import multiple Markdown or text files into the tree as new nodes.
    *   Export the complete, concatenated document as a single Markdown file from the Preview panel.

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm (comes with Node.js)
*   (Optional) A local, OpenAI-compatible LLM server like [Llama.cpp](https://github.com/ggerganov/llama.cpp) or [LM Studio](https://lmstudio.ai/).

### Installation

1.  **Clone the repo**
    ```sh
    git clone https://github.com/innomen/TreeTextLLM.git
    cd TreeTextLLM
    ```
2.  **Install NPM packages**
    ```sh
    npm install
    ```
3.  **Run the development server**
    ```sh
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

4.  **Configure the LLM Connection**

    *   Once the app is running, click the **Settings** (gear) icon in the top-right corner.
    *   In the settings dialog, enter the API Base URL for your local LLM server. For many tools, this will be something like `http://localhost:8080/v1`.
    *   Click **Save Settings**.