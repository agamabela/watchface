import { create } from 'zustand'
import { createStarterProject, type Project, type WatchElement } from './schema'

const LIMIT = 50
const clone = (project: Project): Project => structuredClone(project)
const replaceElement = (project: Project, updated: WatchElement): Project => ({ ...project, elements: project.elements.map((element) => element.id === updated.id ? updated : element) })

interface EditorState {
  project: Project
  selectedId: string | null
  past: Project[]
  future: Project[]
  select: (id: string | null) => void
  commit: (next: Project) => void
  updateElement: (element: WatchElement) => void
  addElement: (element: WatchElement) => void
  undo: () => void
  redo: () => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: createStarterProject(), selectedId: 'time-1', past: [], future: [],
  select: (selectedId) => set({ selectedId }),
  commit: (next) => set((state) => ({ project: clone(next), past: [...state.past, clone(state.project)].slice(-LIMIT), future: [] })),
  updateElement: (element) => get().commit(replaceElement(get().project, element)),
  addElement: (element) => { get().commit({ ...get().project, elements: [...get().project.elements, element] }); get().select(element.id) },
  undo: () => set((state) => { const previous = state.past.at(-1); return previous ? { project: previous, past: state.past.slice(0, -1), future: [clone(state.project), ...state.future] } : state }),
  redo: () => set((state) => { const next = state.future[0]; return next ? { project: next, past: [...state.past, clone(state.project)].slice(-LIMIT), future: state.future.slice(1) } : state }),
}))
