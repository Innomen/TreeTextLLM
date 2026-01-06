#!/usr/bin/env python3
"""
TreeTextLLM - Complete Python Edition
Full-featured hierarchical document editor with LLM integration
"""
import json
import os
from pathlib import Path
from typing import Optional, Dict, List
import requests
from flask import Flask, render_template_string, request, jsonify, send_file
import uuid

app = Flask(__name__)

# Data storage
DATA_DIR = Path("treetextllm_data")
DATA_DIR.mkdir(exist_ok=True)
DOCS_FILE = DATA_DIR / "documents.json"
SETTINGS_FILE = DATA_DIR / "settings.json"

# Default data
DEFAULT_DOCS = {
    "documents": [
        {
            "id": str(uuid.uuid4()),
            "name": "Welcome Document",
            "rootNodeId": None,
            "nodes": {}
        }
    ],
    "activeDocId": None,
    "activeNodeId": None
}

DEFAULT_SETTINGS = {
    "apiBaseUrl": "http://localhost:8080/v1",
    "model": "gpt-3.5-turbo"
}

def load_docs():
    if DOCS_FILE.exists():
        return json.loads(DOCS_FILE.read_text())
    data = DEFAULT_DOCS.copy()
    root_id = str(uuid.uuid4())
    data['documents'][0]['rootNodeId'] = root_id
    data['documents'][0]['nodes'][root_id] = {
        "id": root_id,
        "title": "Welcome to TreeTextLLM",
        "content": "This is your first document. Start editing!",
        "children": []
    }
    data['activeDocId'] = data['documents'][0]['id']
    data['activeNodeId'] = root_id
    return data

def save_docs(data):
    DOCS_FILE.write_text(json.dumps(data, indent=2))

def load_settings():
    if SETTINGS_FILE.exists():
        return json.loads(SETTINGS_FILE.read_text())
    return DEFAULT_SETTINGS.copy()

def save_settings(data):
    SETTINGS_FILE.write_text(json.dumps(data, indent=2))

