interface VgpuModelContextTool {
  readonly name: string;
  readonly title?: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly annotations?: {
    readonly readOnlyHint?: boolean;
    readonly untrustedContentHint?: boolean;
  };
  readonly execute: (
    input: Record<string, unknown>,
    options: { readonly signal: AbortSignal },
  ) => unknown | Promise<unknown>;
}

interface VgpuModelContext {
  registerTool(tool: VgpuModelContextTool, options?: { readonly signal?: AbortSignal }): Promise<void>;
}

interface Document {
  readonly modelContext?: VgpuModelContext;
}
