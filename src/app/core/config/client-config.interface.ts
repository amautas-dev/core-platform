import { ProjectConfig } from './project-config.interface';

/**
 * Configuración de branding del cliente
 */
export interface ClientBranding {
  nombre: string;              // Nombre del cliente/sistema
  logoUrl?: string;            // URL del logo principal
  logoAltUrl?: string;         // Logo alternativo
  logoReducUrl?: string;        // Logo reducido
  faviconUrl?: string;         // Favicon
  loginHeroUrl?: string;       // Imagen de fondo del login
}

/**
 * Configuración de colores del cliente
 */
export interface ClientColors {
  primary: string;             // Color primario (#1f6feb)
  primaryHover: string;        // Hover del primario
  onPrimary: string;           // Color de texto sobre primario
  secondary: string;           // Color secundario
  secondaryHover: string;
  onSecondary: string;
  tertiary: string;            // Color terciario
  tertiaryHover: string;
  onTertiary: string;
  success: string;             // Éxito
  onSuccess: string;
  warning: string;             // Advertencia
  onWarning: string;
  error: string;               // Error
  onError: string;
  background: string;          // Fondo principal
  surface: string;             // Superficie
  onSurface: string;           // Texto sobre superficie
  surfaceVariant: string;     // Variante de superficie
  tableHeader: string;         // Header de tablas
  divider: string;             // Divisores
}

/**
 * Configuración de tipografía
 */
export interface ClientTypography {
  fontFamily: string;          // 'Roboto', 'Inter', 'Arial', etc.
  fontSizeBase: string;        // '16px'
  fontWeightNormal: number;   // 400
  fontWeightMedium: number;   // 500
  fontWeightBold: number;       // 700
}

/**
 * Configuración completa del cliente (white-label)
 */
export interface ClientConfig {
  idCliente?: number;          // ID del cliente (si se guarda en BD)
  branding: ClientBranding;
  colors: ClientColors;
  typography: ClientTypography;
  projectConfig: ProjectConfig; // Configuración de módulos/entidades
  fechaCreacion?: string;
  fechaModificacion?: string;
  idUsuarioModificacion?: number;
}

/**
 * Configuración por defecto (valores iniciales)
 */
export const DEFAULT_CLIENT_CONFIG: Omit<ClientConfig, 'projectConfig'> = {
  branding: {
    nombre: 'Sistema Administrativo',
    logoUrl: 'assets/brand/amautas-logo.png',
    logoAltUrl: 'assets/brand/amautas-logo-alt.png',
    logoReducUrl: 'assets/brand/amautas-logo-reduc.png',
    faviconUrl: 'assets/favicon.ico',
    loginHeroUrl: 'assets/login/portada.png',
  },
  colors: {
    primary: '#1f6feb',
    primaryHover: '#1e66d3',
    onPrimary: '#ffffff',
    secondary: '#4dd2f0',
    secondaryHover: '#3fc6e5',
    onSecondary: '#ffffff',
    tertiary: '#005b96',
    tertiaryHover: '#004470',
    onTertiary: '#ffffff',
    success: '#2e7d32',
    onSuccess: '#ffffff',
    warning: '#f9a825',
    onWarning: '#0f2f3a',
    error: '#d32f2f',
    onError: '#ffffff',
    background: '#fbf1e8',
    surface: '#ffffff',
    onSurface: '#0f2f3a',
    surfaceVariant: '#f4f8f9',
    tableHeader: '#fbf1e8',
    divider: '#dbe7ec',
  },
  typography: {
    fontFamily: 'Roboto, "Helvetica Neue", sans-serif',
    fontSizeBase: '16px',
    fontWeightNormal: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
  },
};