# HTML Template with ALL features
HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TreeTextLLM</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            height: 100vh;
            display: flex;
            flex-direction: column;
            background: #1e1e1e;
            color: #d4d4d4;
        }
        
        .header {
            background: #252526;
            padding: 12px 20px;
            border-bottom: 1px solid #3e3e42;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 { font-size: 18px; font-weight: 600; }
        .header-buttons { display: flex; gap: 10px; }
        
        .container {
            display: flex;
            flex: 1;
            overflow: hidden;
        }
        
        .panel {
            background: #252526;
            border-right: 1px solid #3e3e42;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        }
        .outline-panel { width: 300px; }
        .editor-panel { flex: 1; }
        .preview-panel { width: 400px; border-right: none; }
        
        .panel-header {
            padding: 12px 16px;
            background: #2d2d30;
            border-bottom: 1px solid #3e3e42;
            font-weight: 600;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
        }
        
        .panel-content {
            padding: 16px;
            flex: 1;
            overflow-y: auto;
        }
        
        /* Tree */
        .tree-node {
            padding: 8px 12px;
            cursor: pointer;
            border-radius: 4px;
            margin: 2px 0;
            user-select: none;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .tree-node:hover { background: #2a2d2e; }
        .tree-node.active { background: #094771; }
        .tree-node .node-title { flex: 1; }
        .tree-node .node-controls { 
            display: none; 
            gap: 4px;
        }
        .tree-node:hover .node-controls { display: flex; }
        .tree-children { margin-left: 20px; }
        
        /* Editor */
        .editor-title {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 16px;
            padding: 12px;
            background: #2d2d30;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            color: #d4d4d4;
        }
        .editor-content {
            width: 100%;
            min-height: 400px;
            padding: 12px;
            background: #2d2d30;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 14px;
            line-height: 1.6;
            color: #d4d4d4;
            resize: vertical;
        }
        
        /* Buttons */
        button {
            padding: 8px 16px;
            background: #0e639c;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            transition: background 0.2s;
        }
        button:hover { background: #1177bb; }
        button.secondary {
            background: #3e3e42;
        }
        button.secondary:hover { background: #505050; }
        button.danger {
            background: #c72e2e;
        }
        button.danger:hover { background: #e13333; }
        button.small {
            padding: 4px 8px;
            font-size: 11px;
        }
        
        /* Preview */
        .preview-content {
            line-height: 1.8;
        }
        .preview-content h1, .preview-content h2, .preview-content h3 { 
            cursor: pointer;
            padding: 4px;
            margin: 16px -4px 8px;
            border-radius: 4px;
        }
        .preview-content h1:hover, .preview-content h2:hover, .preview-content h3:hover { 
            background: #2a2d2e;
        }
        .preview-content h1 { font-size: 28px; border-bottom: 2px solid #3e3e42; padding-bottom: 8px; }
        .preview-content h2 { font-size: 22px; }
        .preview-content h3 { font-size: 18px; }
        .preview-content p {
            margin: 12px 0;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
        }
        .preview-content p:hover {
            background: #2a2d2e;
        }
        
        /* Modal */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        .modal.show { display: flex; }
        .modal-content {
            background: #252526;
            border: 1px solid #3e3e42;
            border-radius: 8px;
            padding: 24px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        .modal-header {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
        }
        .modal-buttons {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            margin-top: 16px;
        }
        
        /* Form */
        label {
            display: block;
            margin-bottom: 4px;
            font-size: 13px;
            margin-top: 12px;
        }
        input[type="text"], input[type="url"], textarea {
            width: 100%;
            padding: 8px;
            background: #2d2d30;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            color: #d4d4d4;
            font-size: 13px;
            font-family: inherit;
        }
        textarea {
            min-height: 100px;
            resize: vertical;
        }
        
        /* Diff view */
        .diff-view {
            margin: 16px 0;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            overflow: hidden;
        }
        .diff-section {
            padding: 12px;
            background: #2d2d30;
            border-bottom: 1px solid #3e3e42;
        }
        .diff-section:last-child { border-bottom: none; }
        .diff-label {
            font-weight: 600;
            font-size: 12px;
            color: #888;
            margin-bottom: 8px;
        }
        .diff-content {
            white-space: pre-wrap;
            font-family: monospace;
            font-size: 13px;
            line-height: 1.5;
        }
        
        .status {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background: #0e639c;
            color: white;
            border-radius: 4px;
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 2000;
        }
        .status.show { opacity: 1; }
        .status.error { background: #c72e2e; }
        .status.success { background: #0e8c3a; }
        
        .loading {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid #fff;
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🌲 TreeTextLLM</h1>
        <div class="header-buttons">
            <button onclick="showSettings()">⚙️ Settings</button>
            <button onclick="showImportOptions()">📤 Import</button>
            <button onclick="exportDocument()">📥 Export JSON</button>
        </div>
    </div>
    
    <div class="container">
        <!-- Outline Panel -->
        <div class="panel outline-panel">
            <div class="panel-header">
                <span>Outline</span>
                <div style="display: flex; gap: 4px;">
                    <button class="small" onclick="addNodeManual()">+ Manual</button>
                    <button class="small" onclick="addNodeWithAI()">✨ AI</button>
                </div>
            </div>
            <div class="panel-content" id="outline"></div>
        </div>
        
        <!-- Editor Panel -->
        <div class="panel editor-panel">
            <div class="panel-header">Editor</div>
            <div class="panel-content">
                <input type="text" class="editor-title" id="nodeTitle" placeholder="Node title..." oninput="saveNode()">
                <textarea class="editor-content" id="nodeContent" placeholder="Start writing..." oninput="saveNode()"></textarea>
                <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
                    <button onclick="transformWithLLM()">✨ Transform with AI</button>
                    <button class="secondary" onclick="saveNode()">💾 Save</button>
                </div>
            </div>
        </div>
        
        <!-- Preview Panel -->
        <div class="panel preview-panel">
            <div class="panel-header">
                <span>Preview</span>
                <button class="small" onclick="exportMarkdown()">📄 Export MD</button>
            </div>
            <div class="panel-content preview-content" id="preview"></div>
        </div>
    </div>
    
    <!-- Settings Modal -->
    <div class="modal" id="settingsModal">
        <div class="modal-content">
            <div class="modal-header">Settings</div>
            <label>LLM API Base URL</label>
            <input type="url" id="apiBaseUrl" placeholder="http://localhost:8080/v1">
            <label>Model Name</label>
            <input type="text" id="modelName" placeholder="gpt-3.5-turbo">
            <div class="modal-buttons">
                <button class="secondary" onclick="hideModal('settingsModal')">Cancel</button>
                <button onclick="saveSettings()">Save</button>
            </div>
        </div>
    </div>
    
    <!-- Add Node with AI Modal -->
    <div class="modal" id="aiNodeModal">
        <div class="modal-content">
            <div class="modal-header">Create Node with AI</div>
            <label>Describe what you want the node to be about:</label>
            <textarea id="aiNodeIntent" placeholder="e.g., A section about climate change impacts on agriculture"></textarea>
            <div class="modal-buttons">
                <button class="secondary" onclick="hideModal('aiNodeModal')">Cancel</button>
                <button onclick="createNodeWithAI()">✨ Generate</button>
            </div>
        </div>
    </div>
    
    <!-- Transform with AI Modal -->
    <div class="modal" id="transformModal">
        <div class="modal-content">
            <div class="modal-header">Transform Text with AI</div>
            <label>Transformation instruction:</label>
            <textarea id="transformPrompt" placeholder="e.g., Make this more concise, Rewrite in a professional tone, Add more detail"></textarea>
            <div id="diffContainer" style="display: none;">
                <label>Preview Changes:</label>
                <div class="diff-view">
                    <div class="diff-section">
                        <div class="diff-label">ORIGINAL</div>
                        <div class="diff-content" id="diffOriginal"></div>
                    </div>
                    <div class="diff-section">
                        <div class="diff-label">TRANSFORMED</div>
                        <div class="diff-content" id="diffTransformed"></div>
                    </div>
                </div>
            </div>
            <div class="modal-buttons">
                <button class="secondary" onclick="hideModal('transformModal')">Cancel</button>
                <button id="transformButton" onclick="executeTransform()">✨ Transform</button>
                <button id="acceptButton" style="display: none;" class="success" onclick="acceptTransform()">✅ Accept</button>
            </div>
        </div>
    </div>
    
    <!-- Import Options Modal -->
    <div class="modal" id="importModal">
        <div class="modal-content">
            <div class="modal-header">Import</div>
            <button style="width: 100%; margin: 8px 0;" onclick="importJSON()">📄 Import JSON Document</button>
            <button style="width: 100%; margin: 8px 0;" onclick="importMarkdownFiles()">📝 Import Markdown Files</button>
            <div class="modal-buttons">
                <button class="secondary" onclick="hideModal('importModal')">Cancel</button>
            </div>
        </div>
    </div>
    
    <!-- Status -->
    <div class="status" id="status"></div>
    
    <script>
        let state = { documents: [], activeDocId: null, activeNodeId: null };
        let settings = {};
        let saveTimeout = null;
        let transformedContent = null;
        
        // Initialize
        async function init() {
            await loadState();
            await loadSettings();
            renderOutline();
            renderEditor();
            renderPreview();
        }
        
        // API calls
        async function loadState() {
            const res = await fetch('/api/documents');
            state = await res.json();
        }
        
        async function saveState() {
            await fetch('/api/documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state)
            });
            showStatus('Saved', 'success');
        }
        
        async function loadSettings() {
            const res = await fetch('/api/settings');
            settings = await res.json();
        }
        
        async function saveSettingsAPI() {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
        }
        
        // Get active document and node
        function getActiveDoc() {
            return state.documents.find(d => d.id === state.activeDocId);
        }
        
        function getNode(nodeId) {
            const doc = getActiveDoc();
            return doc ? doc.nodes[nodeId] : null;
        }
        
        function findNodeParent(nodeId, parentId = null) {
            const doc = getActiveDoc();
            if (!doc) return null;
            
            if (parentId === null) {
                parentId = doc.rootNodeId;
            }
            
            const node = doc.nodes[parentId];
            if (!node) return null;
            
            if (node.children && node.children.includes(nodeId)) {
                return parentId;
            }
            
            for (const childId of node.children || []) {
                const result = findNodeParent(nodeId, childId);
                if (result) return result;
            }
            
            return null;
        }
        
        // Render functions
        function renderOutline() {
            const doc = getActiveDoc();
            if (!doc) {
                document.getElementById('outline').innerHTML = '<p>No document selected</p>';
                return;
            }
            
            const rootNode = doc.nodes[doc.rootNodeId];
            document.getElementById('outline').innerHTML = renderNode(rootNode, null);
        }
        
        function renderNode(node, parentId) {
            if (!node) return '';
            const isActive = node.id === state.activeNodeId ? 'active' : '';
            const doc = getActiveDoc();
            const isRoot = node.id === doc.rootNodeId;
            
            let html = `
                <div class="tree-node ${isActive}" ondblclick="selectNode('${node.id}')">
                    <span>📄</span>
                    <span class="node-title">${escapeHtml(node.title || 'Untitled')}</span>
                    <div class="node-controls">
                        ${!isRoot ? `<button class="small" onclick="event.stopPropagation(); moveNodeUp('${node.id}')">↑</button>` : ''}
                        ${!isRoot ? `<button class="small" onclick="event.stopPropagation(); moveNodeDown('${node.id}')">↓</button>` : ''}
                        ${!isRoot ? `<button class="small" onclick="event.stopPropagation(); indentNode('${node.id}')">→</button>` : ''}
                        ${!isRoot ? `<button class="small" onclick="event.stopPropagation(); outdentNode('${node.id}')">←</button>` : ''}
                        <button class="small" onclick="event.stopPropagation(); addChildNode('${node.id}')">+</button>
                        ${!isRoot ? `<button class="small danger" onclick="event.stopPropagation(); deleteNode('${node.id}')">×</button>` : ''}
                    </div>
                </div>
            `;
            
            if (node.children && node.children.length > 0) {
                html += '<div class="tree-children">';
                for (const childId of node.children) {
                    html += renderNode(doc.nodes[childId], node.id);
                }
                html += '</div>';
            }
            
            return html;
        }
        
        function renderEditor() {
            const node = getNode(state.activeNodeId);
            if (node) {
                document.getElementById('nodeTitle').value = node.title || '';
                document.getElementById('nodeContent').value = node.content || '';
            } else {
                document.getElementById('nodeTitle').value = '';
                document.getElementById('nodeContent').value = '';
            }
        }
        
        function renderPreview() {
            const doc = getActiveDoc();
            if (!doc) {
                document.getElementById('preview').innerHTML = '<p>No document</p>';
                return;
            }
            
            const rootNode = doc.nodes[doc.rootNodeId];
            document.getElementById('preview').innerHTML = renderNodePreview(rootNode, 1);
        }
        
        function renderNodePreview(node, level) {
            if (!node) return '';
            const tag = `h${Math.min(level, 6)}`;
            let html = `<${tag} onclick="selectNode('${node.id}')">${escapeHtml(node.title || 'Untitled')}</${tag}>`;
            if (node.content) {
                html += `<p onclick="selectNode('${node.id}')">${escapeHtml(node.content)}</p>`;
            }
            
            if (node.children && node.children.length > 0) {
                const doc = getActiveDoc();
                for (const childId of node.children) {
                    html += renderNodePreview(doc.nodes[childId], level + 1);
                }
            }
            
            return html;
        }
        
        // Node operations
        function selectNode(nodeId) {
            state.activeNodeId = nodeId;
            renderOutline();
            renderEditor();
        }
        
        function addNodeManual() {
            addChildNode(getActiveDoc().rootNodeId);
        }
        
        function addChildNode(parentId) {
            const doc = getActiveDoc();
            if (!doc) return;
            
            const nodeId = generateId();
            const newNode = {
                id: nodeId,
                title: 'New Node',
                content: '',
                children: []
            };
            
            doc.nodes[nodeId] = newNode;
            const parentNode = doc.nodes[parentId];
            if (!parentNode.children) parentNode.children = [];
            parentNode.children.push(nodeId);
            
            state.activeNodeId = nodeId;
            saveState();
            renderOutline();
            renderEditor();
            renderPreview();
        }
        
        function deleteNode(nodeId) {
            if (!confirm('Delete this node and all its children?')) return;
            
            const doc = getActiveDoc();
            if (!doc || nodeId === doc.rootNodeId) return;
            
            // Remove from parent's children
            for (const node of Object.values(doc.nodes)) {
                if (node.children) {
                    node.children = node.children.filter(id => id !== nodeId);
                }
            }
            
            // Delete node and all children recursively
            function deleteRecursive(id) {
                const node = doc.nodes[id];
                if (node && node.children) {
                    for (const childId of node.children) {
                        deleteRecursive(childId);
                    }
                }
                delete doc.nodes[id];
            }
            
            deleteRecursive(nodeId);
            
            if (state.activeNodeId === nodeId) {
                state.activeNodeId = doc.rootNodeId;
            }
            
            saveState();
            renderOutline();
            renderEditor();
            renderPreview();
        }
        
        function moveNodeUp(nodeId) {
            const doc = getActiveDoc();
            const parentId = findNodeParent(nodeId);
            if (!parentId) return;
            
            const parent = doc.nodes[parentId];
            const index = parent.children.indexOf(nodeId);
            if (index > 0) {
                parent.children.splice(index, 1);
                parent.children.splice(index - 1, 0, nodeId);
                saveState();
                renderOutline();
                renderPreview();
            }
        }
        
        function moveNodeDown(nodeId) {
            const doc = getActiveDoc();
            const parentId = findNodeParent(nodeId);
            if (!parentId) return;
            
            const parent = doc.nodes[parentId];
            const index = parent.children.indexOf(nodeId);
            if (index < parent.children.length - 1) {
                parent.children.splice(index, 1);
                parent.children.splice(index + 1, 0, nodeId);
                saveState();
                renderOutline();
                renderPreview();
            }
        }
        
        function indentNode(nodeId) {
            const doc = getActiveDoc();
            const parentId = findNodeParent(nodeId);
            if (!parentId) return;
            
            const parent = doc.nodes[parentId];
            const index = parent.children.indexOf(nodeId);
            if (index > 0) {
                const newParentId = parent.children[index - 1];
                const newParent = doc.nodes[newParentId];
                
                parent.children.splice(index, 1);
                if (!newParent.children) newParent.children = [];
                newParent.children.push(nodeId);
                
                saveState();
                renderOutline();
                renderPreview();
            }
        }
        
        function outdentNode(nodeId) {
            const doc = getActiveDoc();
            const parentId = findNodeParent(nodeId);
            if (!parentId || parentId === doc.rootNodeId) return;
            
            const grandparentId = findNodeParent(parentId);
            if (!grandparentId) return;
            
            const parent = doc.nodes[parentId];
            const grandparent = doc.nodes[grandparentId];
            
            const indexInParent = parent.children.indexOf(nodeId);
            const parentIndexInGrandparent = grandparent.children.indexOf(parentId);
            
            parent.children.splice(indexInParent, 1);
            grandparent.children.splice(parentIndexInGrandparent + 1, 0, nodeId);
            
            saveState();
            renderOutline();
            renderPreview();
        }
        
        function saveNode() {
            const node = getNode(state.activeNodeId);
            if (!node) return;
            
            node.title = document.getElementById('nodeTitle').value;
            node.content = document.getElementById('nodeContent').value;
            
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                saveState();
                renderOutline();
                renderPreview();
            }, 1000);
        }
        
        // AI features
        function addNodeWithAI() {
            document.getElementById('aiNodeIntent').value = '';
            showModal('aiNodeModal');
        }
        
        async function createNodeWithAI() {
            const intent = document.getElementById('aiNodeIntent').value.trim();
            if (!intent) {
                showStatus('Please enter a description', 'error');
                return;
            }
            
            hideModal('aiNodeModal');
            showStatus('Creating with AI...', 'info');
            
            try {
                const res = await fetch('/api/create-node', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        intent: intent,
                        apiBaseUrl: settings.apiBaseUrl,
                        model: settings.model
                    })
                });
                
                const data = await res.json();
                if (data.error) {
                    showStatus('AI Error: ' + data.error, 'error');
                    console.error('AI Error:', data.error);
                    return;
                }
                
                // Create the node
                const doc = getActiveDoc();
                const nodeId = generateId();
                const newNode = {
                    id: nodeId,
                    title: data.title,
                    content: data.content,
                    children: []
                };
                
                doc.nodes[nodeId] = newNode;
                const rootNode = doc.nodes[doc.rootNodeId];
                rootNode.children.push(nodeId);
                
                state.activeNodeId = nodeId;
                await saveState();
                renderOutline();
                renderEditor();
                renderPreview();
                showStatus('Node created with AI!', 'success');
            } catch (e) {
                showStatus('Error: ' + e.message, 'error');
                console.error('Error:', e);
            }
        }
        
        function transformWithLLM() {
            const node = getNode(state.activeNodeId);
            if (!node || !node.content) {
                showStatus('No content to transform', 'error');
                return;
            }
            
            document.getElementById('transformPrompt').value = '';
            document.getElementById('diffContainer').style.display = 'none';
            document.getElementById('transformButton').style.display = '';
            document.getElementById('acceptButton').style.display = 'none';
            transformedContent = null;
            showModal('transformModal');
        }
        
        async function executeTransform() {
            const node = getNode(state.activeNodeId);
            const prompt = document.getElementById('transformPrompt').value.trim();
            
            if (!prompt) {
                showStatus('Please enter a transformation instruction', 'error');
                return;
            }
            
            document.getElementById('transformButton').innerHTML = '<span class="loading"></span> Transforming...';
            document.getElementById('transformButton').disabled = true;
            
            try {
                const res = await fetch('/api/transform', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: node.content,
                        prompt: prompt,
                        apiBaseUrl: settings.apiBaseUrl,
                        model: settings.model
                    })
                });
                
                const data = await res.json();
                if (data.error) {
                    showStatus('AI Error: ' + data.error, 'error');
                    console.error('AI Error:', data.error);
                    document.getElementById('transformButton').innerHTML = '✨ Transform';
                    document.getElementById('transformButton').disabled = false;
                    return;
                }
                
                transformedContent = data.content;
                
                // Show diff
                document.getElementById('diffOriginal').textContent = node.content;
                document.getElementById('diffTransformed').textContent = transformedContent;
                document.getElementById('diffContainer').style.display = 'block';
                document.getElementById('transformButton').style.display = 'none';
                document.getElementById('acceptButton').style.display = '';
                
            } catch (e) {
                showStatus('Error: ' + e.message, 'error');
                console.error('Error:', e);
                document.getElementById('transformButton').innerHTML = '✨ Transform';
                document.getElementById('transformButton').disabled = false;
            }
        }
        
        function acceptTransform() {
            if (transformedContent) {
                document.getElementById('nodeContent').value = transformedContent;
                saveNode();
                hideModal('transformModal');
                showStatus('Transform applied!', 'success');
            }
        }
        
        // Settings
        function showSettings() {
            document.getElementById('apiBaseUrl').value = settings.apiBaseUrl || '';
            document.getElementById('modelName').value = settings.model || '';
            showModal('settingsModal');
        }
        
        function saveSettings() {
            settings.apiBaseUrl = document.getElementById('apiBaseUrl').value;
            settings.model = document.getElementById('modelName').value;
            saveSettingsAPI();
            hideModal('settingsModal');
            showStatus('Settings saved', 'success');
        }
        
        // Import/Export
        function showImportOptions() {
            showModal('importModal');
        }
        
        function importJSON() {
            hideModal('importModal');
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                const text = await file.text();
                const doc = JSON.parse(text);
                state.documents.push(doc);
                state.activeDocId = doc.id;
                state.activeNodeId = doc.rootNodeId;
                await saveState();
                renderOutline();
                renderEditor();
                renderPreview();
                showStatus('Document imported', 'success');
            };
            input.click();
        }
        
        function importMarkdownFiles() {
            hideModal('importModal');
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.md,.txt';
            input.multiple = true;
            input.onchange = async (e) => {
                const files = Array.from(e.target.files);
                const doc = getActiveDoc();
                if (!doc) return;
                
                const rootNode = doc.nodes[doc.rootNodeId];
                
                for (const file of files) {
                    const content = await file.text();
                    const nodeId = generateId();
                    const title = file.name.replace(/\.(md|txt)$/, '');
                    
                    const newNode = {
                        id: nodeId,
                        title: title,
                        content: content,
                        children: []
                    };
                    
                    doc.nodes[nodeId] = newNode;
                    rootNode.children.push(nodeId);
                }
                
                await saveState();
                renderOutline();
                renderPreview();
                showStatus(`Imported ${files.length} file(s)`, 'success');
            };
            input.click();
        }
        
        function exportDocument() {
            const doc = getActiveDoc();
            if (!doc) return;
            
            const dataStr = JSON.stringify(doc, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${doc.name}.json`;
            a.click();
        }
        
        async function exportMarkdown() {
            const doc = getActiveDoc();
            if (!doc) return;
            
            const res = await fetch('/api/export-markdown', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ document: doc })
            });
            
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${doc.name}.md`;
            a.click();
        }
        
        // Modal helpers
        function showModal(modalId) {
            document.getElementById(modalId).classList.add('show');
        }
        
        function hideModal(modalId) {
            document.getElementById(modalId).classList.remove('show');
        }
        
        // Utilities
        function generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function showStatus(message, type = 'info') {
            const status = document.getElementById('status');
            status.textContent = message;
            status.className = 'status show ' + type;
            setTimeout(() => status.classList.remove('show'), 3000);
        }
        
        // Initialize on load
        init();
    </script>
</body>
</html>
"""

# API Routes
@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route('/api/documents', methods=['GET', 'POST'])
def documents():
    if request.method == 'GET':
        data = load_docs()
        if not data['activeDocId'] and data['documents']:
            data['activeDocId'] = data['documents'][0]['id']
            data['activeNodeId'] = data['documents'][0]['rootNodeId']
        return jsonify(data)
    else:
        data = request.json
        save_docs(data)
        return jsonify({"success": True})

@app.route('/api/settings', methods=['GET', 'POST'])
def settings():
    if request.method == 'GET':
        return jsonify(load_settings())
    else:
        data = request.json
        save_settings(data)
        return jsonify({"success": True})

@app.route('/api/create-node', methods=['POST'])
def create_node():
    """Create a node with AI-generated title and content"""
    data = request.json
    try:
        response = requests.post(
            f"{data['apiBaseUrl']}/chat/completions",
            json={
                "model": data['model'],
                "messages": [
                    {"role": "system", "content": "You are a helpful writing assistant. Generate a title and initial content for a document node based on the user's intent. Respond ONLY with valid JSON in this format: {\"title\": \"...\", \"content\": \"...\"}"},
                    {"role": "user", "content": f"Create a node about: {data['intent']}"}
                ]
            },
            timeout=30
        )
        result = response.json()
        ai_text = result['choices'][0]['message']['content']
        
        # Try to parse as JSON
        try:
            # Remove markdown code blocks if present
            ai_text = ai_text.strip()
            if ai_text.startswith('```'):
                ai_text = ai_text.split('\n', 1)[1]
                ai_text = ai_text.rsplit('```', 1)[0]
            
            parsed = json.loads(ai_text)
            return jsonify(parsed)
        except:
            # If not valid JSON, use the text as content
            return jsonify({
                "title": data['intent'][:50],
                "content": ai_text
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/transform', methods=['POST'])
def transform():
    """Transform text with AI"""
    data = request.json
    try:
        response = requests.post(
            f"{data['apiBaseUrl']}/chat/completions",
            json={
                "model": data['model'],
                "messages": [
                    {"role": "system", "content": "You are a helpful writing assistant. Transform the user's text according to their instructions. Return ONLY the transformed text, no preamble or explanation."},
                    {"role": "user", "content": f"Transform this text: {data['content']}\n\nInstruction: {data['prompt']}"}
                ]
            },
            timeout=30
        )
        result = response.json()
        content = result['choices'][0]['message']['content']
        return jsonify({"content": content})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/export-markdown', methods=['POST'])
def export_markdown():
    """Export document as Markdown"""
    doc = request.json['document']
    
    def node_to_markdown(node, level=1):
        md = f"{'#' * level} {node['title']}\n\n"
        if node.get('content'):
            md += f"{node['content']}\n\n"
        if 'children' in node and node['children']:
            for child_id in node['children']:
                child = doc['nodes'][child_id]
                md += node_to_markdown(child, level + 1)
        return md
    
    root_node = doc['nodes'][doc['rootNodeId']]
    markdown = node_to_markdown(root_node)
    
    # Save to temp file
    temp_file = DATA_DIR / f"{doc['name']}.md"
    temp_file.write_text(markdown)
    
    return send_file(temp_file, as_attachment=True, download_name=f"{doc['name']}.md")

if __name__ == '__main__':
    print("=" * 60)
    print("🌲 TreeTextLLM - Complete Python Edition")
    print("=" * 60)
    print()
    print("Features:")
    print("✅ Three-panel interface (Outline, Editor, Preview)")
    print("✅ Hierarchical tree structure")
    print("✅ Drag/reorder nodes (↑↓→← buttons)")
    print("✅ Double-click to open nodes")
    print("✅ Click preview text to navigate")
    print("✅ Smart Node Creation with AI")
    print("✅ Text Transformation with AI + Diff view")
    print("✅ Import/Export JSON and Markdown")
    print("✅ Import multiple files")
    print("✅ Auto-save")
    print()
    print("Starting server...")
    print("Open: http://localhost:5000")
    print()
    print("Data stored in:", DATA_DIR.absolute())
    print()
    print("Press Ctrl+C to stop")
    print()
    app.run(debug=True, host='0.0.0.0', port=5000)
