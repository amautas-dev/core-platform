/** Presets recomendados para el campo `fontFamily` (Platform settings). */
export interface FontPreset {
  id: string;
  /** Etiqueta corta en UI */
  name: string;
  /** Valor CSS completo para `font-family` */
  fontFamily: string;
}

export const FONT_PRESETS: FontPreset[] = [
  { id: 'inter', name: 'Inter', fontFamily: 'Inter, system-ui, sans-serif' },
  { id: 'roboto', name: 'Roboto', fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif' },
  { id: 'ibm-plex', name: 'IBM Plex Sans', fontFamily: '"IBM Plex Sans", sans-serif' },
  { id: 'source-sans-3', name: 'Source Sans 3', fontFamily: '"Source Sans 3", sans-serif' },
  { id: 'open-sans', name: 'Open Sans', fontFamily: '"Open Sans", sans-serif' },
  { id: 'plus-jakarta', name: 'Plus Jakarta Sans', fontFamily: '"Plus Jakarta Sans", sans-serif' },
];
