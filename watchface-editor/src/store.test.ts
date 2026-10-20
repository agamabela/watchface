import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from './store'
import { createAnalogClockElement, createStarterProject, createWidgetElement, watchfacePresets, widgetPreview } from './schema'

beforeEach(() => useEditorStore.setState({ project: createStarterProject(), selectedId: 'time-1', past: [], future: [] }))

describe('editor history', () => {
  it('creates a live analog clock with a circular face', () => {
    const clock = createAnalogClockElement(3)
    expect(clock.type).toBe('analogTime')
    expect(clock.width).toBe(clock.height)
    expect(clock.showSecondHand).toBe(true)
  })

  it('does not offer unsupported distance telemetry', () => {
    expect(widgetPreview).not.toHaveProperty('distance')
    expect(watchfacePresets.flatMap((preset) => preset.project().elements))
      .not.toContainEqual(expect.objectContaining({ metric: 'distance' }))
  })

  it('creates a data widget with a readable live preview value', () => {
    const widget = createWidgetElement('steps', 3)
    expect(widget.type).toBe('widget')
    expect(widget.metric).toBe('steps')
    expect(widget.text).toBe('6,840')
  })

  it('returns to the previous project after undo and restores it with redo', () => {
    const store = useEditorStore.getState()
    const changed = { ...store.project, name: 'After edit' }
    store.commit(changed)
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().project.name).toBe('Untitled face')
    useEditorStore.getState().redo()
    expect(useEditorStore.getState().project.name).toBe('After edit')
  })

  it('keeps no more than fifty undo checkpoints', () => {
    for (let index = 0; index < 60; index += 1) {
      const state = useEditorStore.getState()
      state.commit({ ...state.project, name: `Version ${index}` })
    }
    expect(useEditorStore.getState().past).toHaveLength(50)
  })
})
