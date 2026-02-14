declare module 'expo-web-browser' {
  export function openBrowserAsync(url: string): Promise<{ type: string }>;
  export function openAuthSessionAsync(
    url: string,
    redirectUrl?: string
  ): Promise<{ type: string; url?: string }>;
  export function dismissBrowser(): void;
}
