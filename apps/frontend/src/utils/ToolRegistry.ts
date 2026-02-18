import React from 'react';

export interface EditorTool {
    id: string;
    name: string;
    icon: React.ReactNode;
    onActivate: (context: any) => void;
    color?: string;
}

class ToolRegistry {
    private tools: Map<string, EditorTool> = new Map();

    register(tool: EditorTool) {
        this.tools.set(tool.id, tool);
        console.log(`Tool registered: ${tool.name}`);
    }

    getTools(): EditorTool[] {
        return Array.from(this.tools.values());
    }

    getTool(id: string): EditorTool | undefined {
        return this.tools.get(id);
    }
}

export const toolRegistry = new ToolRegistry();
