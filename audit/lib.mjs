/* ==========================================================================
   AuthNexus Design · 审计共享工具
   配置读取（audit.config.json + 环境变量覆盖）与产物目录准备。
   优先级：环境变量 CHROME_PATH / BASE_URL / OUT_DIR > audit.config.json。
   ========================================================================== */
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const HERE = path.dirname(fileURLToPath(import.meta.url))

export function loadConfig() {
  const raw = JSON.parse(readFileSync(path.join(HERE, 'audit.config.json'), 'utf8'))
  const cfg = {
    chromePath: process.env.CHROME_PATH || raw.chromePath,
    baseUrl: process.env.BASE_URL || raw.baseUrl,
    outDir: process.env.OUT_DIR || path.resolve(HERE, raw.outDir || '.out'),
    profiles: raw.profiles || {},
  }
  mkdirSync(cfg.outDir, { recursive: true })
  return cfg
}
