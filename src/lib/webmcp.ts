declare global {
  interface Navigator {
    modelContext?: {
      registerTool: (tool: {
        name: string
        description: string
        inputSchema: Record<string, unknown>
        execute: (args: Record<string, unknown>) => Promise<unknown>
      }) => void
    }
  }
}

export function isWebMCPAvailable(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.modelContext?.registerTool
}
