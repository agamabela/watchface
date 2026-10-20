import React, { useEffect, useRef, useState } from 'react'
import { Circle, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text as KonvaText } from 'react-konva'
import {
  Activity,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Battery,
  Bluetooth,
  Calendar,
  Check,
  Clock,
  Copy,
  Download,
  Eye,
  EyeOff,
  Flame,
  Heart,
  Image as ImageIcon,
  Layers,
  Lock,
  Palette,
  Plus,
  Redo2,
  Sliders,
  Sparkles,
  Sun,
  Trash2,
  Type,
  Undo2,
  Unlock,
  Upload,
  Watch,
  X,
} from 'lucide-react'
import type {
  DigitalTimeElement,
  AnalogTimeElement,
  ShapeElement,
  TextElement,
  WatchElement,
  WidgetMetric,
} from './schema'
import {
  createWidgetElement,
  createAnalogClockElement,
  presets,
  watchfacePresets,
} from './schema'
import { useEditorStore } from './store'
import { wallpaperPresets } from './wallpapers'
import './App.css'

const makeId = () => crypto.randomUUID()

// Helper to render background image in Konva
function KonvaBgImage({ src, width, height }: { src: string; width: number; height: number }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!src) return
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = src
    img.onload = () => setImage(img)
  }, [src])

  if (!image) return null
  return <KonvaImage image={image} width={width} height={height} />
}

