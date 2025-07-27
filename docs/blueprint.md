# **App Name**: Contextual Docs

## Core Features:

- Three-Panel UI: A three-panel UI that includes an outline, editor, and preview.
- Monaco Editor Integration: Uses Monaco Editor for advanced text editing within document nodes.
- Context-Aware Editing: Assists users in real-time as they type by offering context-aware suggestions. Uses the LLM as a tool for content completion, using a local llama.cpp backend.
- Smart Node Creation: Suggests new document nodes based on user intent, leveraging the LLM for content expansion, using a local llama.cpp backend. The LLM will reason whether or not to make a section based on user's desired section.
- Intelligent Document Restructuring: Analyzes document structure and provides suggestions for restructuring, using the LLM to identify areas for improvement, using a local llama.cpp backend.
- Local Data Persistence: Utilizes SQLite with Prisma for local-first data persistence, ensuring data privacy and performance.

## Style Guidelines:

- Primary color: A calm, professional blue (#5DADE2) for clarity and focus.
- Background color: A light gray (#F5F5F5) provides a clean and unobtrusive backdrop, in keeping with a light color scheme. The background is slightly shifted towards blue, maintaining harmony with the primary color.
- Accent color: A contrasting orange (#F39C12) highlights interactive elements and important actions.  It complements the blue hue of the primary color by appearing on the opposite side of the color wheel, and commands more attention due to its greater saturation.
- Headline font: 'Space Grotesk' (sans-serif) for headlines and short amounts of body text, lending a computerized, techy feel.
- Body font: 'Inter' (sans-serif) for body text when longer text is anticipated.
- Code font: 'Source Code Pro' for displaying code snippets within the editor.
- Simple, line-based icons for a modern and minimalist aesthetic.
- Clear, hierarchical layout with consistent spacing for readability and ease of navigation.