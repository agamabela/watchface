import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import { execFile } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

function watchBridgePlugin(): Plugin {
  return {
    name: 'watch-bluetooth-bridge',
    configureServer(server) {
      server.middlewares.use('/api/install', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })

        req.on('end', async () => {
          try {
            const project = JSON.parse(body)
            const tmpPath = '/tmp/current-editor-watchface.json'
            writeFileSync(tmpPath, JSON.stringify(project, null, 2))

            const pythonBin = '/Users/deyanihif/Documents/Codex/2026-10-19/i-w/work/runtime/editor-py/bin/python3'
            const scriptPath = '/Users/deyanihif/Documents/Codex/2026-10-20/con/outputs/build_and_upload.py'

            const { stdout } = await execFileAsync(pythonBin, [
              scriptPath,
              '--json',
              tmpPath,
              '--face-id',
              'auto',
            ])

            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.end(JSON.stringify({ success: true, stdout }))
          } catch (err: any) {
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 500
            res.end(
              JSON.stringify({
                success: false,
                error: err?.message || String(err),
                stderr: err?.stderr,
              })
            )
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), watchBridgePlugin()],
})
