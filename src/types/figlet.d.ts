declare module 'figlet' {
  export interface FigletOptions {
    font?: string;
    horizontalLayout?: 'default' | 'full' | 'fitted' | 'controlled smushing' | 'universal smushing';
    verticalLayout?: 'default' | 'full' | 'fitted' | 'controlled smushing' | 'universal smushing';
    width?: number;
    whitespaceBreak?: boolean;
  }

  export function textSync(text: string, options?: FigletOptions): string;
  export function text(text: string, options?: FigletOptions): Promise<string>;
  export function text(text: string, callback: (error: Error | null, result: string) => void): void;
  export function text(text: string, options: FigletOptions, callback: (error: Error | null, result: string) => void): void;
  
  export function fonts(callback: (error: Error | null, fonts: string[]) => void): void;
  export function fontsSync(): string[];
  
  export function metadata(font: string, callback: (error: Error | null, metadata: any) => void): void;
  export function metadataSync(font: string): any;
}