declare module 'expo-device' {
  export const isDevice: boolean;
  export const brand: string | null;
  export const manufacturer: string | null;
  export const modelName: string | null;
  export const modelId: string | null;
  export const designName: string | null;
  export const productName: string | null;
  export const deviceYearClass: number | null;
  export const totalMemory: number | null;
  export const supportedCpuArchitectures: string[] | null;
  export const osName: string | null;
  export const osVersion: string | null;
  export const osBuildId: string | null;
  export const osInternalBuildId: string | null;
  export const osBuildFingerprint: string | null;
  export const platformApiLevel: number | null;
  export const deviceName: string | null;
  export enum DeviceType {
    UNKNOWN = 0,
    PHONE = 1,
    TABLET = 2,
    DESKTOP = 3,
    TV = 4,
  }
  export function getDeviceTypeAsync(): Promise<DeviceType>;
}