export default function App() {
  const {
    project,
    selectedId,
    select,
    updateElement,
    addElement,
    commit,
    undo,
    redo,
    past,
    future,
  } = useEditorStore()

  const [activeTab, setActiveTab] = useState<'components' | 'layers'>('components')
  const [zoom, setZoom] = useState(1)
  const [showGrid, setShowGrid] = useState(false)
  const [showSafeArea, setShowSafeArea] = useState(true)
  const [showPresetsModal, setShowPresetsModal] = useState(false)
  const [presetCategoryFilter, setPresetCategoryFilter] = useState<string>('All')
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [installStatus, setInstallStatus] = useState<'idle' | 'pushing' | 'success' | 'error'>('idle')
  const [installError, setInstallError] = useState<string>('')
  const [installLogs, setInstallLogs] = useState<string>('')
  const [showLogDetails, setShowLogDetails] = useState<boolean>(false)
  const [, setClockTick] = useState(0)

  const stageRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ;(window as any).__getProject = () => project
  }, [project])

  const triggerWatchPush = async () => {
    setInstallStatus('pushing')
    setInstallError('')
    setInstallLogs('')
    try {
      const res = await fetch('/api/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      })
      const data = await res.json()
      if (data.success) {
        setInstallStatus('success')
        setInstallLogs(data.stdout || '')
      } else {
        setInstallError(data.error || 'Bluetooth transfer failed')
        setInstallLogs(data.stderr || data.stdout || '')
        setInstallStatus('error')
      }
    } catch (err: any) {
      setInstallError(err.message || 'Error communicating with watch server')
      setInstallStatus('error')
    }
  }

  // Real-time 1-second clock ticker for live watch preview
  useEffect(() => {
    const timer = setInterval(() => setClockTick((tick) => tick + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  // Keyboard shortcuts (Nudge 1px / 10px, Delete, Undo, Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }

      if (!selectedId) return
      const current = project.elements.find((el) => el.id === selectedId)
      if (!current || current.locked) return

      const step = e.shiftKey ? 10 : 1

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        updateElement({ ...current, x: current.x - step })
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        updateElement({ ...current, x: current.x + step })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        updateElement({ ...current, y: current.y - step })
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        updateElement({ ...current, y: current.y + step })
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        commit({
          ...project,
          elements: project.elements.filter((el) => el.id !== current.id),
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, project, updateElement, commit, undo, redo])

  const selected = project.elements.find((el) => el.id === selectedId) ?? null

  const changeSelected = (patch: Partial<WatchElement>) => {
    if (selected) {
      updateElement({ ...selected, ...patch } as WatchElement)
    }
  }

  // Live text calculation for Digital Time
  const getClockString = (el: DigitalTimeElement) => {
    const now = new Date()
    let hour = now.getHours()
    const is12 = el.format === '12h'
    const suffix = is12 ? (hour >= 12 ? ' PM' : ' AM') : ''
    if (is12) hour = hour % 12 || 12

    const sep = el.separator === 'none' ? ' ' : el.separator === 'custom' ? el.customSeparator : ':'
    const hStr = el.leadingZero ? String(hour).padStart(2, '0') : String(hour)
    const mStr = String(now.getMinutes()).padStart(2, '0')
    const sStr = el.showSeconds ? `${sep}${String(now.getSeconds()).padStart(2, '0')}` : ''

    return `${hStr}${sep}${mStr}${sStr}${suffix}`
  }

  // Display text helper
  const getElementDisplayText = (el: WatchElement): string => {
    if (el.type === 'text') return el.text
    if (el.type === 'digitalTime') return getClockString(el)
    if (el.type === 'widget') {
      const iconStr = el.showIcon !== false ? `${el.icon} ` : ''
      return `${iconStr}${el.text}`
    }
    return ''
  }

  // Alignment helpers
  const alignElement = (type: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
    if (!selected) return
    const deviceW = project.device.width
    const deviceH = project.device.height

    if (type === 'left') changeSelected({ x: 30 })
    else if (type === 'center-h') changeSelected({ x: Math.round((deviceW - selected.width) / 2) })
    else if (type === 'right') changeSelected({ x: deviceW - selected.width - 30 })
    else if (type === 'top') changeSelected({ y: 30 })
    else if (type === 'center-v') changeSelected({ y: Math.round((deviceH - selected.height) / 2) })
    else if (type === 'bottom') changeSelected({ y: deviceH - selected.height - 30 })
  }

  // Duplicate & delete
  const duplicateSelected = () => {
    if (!selected) return
    const copy: WatchElement = {
      ...selected,
      id: makeId(),
      name: `${selected.name} Copy`,
      x: Math.min(project.device.width - selected.width, selected.x + 15),
      y: Math.min(project.device.height - selected.height, selected.y + 15),
      zIndex: project.elements.length + 1,
    }
    addElement(copy)
  }

  const deleteSelected = () => {
    if (!selected) return
    commit({
      ...project,
      elements: project.elements.filter((el) => el.id !== selected.id),
    })
  }

  // Add elements
  const addDigitalClock = () => {
    const el: DigitalTimeElement = {
      id: makeId(),
      type: 'digitalTime',
      name: 'Digital Clock',
      x: 35,
      y: 110,
      width: 340,
      height: 85,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      zIndex: project.elements.length + 1,
      showInAOD: true,
      format: '24h',
      showSeconds: false,
      leadingZero: true,
      separator: ':',
      customSeparator: ':',
      style: {
        fontFamily: 'Orbitron',
        fontSize: 72,
        fontWeight: 800,
        color: '#FFFFFF',
        letterSpacing: -2,
        lineHeight: 1,
        textAlign: 'center',
        glow: true,
        glowColor: '#00F0FF',
      },
    }
    addElement(el)
  }

  const addAnalogClock = () => addElement(createAnalogClockElement(project.elements.length + 1))

  const getAnalogHandPoints = (clock: AnalogTimeElement) => {
    const now = new Date()
    const cx = clock.width / 2
    const cy = clock.height / 2
    const radius = Math.min(clock.width, clock.height) / 2
    const pointFor = (degrees: number, length: number) => {
      const radians = (degrees - 90) * Math.PI / 180
      return [cx, cy, cx + Math.cos(radians) * length, cy + Math.sin(radians) * length]
    }
    const seconds = now.getSeconds() + now.getMilliseconds() / 1000
    return {
      center: [cx, cy],
      radius,
      hour: pointFor((now.getHours() % 12) * 30 + now.getMinutes() * 0.5, radius * 0.48),
      minute: pointFor(now.getMinutes() * 6 + seconds * 0.1, radius * 0.7),
      second: pointFor(seconds * 6, radius * 0.76),
    }
  }

  const addCustomText = () => {
    const el: TextElement = {
      id: makeId(),
      type: 'text',
      name: 'Custom Label',
      x: 40,
      y: 310,
      width: 330,
      height: 32,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      zIndex: project.elements.length + 1,
      showInAOD: true,
      text: 'REDMI PRO',
      style: {
        fontFamily: 'Inter',
        fontSize: 16,
        fontWeight: 700,
        color: '#00F0FF',
        letterSpacing: 2,
        lineHeight: 1,
        textAlign: 'center',
      },
    }
    addElement(el)
  }

  const addWidget = (metric: WidgetMetric) => {
    const el = createWidgetElement(metric, project.elements.length + 1)
    addElement(el)
  }

  const addDividerLine = () => {
    const el: ShapeElement = {
      id: makeId(),
      type: 'shape',
      shapeType: 'divider',
      name: 'Divider Line',
      x: 35,
      y: 220,
      width: 340,
      height: 2,
      rotation: 0,
      opacity: 0.6,
      visible: true,
      locked: false,
      zIndex: project.elements.length + 1,
      showInAOD: true,
      fill: '#00F0FF',
    }
    addElement(el)
  }

  const addProgressBar = () => {
    const el: ShapeElement = {
      id: makeId(),
      type: 'shape',
      shapeType: 'progressBar',
      name: 'Progress Bar',
      x: 40,
      y: 240,
      width: 330,
      height: 12,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      zIndex: project.elements.length + 1,
      showInAOD: true,
      fill: '#00F0FF',
      cornerRadius: 6,
      progress: 75,
    }
    addElement(el)
  }

  // Custom photo upload from Mac
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (dataUrl) {
        commit({
          ...project,
          backgroundImage: dataUrl,
          backgroundDarken: project.backgroundDarken ?? 40,
        })
      }
    }
    reader.readAsDataURL(file)
  }

  // Export JSON file
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(project, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-watchface.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export PNG preview
  const handleExportPng = () => {
    if (!stageRef.current) return
    const uri = stageRef.current.toDataURL({ pixelRatio: 2 })
    const a = document.createElement('a')
    a.href = uri
    a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-preview.png`
    a.click()
  }

  // Curated color swatches
  const colorSwatches = [
    '#FFFFFF',
    '#94A3B8',
    '#00F0FF',
    '#10B981',
    '#84CC16',
    '#F59E0B',
    '#FF5E00',
    '#EF4444',
    '#EC4899',
    '#8B5CF6',
  ]

  // Available fonts
  const fontFamilies = [
    { label: 'Orbitron (Cyber / Digital)', value: 'Orbitron' },
    { label: 'Bebas Neue (Bold Sports)', value: 'Bebas Neue' },
    { label: 'JetBrains Mono (Tech Monospace)', value: 'JetBrains Mono' },
    { label: 'Chakra Petch (Modern Sci-Fi)', value: 'Chakra Petch' },
    { label: 'Montserrat (Geometric Modern)', value: 'Montserrat' },
    { label: 'Plus Jakarta Sans (Clean Minimal)', value: 'Plus Jakarta Sans' },
    { label: 'Inter (Crisp System)', value: 'Inter' },
  ]

  return (
    <div className="studio-app">
      {/* ====================================================================
          TOP HEADER
          ==================================================================== */}
      <header className="studio-header">
        <div className="header-left">
          <div className="studio-logo">
            <Watch size={20} color="#00f0ff" />
            <span>Watchface Studio</span>
            <span className="logo-badge">PRO</span>
          </div>

          <input
            className="project-name-input"
            value={project.name}
            onChange={(e) => commit({ ...project, name: e.target.value })}
            placeholder="Watchface Name"
            title="Rename watchface"
          />

          <select
            className="device-badge-select"
            value={project.device.preset}
            onChange={(e) => {
              const selectedPreset = presets[e.target.value as keyof typeof presets]
              if (selectedPreset) commit({ ...project, device: selectedPreset })
            }}
          >
            <option value="redmi-watch-5-lite">Redmi Watch 5 Lite · 410×502</option>
            <option value="redmi-watch-5">Redmi Watch 5 Active · 432×514</option>
            <option value="redmi-watch-6">Redmi Watch 6 · 432×514</option>
            <option value="custom">Custom · 410×502</option>
          </select>
        </div>

        <div className="header-center">
          <button
            className="btn-secondary"
            onClick={() => setShowPresetsModal(true)}
            title="Browse Amazfit-style presets"
          >
            <Sparkles size={14} color="#f59e0b" />
            <span>Styles & Presets</span>
          </button>

          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="icon-btn"
              onClick={undo}
              disabled={!past.length}
              title="Undo (⌘Z)"
            >
              <Undo2 size={15} />
            </button>
            <button
              className="icon-btn"
              onClick={redo}
              disabled={!future.length}
              title="Redo (⇧⌘Z)"
            >
              <Redo2 size={15} />
            </button>
          </div>

          <select
            className="device-badge-select"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            title="Zoom canvas"
          >
            <option value={0.65}>65%</option>
            <option value={0.8}>80%</option>
            <option value={1}>100%</option>
            <option value={1.15}>115%</option>
            <option value={1.3}>130%</option>
          </select>
        </div>

        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 6, background: 'rgba(0, 240, 255, 0.08)', border: '1px solid rgba(0, 240, 255, 0.2)', fontSize: 11, color: '#00f0ff' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00f0ff', display: 'inline-block', boxShadow: '0 0 6px #00f0ff' }} />
            <span>Port 5173 Active</span>
          </div>

          <button className="btn-secondary" onClick={handleExportJson} title="Download .json backup to your Mac">
            <Download size={14} />
            <span>Export JSON</span>
          </button>

          <button className="btn-secondary" onClick={handleExportPng} title="Export 410x502 preview image">
            <ImageIcon size={14} />
            <span>Preview PNG</span>
          </button>

          <button
            className="btn-accent"
            onClick={() => {
              setShowInstallModal(true)
              setInstallStatus('idle')
              setInstallError('')
            }}
            title="Push directly to Redmi Watch via Bluetooth"
            style={{ fontWeight: 700 }}
          >
            <Bluetooth size={15} />
            <span>Push to Watch</span>
          </button>
        </div>
      </header>

      {/* ====================================================================
          MAIN 3-COLUMN WORKSPACE
          ==================================================================== */}
      <main className="studio-main">
        {/* LEFT SIDEBAR: COMPONENTS & LAYERS */}
        <aside className="studio-sidebar sidebar-left">
          <div className="sidebar-tabs">
            <button
              className={`sidebar-tab ${activeTab === 'components' ? 'active' : ''}`}
              onClick={() => setActiveTab('components')}
            >
              <Plus size={14} />
              <span>Add Elements</span>
            </button>
            <button
              className={`sidebar-tab ${activeTab === 'layers' ? 'active' : ''}`}
              onClick={() => setActiveTab('layers')}
            >
              <Layers size={14} />
              <span>Layers ({project.elements.length})</span>
            </button>
          </div>

          <div className="sidebar-content">
            {activeTab === 'components' ? (
              <>
                {/* Time & Clock */}
                <div className="category-group">
                  <div className="category-title">
                    <Clock size={13} />
                    <span>Time & Date</span>
                  </div>
                  <div className="component-card-grid">
                    <button className="component-card cyan" onClick={addDigitalClock}>
                      <div className="component-icon-wrap"><Clock size={16} /></div>
                      <span className="component-name">Digital Clock</span>
                      <span className="component-hint">24h / 12h live time</span>
                    </button>
                    <button className="component-card cyan" onClick={addAnalogClock}>
                      <div className="component-icon-wrap"><Clock size={16} /></div>
                      <span className="component-name">Analog Clock</span>
                      <span className="component-hint">Live hands & seconds</span>
                    </button>
                    <button className="component-card cyan" onClick={() => addWidget('date')}>
                      <div className="component-icon-wrap"><Calendar size={16} /></div>
                      <span className="component-name">Date & Day</span>
                      <span className="component-hint">Live calendar</span>
                    </button>
                  </div>
                </div>

                {/* Health & Fitness */}
                <div className="category-group">
                  <div className="category-title">
                    <Activity size={13} />
                    <span>Health & Fitness</span>
                  </div>
                  <div className="component-card-grid">
                    <button className="component-card emerald" onClick={() => addWidget('steps')}>
                      <div className="component-icon-wrap"><Activity size={16} /></div>
                      <span className="component-name">Steps</span>
                      <span className="component-hint">Counter & goal</span>
                    </button>
                    <button className="component-card rose" onClick={() => addWidget('heartRate')}>
                      <div className="component-icon-wrap"><Heart size={16} /></div>
                      <span className="component-name">Heart Rate</span>
                      <span className="component-hint">BPM pulse sensor</span>
                    </button>
                    <button className="component-card orange" onClick={() => addWidget('calories')}>
                      <div className="component-icon-wrap"><Flame size={16} /></div>
                      <span className="component-name">Calories</span>
                      <span className="component-hint">Active burn KCAL</span>
                    </button>
                  </div>
                </div>

                {/* System & Telemetry */}
                <div className="category-group">
                  <div className="category-title">
                    <Battery size={13} />
                    <span>System & Environment</span>
                  </div>
                  <div className="component-card-grid">
                    <button className="component-card emerald" onClick={() => addWidget('battery')}>
                      <div className="component-icon-wrap"><Battery size={16} /></div>
                      <span className="component-name">Battery</span>
                      <span className="component-hint">Power telemetry</span>
                    </button>
                    <button className="component-card orange" onClick={() => addWidget('weather')}>
                      <div className="component-icon-wrap"><Sun size={16} /></div>
                      <span className="component-name">Weather</span>
                      <span className="component-hint">Temp & condition</span>
                    </button>
                  </div>
                </div>

                {/* Visual Shapes & Text */}
                <div className="category-group">
                  <div className="category-title">
                    <Sliders size={13} />
                    <span>Shapes & Accents</span>
                  </div>
                  <div className="component-card-grid">
                    <button className="component-card" onClick={addProgressBar}>
                      <div className="component-icon-wrap"><Sliders size={16} /></div>
                      <span className="component-name">Progress Bar</span>
                      <span className="component-hint">Horizontal gauge</span>
                    </button>
                    <button className="component-card" onClick={addDividerLine}>
                      <div className="component-icon-wrap"><Sliders size={16} /></div>
                      <span className="component-name">Divider Line</span>
                      <span className="component-hint">Section rule</span>
                    </button>
                    <button className="component-card" onClick={addCustomText}>
                      <div className="component-icon-wrap"><Type size={16} /></div>
                      <span className="component-name">Custom Text</span>
                      <span className="component-hint">Free text label</span>
                    </button>
                  </div>
                </div>

                {/* Background & Wallpaper */}
                <div className="category-group">
                  <div className="category-title">
                    <ImageIcon size={13} />
                    <span>Background & Wallpaper</span>
                  </div>

                  {/* Upload photo from Mac */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoUpload}
                  />
                  <div
                    className="upload-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={18} color="#00f0ff" />
                    <span>Upload photo from your Mac</span>
                  </div>

                  {/* Curated Wallpaper Presets */}
                  <div className="wallpaper-grid">
                    {wallpaperPresets.map((wp) => (
                      <div
                        key={wp.id}
                        className={`wallpaper-thumb ${project.backgroundImage === wp.dataUrl ? 'selected' : ''}`}
                        onClick={() =>
                          commit({
                            ...project,
                            backgroundImage: wp.dataUrl,
                            backgroundDarken: project.backgroundDarken ?? 35,
                          })
                        }
                        title={wp.name}
                      >
                        <img src={wp.dataUrl} alt={wp.name} className="wallpaper-thumb-preview" />
                      </div>
                    ))}
                    {/* Clear wallpaper option */}
                    <div
                      className="wallpaper-thumb"
                      style={{
                        background: '#05070d',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                      onClick={() =>
                        commit({
                          ...project,
                          backgroundImage: undefined,
                        })
                      }
                      title="Solid AMOLED Black"
                    >
                      OLED
                    </div>
                  </div>

                  {/* Darkening / Shade slider */}
                  {project.backgroundImage && (
                    <div className="slider-group">
                      <div className="slider-label">
                        <span>Background Dimming</span>
                        <span>{project.backgroundDarken ?? 40}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="85"
                        value={project.backgroundDarken ?? 40}
                        onChange={(e) =>
                          commit({
                            ...project,
                            backgroundDarken: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Layers Tab */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[...project.elements]
                  .sort((a, b) => b.zIndex - a.zIndex)
                  .map((el) => {
                    const isSelected = el.id === selectedId
                    return (
                      <div
                        key={el.id}
                        className={`layer-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => select(el.id)}
                      >
                        <span className="layer-icon">
                          {el.type === 'digitalTime' && <Clock size={13} />}
                          {el.type === 'analogTime' && <Clock size={13} />}
                          {el.type === 'text' && <Type size={13} />}
                          {el.type === 'widget' && <Activity size={13} />}
                          {el.type === 'shape' && <Sliders size={13} />}
                        </span>
                        <span className="layer-title">{el.name}</span>
                        <div className="layer-actions">
                          <button
                            className="layer-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              updateElement({ ...el, visible: !el.visible })
                            }}
                            title={el.visible ? 'Hide' : 'Show'}
                          >
                            {el.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                          </button>
                          <button
                            className="layer-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              updateElement({ ...el, locked: !el.locked })
                            }}
                            title={el.locked ? 'Unlock' : 'Lock'}
                          >
                            {el.locked ? <Lock size={12} /> : <Unlock size={12} />}
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </aside>

        {/* ====================================================================
            CENTER CANVAS: REALISTIC SMARTWATCH MOCKUP
            ==================================================================== */}
        <section className="studio-canvas-area">
          {/* Floating Canvas Controls */}
          <div className="canvas-floating-bar">
            <label>
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              <span>Grid</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={showSafeArea}
                onChange={(e) => setShowSafeArea(e.target.checked)}
              />
              <span>Safe Area</span>
            </label>
          </div>

          {/* REALISTIC SMARTWATCH ASSEMBLY */}
          <div
            className="smartwatch-assembly"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          >
            {/* Top Strap */}
            <div className="strap-top" />

            {/* Watch Chassis */}
            <div className="smartwatch-case">
              {/* Hardware crown button */}
              <div className="smartwatch-crown" />
              <div className="smartwatch-mic-hole" />

              {/* Screen Bezel */}
              <div
                className="screen-bezel"
                style={{
                  width: project.device.width,
                  height: project.device.height,
                  borderRadius: project.device.cornerRadius,
                }}
              >
                {/* 2.5D Curved Glass Reflection */}
                <div className="glass-reflection-overlay" />

                {/* Konva 2D Stage */}
                <Stage
                  ref={stageRef}
                  width={project.device.width}
                  height={project.device.height}
                  onMouseDown={(e) => {
                    // Click on background deselects
                    if (e.target === e.target.getStage()) {
                      select(null)
                    }
                  }}
                >
                  <Layer>
                    {/* Background Solid Color */}
                    <Rect
                      width={project.device.width}
                      height={project.device.height}
                      fill={project.theme.background || '#05070d'}
                    />

                    {/* Background Wallpaper Image */}
                    {project.backgroundImage && (
                      <KonvaBgImage
                        src={project.backgroundImage}
                        width={project.device.width}
                        height={project.device.height}
                      />
                    )}

                    {/* Background Dimming Overlay */}
                    {project.backgroundImage && (project.backgroundDarken ?? 0) > 0 && (
                      <Rect
                        width={project.device.width}
                        height={project.device.height}
                        fill="#000000"
                        opacity={(project.backgroundDarken ?? 40) / 100}
                      />
                    )}

                    {/* Alignment Grid Lines */}
                    {showGrid &&
                      Array.from({ length: 15 }, (_, i) => (
                        <Rect
                          key={`v${i}`}
                          x={i * 30}
                          y={0}
                          width={1}
                          height={project.device.height}
                          fill="#ffffff"
                          opacity={0.06}
                        />
                      ))}
                    {showGrid &&
                      Array.from({ length: 18 }, (_, i) => (
                        <Rect
                          key={`h${i}`}
                          x={0}
                          y={i * 30}
                          width={project.device.width}
                          height={1}
                          fill="#ffffff"
                          opacity={0.06}
                        />
                      ))}

                    {/* Safe Area Guides */}
                    {showSafeArea && (
                      <Rect
                        x={20}
                        y={20}
                        width={project.device.width - 40}
                        height={project.device.height - 40}
                        stroke="#00f0ff"
                        dash={[6, 6]}
                        opacity={0.4}
                        cornerRadius={project.device.cornerRadius - 12}
                      />
                    )}

                    {/* Watchface Elements */}
                    {project.elements
                      .filter((el) => el.visible)
                      .sort((a, b) => a.zIndex - b.zIndex)
                      .map((element) => {
                        const isSelected = element.id === selectedId

                        if (element.type === 'shape') {
                          const shape = element as ShapeElement
                          if (shape.shapeType === 'progressBar') {
                            const progress = shape.progress ?? 50
                            const fillW = Math.round((shape.width * progress) / 100)
                            return (
                              <Group
                                key={shape.id}
                                x={shape.x}
                                y={shape.y}
                                draggable={!shape.locked}
                                onClick={() => select(shape.id)}
                                onTap={() => select(shape.id)}
                                onDragEnd={(e) =>
                                  updateElement({
                                    ...shape,
                                    x: Math.round(e.target.x()),
                                    y: Math.round(e.target.y()),
                                  })
                                }
                              >
                                {/* Track */}
                                <Rect
                                  width={shape.width}
                                  height={shape.height}
                                  fill={shape.fill}
                                  opacity={0.25}
                                  cornerRadius={shape.cornerRadius ?? 4}
                                />
                                {/* Progress Fill */}
                                <Rect
                                  width={fillW}
                                  height={shape.height}
                                  fill={shape.fill}
                                  opacity={shape.opacity}
                                  cornerRadius={shape.cornerRadius ?? 4}
                                />
                                {isSelected && (
                                  <Rect
                                    x={-2}
                                    y={-2}
                                    width={shape.width + 4}
                                    height={shape.height + 4}
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    cornerRadius={(shape.cornerRadius ?? 4) + 2}
                                  />
                                )}
                              </Group>
                            )
                          }

                          return (
                            <Group
                              key={shape.id}
                              x={shape.x}
                              y={shape.y}
                              draggable={!shape.locked}
                              onClick={() => select(shape.id)}
                              onTap={() => select(shape.id)}
                              onDragEnd={(e) =>
                                updateElement({
                                  ...shape,
                                  x: Math.round(e.target.x()),
                                  y: Math.round(e.target.y()),
                                })
                              }
                            >
                              <Rect
                                width={shape.width}
                                height={shape.height}
                                fill={shape.fill}
                                opacity={shape.opacity}
                                stroke={shape.stroke}
                                strokeWidth={shape.strokeWidth}
                                cornerRadius={shape.cornerRadius ?? 0}
                              />
                              {isSelected && (
                                <Rect
                                  x={-2}
                                  y={-2}
                                  width={shape.width + 4}
                                  height={shape.height + 4}
                                  stroke="#6366f1"
                                  strokeWidth={2}
                                />
                              )}
                            </Group>
                          )
                        }

                        if (element.type === 'image') {
                          return (
                            <Group
                              key={element.id}
                              x={element.x}
                              y={element.y}
                              draggable={!element.locked}
                              onClick={() => select(element.id)}
                              onTap={() => select(element.id)}
                              onDragEnd={(e) =>
                                updateElement({
                                  ...element,
                                  x: Math.round(e.target.x()),
                                  y: Math.round(e.target.y()),
                                })
                              }
                            >
                              <KonvaBgImage src={element.src} width={element.width} height={element.height} />
                              {isSelected && (
                                <Rect
                                  x={-2}
                                  y={-2}
                                  width={element.width + 4}
                                  height={element.height + 4}
                                  stroke="#6366f1"
                                  strokeWidth={2}
                                />
                              )}
                            </Group>
                          )
                        }

                        if (element.type === 'analogTime') {
                          const clock = element as AnalogTimeElement
                          const hands = getAnalogHandPoints(clock)
                          return (
                            <Group
                              key={clock.id}
                              x={clock.x}
                              y={clock.y}
                              draggable={!clock.locked}
                              onClick={() => select(clock.id)}
                              onTap={() => select(clock.id)}
                              onDragEnd={(e) => updateElement({ ...clock, x: Math.round(e.target.x()), y: Math.round(e.target.y()) })}
                            >
                              <Circle x={hands.center[0]} y={hands.center[1]} radius={hands.radius} fill={clock.faceColor} opacity={clock.opacity} stroke={clock.handColor} strokeWidth={2} />
                              {Array.from({ length: 12 }, (_, index) => {
                                const angle = index * 30 - 90
                                const radians = angle * Math.PI / 180
                                const outer = hands.radius * 0.84
                                const inner = outer - (index % 3 === 0 ? 12 : 6)
                                return <Line key={index} points={[hands.center[0] + Math.cos(radians) * inner, hands.center[1] + Math.sin(radians) * inner, hands.center[0] + Math.cos(radians) * outer, hands.center[1] + Math.sin(radians) * outer]} stroke={clock.handColor} strokeWidth={index % 3 === 0 ? 3 : 1} opacity={clock.opacity} />
                              })}
                              <Line points={hands.hour} stroke={clock.handColor} strokeWidth={7} lineCap="round" opacity={clock.opacity} />
                              <Line points={hands.minute} stroke={clock.handColor} strokeWidth={4} lineCap="round" opacity={clock.opacity} />
                              {clock.showSecondHand && <Line points={hands.second} stroke={clock.secondHandColor} strokeWidth={2} lineCap="round" opacity={clock.opacity} />}
                              <Circle x={hands.center[0]} y={hands.center[1]} radius={6} fill={clock.secondHandColor} opacity={clock.opacity} />
                              {isSelected && <Rect x={-3} y={-3} width={clock.width + 6} height={clock.height + 6} stroke="#6366f1" strokeWidth={1.5} dash={[4, 4]} />}
                            </Group>
                          )
                        }

                        // Text, DigitalTime, Widget elements
                        const textContent = getElementDisplayText(element)
                        const style = element.style
                        const glowProps = style.glow
                          ? {
                              shadowColor: style.glowColor || style.color,
                              shadowBlur: 14,
                              shadowOpacity: 0.9,
                            }
                          : {}

                        return (
                          <Group
                            key={element.id}
                            x={element.x}
                            y={element.y}
                            draggable={!element.locked}
                            onClick={() => select(element.id)}
                            onTap={() => select(element.id)}
                            onDragEnd={(e) =>
                              updateElement({
                                ...element,
                                x: Math.round(e.target.x()),
                                y: Math.round(e.target.y()),
                              })
                            }
                          >
                            <KonvaText
                              text={textContent}
                              width={element.width}
                              height={element.height}
                              fill={style.color}
                              fontFamily={style.fontFamily}
                              fontSize={style.fontSize}
                              fontStyle={style.fontWeight >= 700 ? 'bold' : 'normal'}
                              letterSpacing={style.letterSpacing}
                              lineHeight={style.lineHeight}
                              align={style.textAlign}
                              opacity={element.opacity}
                              {...glowProps}
                            />
                            {/* Selection Bounding Box */}
                            {isSelected && (
                              <Rect
                                x={-3}
                                y={-3}
                                width={element.width + 6}
                                height={element.height + 6}
                                stroke="#6366f1"
                                strokeWidth={1.5}
                                dash={[4, 4]}
                              />
                            )}
                          </Group>
                        )
                      })}
                  </Layer>
                </Stage>
              </div>
            </div>

            {/* Bottom Strap */}
            <div className="strap-bottom" />
          </div>
        </section>

        {/* ====================================================================
            RIGHT SIDEBAR: ELEMENT INSPECTOR
            ==================================================================== */}
        <aside className="studio-sidebar sidebar-right">
          <div className="inspector-header">
            <span className="inspector-title">
              {selected ? selected.name : 'Properties'}
            </span>
            {selected && (
              <span className="type-pill">{selected.type}</span>
            )}
          </div>

          <div className="sidebar-content">
            {selected ? (
              <>
                {/* Quick Alignment */}
                <div className="inspector-section">
                  <span className="section-label">Alignment</span>
                  <div className="alignment-grid">
                    <button className="align-btn" onClick={() => alignElement('left')} title="Align Left">
                      <AlignLeft size={14} />
                    </button>
                    <button className="align-btn" onClick={() => alignElement('center-h')} title="Center Horizontally">
                      <AlignCenter size={14} />
                    </button>
                    <button className="align-btn" onClick={() => alignElement('right')} title="Align Right">
                      <AlignRight size={14} />
                    </button>
                    <button className="align-btn" onClick={() => alignElement('top')} title="Align Top">
                      Top
                    </button>
                    <button className="align-btn" onClick={() => alignElement('center-v')} title="Center Vertically">
                      Mid
                    </button>
                    <button className="align-btn" onClick={() => alignElement('bottom')} title="Align Bottom">
                      Bot
                    </button>
                  </div>
                </div>

                {/* Transform */}
                <div className="inspector-section">
                  <span className="section-label">Transform</span>
                  <div className="field-grid-4">
                    <div className="field-control">
                      <label>X</label>
                      <div className="input-stepper">
                        <input
                          type="number"
                          value={selected.x}
                          onChange={(e) => changeSelected({ x: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="field-control">
                      <label>Y</label>
                      <div className="input-stepper">
                        <input
                          type="number"
                          value={selected.y}
                          onChange={(e) => changeSelected({ y: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="field-control">
                      <label>W</label>
                      <div className="input-stepper">
                        <input
                          type="number"
                          value={selected.width}
                          onChange={(e) => changeSelected({ width: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="field-control">
                      <label>H</label>
                      <div className="input-stepper">
                        <input
                          type="number"
                          value={selected.height}
                          onChange={(e) => changeSelected({ height: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="slider-group">
                    <div className="slider-label">
                      <span>Opacity</span>
                      <span>{Math.round(selected.opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={selected.opacity}
                      onChange={(e) => changeSelected({ opacity: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Typography (for text, digitalTime, widget) */}
                {'style' in selected && (
                  <div className="inspector-section">
                    <span className="section-label">Typography</span>

                    <div className="field-control">
                      <label>Font Family</label>
                      <select
                        className="select-control"
                        value={selected.style.fontFamily}
                        onChange={(e) =>
                          changeSelected({
                            style: { ...selected.style, fontFamily: e.target.value },
                          })
                        }
                      >
                        {fontFamilies.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field-grid-2">
                      <div className="field-control">
                        <label>Font Size</label>
                        <div className="input-stepper">
                          <input
                            type="number"
                            value={selected.style.fontSize}
                            onChange={(e) =>
                              changeSelected({
                                style: { ...selected.style, fontSize: Number(e.target.value) },
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="field-control">
                        <label>Weight</label>
                        <select
                          className="select-control"
                          value={selected.style.fontWeight}
                          onChange={(e) =>
                            changeSelected({
                              style: { ...selected.style, fontWeight: Number(e.target.value) },
                            })
                          }
                        >
                          <option value={400}>Regular</option>
                          <option value={600}>SemiBold</option>
                          <option value={700}>Bold</option>
                          <option value={900}>Black</option>
                        </select>
                      </div>
                    </div>

                    <div className="field-control">
                      <label>Text Align</label>
                      <div className="toggle-group">
                        {(['left', 'center', 'right'] as const).map((align) => (
                          <button
                            key={align}
                            className={`toggle-option ${selected.style.textAlign === align ? 'active' : ''}`}
                            onClick={() =>
                              changeSelected({
                                style: { ...selected.style, textAlign: align },
                              })
                            }
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="field-control">
                      <label>Color</label>
                      <div className="swatch-row">
                        <input
                          type="color"
                          className="color-picker-input"
                          value={selected.style.color}
                          onChange={(e) =>
                            changeSelected({
                              style: { ...selected.style, color: e.target.value },
                            })
                          }
                        />
                        {colorSwatches.map((color) => (
                          <button
                            key={color}
                            className="color-swatch-btn"
                            style={{ background: color }}
                            onClick={() =>
                              changeSelected({
                                style: { ...selected.style, color },
                              })
                            }
                          />
                        ))}
                      </div>
                    </div>

                    {/* Neon Glow Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Neon Glow (AMOLED)
                      </label>
                      <input
                        type="checkbox"
                        checked={selected.style.glow ?? false}
                        onChange={(e) =>
                          changeSelected({
                            style: {
                              ...selected.style,
                              glow: e.target.checked,
                              glowColor: selected.style.color,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Specific Properties: Digital Time */}
                {selected.type === 'digitalTime' && (
                  <div className="inspector-section">
                    <span className="section-label">Clock Options</span>
                    <div className="toggle-group">
                      <button
                        className={`toggle-option ${selected.format === '24h' ? 'active' : ''}`}
                        onClick={() => changeSelected({ format: '24h' })}
                      >
                        24-Hour
                      </button>
                      <button
                        className={`toggle-option ${selected.format === '12h' ? 'active' : ''}`}
                        onClick={() => changeSelected({ format: '12h' })}
                      >
                        12-Hour
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 14, paddingTop: 4 }}>
                      <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={selected.showSeconds}
                          onChange={(e) => changeSelected({ showSeconds: e.target.checked })}
                        />
                        <span>Seconds</span>
                      </label>
                      <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={selected.leadingZero}
                          onChange={(e) => changeSelected({ leadingZero: e.target.checked })}
                        />
                        <span>Leading 0</span>
                      </label>
                    </div>
                  </div>
                )}

                {selected.type === 'analogTime' && (
                  <div className="inspector-section">
                    <span className="section-label">Clock Options</span>
                    <div className="field-control">
                      <label>Face</label>
                      <input type="color" className="color-picker-input" value={selected.faceColor} onChange={(e) => changeSelected({ faceColor: e.target.value })} />
                    </div>
                    <div className="field-grid-2">
                      <div className="field-control">
                        <label>Hands</label>
                        <input type="color" className="color-picker-input" value={selected.handColor} onChange={(e) => changeSelected({ handColor: e.target.value })} />
                      </div>
                      <div className="field-control">
                        <label>Seconds</label>
                        <input type="color" className="color-picker-input" value={selected.secondHandColor} onChange={(e) => changeSelected({ secondHandColor: e.target.value })} />
                      </div>
                    </div>
                    <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: 6, paddingTop: 4 }}>
                      <input type="checkbox" checked={selected.showSecondHand} onChange={(e) => changeSelected({ showSecondHand: e.target.checked })} />
                      <span>Show seconds hand</span>
                    </label>
                  </div>
                )}

                {/* Specific Properties: Widget */}
                {selected.type === 'widget' && (
                  <div className="inspector-section">
                    <span className="section-label">Widget Properties</span>
                    <div className="field-control">
                      <label>Label</label>
                      <div className="input-stepper">
                        <input
                          value={selected.label}
                          onChange={(e) =>
                            changeSelected({ label: e.target.value, name: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="field-control">
                      <label>Preview Value</label>
                      <div className="input-stepper">
                        <input
                          value={selected.text}
                          onChange={(e) => changeSelected({ text: e.target.value })}
                        />
                      </div>
                    </div>
                    <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: 6, paddingTop: 4 }}>
                      <input
                        type="checkbox"
                        checked={selected.showIcon ?? true}
                        onChange={(e) => changeSelected({ showIcon: e.target.checked })}
                      />
                      <span>Show Icon</span>
                    </label>
                  </div>
                )}

                {/* Specific Properties: Custom Text */}
                {selected.type === 'text' && (
                  <div className="inspector-section">
                    <span className="section-label">Text Content</span>
                    <div className="input-stepper">
                      <input
                        value={selected.text}
                        onChange={(e) => changeSelected({ text: e.target.value })}
                        placeholder="Enter text..."
                      />
                    </div>
                  </div>
                )}

                {/* Specific Properties: Shape / Progress Bar */}
                {selected.type === 'shape' && (
                  <div className="inspector-section">
                    <span className="section-label">Shape Properties</span>
                    {selected.shapeType === 'progressBar' && (
                      <div className="slider-group">
                        <div className="slider-label">
                          <span>Progress</span>
                          <span>{selected.progress ?? 50}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={selected.progress ?? 50}
                          onChange={(e) => changeSelected({ progress: Number(e.target.value) })}
                        />
                      </div>
                    )}
                    <div className="field-control">
                      <label>Fill Color</label>
                      <div className="swatch-row">
                        <input
                          type="color"
                          className="color-picker-input"
                          value={selected.fill}
                          onChange={(e) => changeSelected({ fill: e.target.value })}
                        />
                        {colorSwatches.map((color) => (
                          <button
                            key={color}
                            className="color-swatch-btn"
                            style={{ background: color }}
                            onClick={() => changeSelected({ fill: color })}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions: Duplicate / Delete */}
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 16 }}>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={duplicateSelected}>
                    <Copy size={13} />
                    <span>Duplicate</span>
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ color: '#f43f5e', borderColor: '#4c1d24' }}
                    onClick={deleteSelected}
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </>
            ) : (
              /* Global Face Inspector */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="inspector-section">
                  <span className="section-label">Canvas Screen</span>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Select any component on the watch canvas to customize its typography, position, color, or data telemetry.
                  </div>
                </div>

                <div className="inspector-section">
                  <span className="section-label">Background Color</span>
                  <div className="swatch-row">
                    <input
                      type="color"
                      className="color-picker-input"
                      value={project.theme.background || '#05070d'}
                      onChange={(e) =>
                        commit({
                          ...project,
                          theme: { ...project.theme, background: e.target.value },
                        })
                      }
                    />
                    {['#000000', '#05070D', '#0B1118', '#120F1C', '#111713'].map((c) => (
                      <button
                        key={c}
                        className="color-swatch-btn"
                        style={{ background: c }}
                        onClick={() =>
                          commit({
                            ...project,
                            theme: { ...project.theme, background: c },
                          })
                        }
                      />
                    ))}
                  </div>
                </div>

                <div className="inspector-section">
                  <span className="section-label">Quick Actions</span>
                  <button className="btn-secondary" onClick={() => setShowPresetsModal(true)}>
                    <Palette size={13} />
                    <span>Browse Amazfit Style Presets</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* ====================================================================
          PRESETS GALLERY MODAL (Inspired by AmazfitWatchFaces.com)
          ==================================================================== */}
      {showPresetsModal && (
        <div className="modal-backdrop" onClick={() => setShowPresetsModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Watchface Style Gallery</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Inspired by trending designs on Facer & AmazfitWatchFaces for Redmi Watch 5
                </span>
              </div>
              <button className="icon-btn" onClick={() => setShowPresetsModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="presets-category-tabs">
                {['All', 'Sports', 'Luxury', 'Retro', 'Tactical', 'Minimalist', 'Cyberpunk'].map((cat) => (
                  <button
                    key={cat}
                    className={`preset-category-pill ${presetCategoryFilter === cat ? 'active' : ''}`}
                    onClick={() => setPresetCategoryFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="presets-modal-grid">
                {watchfacePresets
                  .filter((p) => presetCategoryFilter === 'All' || p.category === presetCategoryFilter)
                  .map((preset) => (
                    <div
                      key={preset.id}
                      className="preset-card-item"
                      onClick={() => {
                        commit(preset.project())
                        setShowPresetsModal(false)
                      }}
                    >
                      <div className="preset-card-header">
                        <span
                          className="preset-category-tag"
                          style={{ borderLeft: `3px solid ${preset.accentColor}` }}
                        >
                          {preset.category}
                        </span>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: preset.accentColor,
                          }}
                        />
                      </div>
                      <div>
                        <h4 className="preset-card-title">{preset.name}</h4>
                        <p className="preset-card-desc">{preset.subtitle}</p>
                      </div>
                      <button className="preset-apply-btn">Apply Style</button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          BLUETOOTH INSTALL MODAL
          ==================================================================== */}
      {showInstallModal && (
        <div className="modal-backdrop" onClick={() => setShowInstallModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bluetooth size={18} color="#00f0ff" />
                <h3 className="modal-title">Install to Redmi Watch</h3>
              </div>
              <button className="icon-btn" onClick={() => setShowInstallModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: 'rgba(0, 240, 255, 0.05)',
                  border: '1px solid rgba(0, 240, 255, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#00f0ff' }}>
                  <Check size={16} />
                  <span>Target Device: Redmi Watch 5 Lite</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  MAC Address: <code style={{ color: '#fff' }}>04-da-28-a5-0e-a0</code><br />
                  Resolution: <code style={{ color: '#fff' }}>410 × 502</code> (16-byte memory aligned)
                </div>
              </div>

              {installStatus === 'idle' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Your watch face design will be automatically compiled into a 16-byte aligned binary and transferred directly to your watch over Bluetooth RFCOMM.
                  </p>
                  <button
                    className="btn-accent"
                    style={{ height: 44, justifyContent: 'center', fontSize: 14, fontWeight: 700 }}
                    onClick={triggerWatchPush}
                  >
                    <Bluetooth size={16} />
                    <span>🚀 Push Design Directly to Watch</span>
                  </button>
                </div>
              )}

              {installStatus === 'pushing' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '24px 12px' }}>
                  <div style={{ width: 36, height: 36, border: '3px solid #00f0ff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
                      Transmitting to Redmi Watch 5 Lite...
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Resetting device slot, packing assets & writing to watch flash. Keep your watch nearby.
                    </div>
                  </div>
                </div>
              )}

              {installStatus === 'error' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 8 }}>
                  <div style={{ padding: 12, borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: 12 }}>
                    ⚠️ {installError}
                  </div>
                  {installLogs && (
                    <pre style={{ margin: 0, padding: 10, borderRadius: 6, background: '#0a0d14', color: '#94a3b8', fontSize: 11, maxHeight: 120, overflow: 'auto' }}>
                      {installLogs}
                    </pre>
                  )}
                  <button
                    className="btn-accent"
                    style={{ height: 40, justifyContent: 'center' }}
                    onClick={triggerWatchPush}
                  >
                    <span>Retry Bluetooth Push</span>
                  </button>
                </div>
              )}

              {installStatus === 'success' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                    <Check size={28} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', display: 'block' }}>
                      ✨ Face Successfully Transferred & Activated!
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginTop: 4 }}>
                      Look at your Redmi Watch 5 Lite screen — your custom face is live!
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 6 }}>
                    <button
                      className="btn-secondary"
                      style={{ flex: 1, height: 36, fontSize: 12 }}
                      onClick={() => setShowLogDetails(!showLogDetails)}
                    >
                      <span>{showLogDetails ? 'Hide Transfer Log' : 'View Transfer Log'}</span>
                    </button>
                    <button
                      className="btn-accent"
                      style={{ flex: 1, height: 36, fontSize: 12 }}
                      onClick={() => setShowInstallModal(false)}
                    >
                      <span>Done</span>
                    </button>
                  </div>

                  {showLogDetails && installLogs && (
                    <pre style={{ margin: 0, padding: 10, borderRadius: 6, background: '#0a0d14', color: '#00f0ff', fontSize: 10, maxHeight: 150, width: '100%', overflow: 'auto', textAlign: 'left' }}>
                      {installLogs}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
