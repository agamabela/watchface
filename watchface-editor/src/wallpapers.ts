// Curated watchface background textures & gradients
export interface WallpaperPreset {
  id: string
  name: string
  thumbnailColor: string
  dataUrl: string
}

// Generate high quality SVG data URLs for instant crisp rendering
const svgToDataUrl = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`

export const wallpaperPresets: WallpaperPreset[] = [
  {
    id: 'carbon-fiber',
    name: 'Carbon Fiber',
    thumbnailColor: '#1c1f26',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="410" height="502" viewBox="0 0 410 502">
        <rect width="410" height="502" fill="#0d0f14"/>
        <defs>
          <pattern id="carbon" width="16" height="16" patternUnits="userSpaceOnUse">
            <rect width="16" height="16" fill="#0d0f14"/>
            <polygon points="0,0 8,0 0,8" fill="#181c24"/>
            <polygon points="8,8 16,8 8,16" fill="#181c24"/>
            <polygon points="8,0 16,8 16,0" fill="#12151c"/>
            <polygon points="0,8 8,16 0,16" fill="#12151c"/>
            <line x1="0" y1="0" x2="16" y2="16" stroke="#252b38" stroke-width="0.75" opacity="0.4"/>
          </pattern>
        </defs>
        <rect width="410" height="502" fill="url(#carbon)"/>
        <radialGradient id="vignette" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.75"/>
        </radialGradient>
        <rect width="410" height="502" fill="url(#vignette)"/>
      </svg>
    `),
  },
  {
    id: 'obsidian-glow',
    name: 'Deep Obsidian',
    thumbnailColor: '#0f172a',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="410" height="502" viewBox="0 0 410 502">
        <defs>
          <radialGradient id="glow" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#1e293b"/>
            <stop offset="60%" stop-color="#090d16"/>
            <stop offset="100%" stop-color="#020408"/>
          </radialGradient>
        </defs>
        <rect width="410" height="502" fill="url(#glow)"/>
        <circle cx="205" cy="150" r="160" fill="#38bdf8" opacity="0.04" filter="blur(40px)"/>
      </svg>
    `),
  },
  {
    id: 'cyber-grid',
    name: 'Cyberpunk Grid',
    thumbnailColor: '#031726',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="410" height="502" viewBox="0 0 410 502">
        <rect width="410" height="502" fill="#040810"/>
        <defs>
          <linearGradient id="grid-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.2"/>
            <stop offset="70%" stop-color="#00f0ff" stop-opacity="0.05"/>
            <stop offset="100%" stop-color="#000" stop-opacity="0.8"/>
          </linearGradient>
        </defs>
        <!-- Horizontal grid lines -->
        <g stroke="url(#grid-fade)" stroke-width="1" opacity="0.6">
          <line x1="0" y1="50" x2="410" y2="50"/>
          <line x1="0" y1="100" x2="410" y2="100"/>
          <line x1="0" y1="160" x2="410" y2="160"/>
          <line x1="0" y1="230" x2="410" y2="230"/>
          <line x1="0" y1="310" x2="410" y2="310"/>
          <line x1="0" y1="400" x2="410" y2="400"/>
        </g>
        <!-- Perspective lines -->
        <g stroke="#00f0ff" stroke-width="1" opacity="0.15">
          <line x1="205" y1="40" x2="0" y2="502"/>
          <line x1="205" y1="40" x2="80" y2="502"/>
          <line x1="205" y1="40" x2="160" y2="502"/>
          <line x1="205" y1="40" x2="250" y2="502"/>
          <line x1="205" y1="40" x2="330" y2="502"/>
          <line x1="205" y1="40" x2="410" y2="502"/>
        </g>
      </svg>
    `),
  },
  {
    id: 'sunset-dusk',
    name: 'Tokyo Sunset',
    thumbnailColor: '#3b0764',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="410" height="502" viewBox="0 0 410 502">
        <defs>
          <linearGradient id="sunset" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#18072b"/>
            <stop offset="45%" stop-color="#3b0764"/>
            <stop offset="75%" stop-color="#701a75"/>
            <stop offset="100%" stop-color="#f43f5e"/>
          </linearGradient>
        </defs>
        <rect width="410" height="502" fill="url(#sunset)"/>
        <circle cx="205" cy="380" r="90" fill="#fbbf24" opacity="0.35"/>
      </svg>
    `),
  },
  {
    id: 'tactical-topo',
    name: 'Tactical Topo',
    thumbnailColor: '#141d16',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="410" height="502" viewBox="0 0 410 502">
        <rect width="410" height="502" fill="#0b100c"/>
        <g fill="none" stroke="#22c55e" stroke-width="1.2" opacity="0.18">
          <path d="M-20,120 Q100,80 205,140 T430,110"/>
          <path d="M-20,170 Q110,130 205,190 T430,160"/>
          <path d="M-20,220 Q120,180 205,240 T430,210"/>
          <path d="M-20,270 Q130,230 205,290 T430,260"/>
          <path d="M-20,320 Q140,280 205,340 T430,310"/>
          <path d="M-20,370 Q150,330 205,390 T430,360"/>
          <path d="M-20,420 Q160,380 205,440 T430,410"/>
        </g>
      </svg>
    `),
  },
]
