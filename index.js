const child_process = require("child_process")
const json2toml = require("json2toml")
const flat = require("flat")
const { EventEmitter } = require('events')

const downloadtraefik = require("./download-traefik")

class TraefikService extends EventEmitter {
  proc = null
  stop = null
}

module.exports.start = async (params) => {
  if (!params)
    throw new Error(
      "No parameters provided to traefik.start (static config or path to static config must be specified)"
    )
  const tempWrite = (await import("temp-write")).default
  const traefikPath = await downloadtraefik()
  const traefikService = new TraefikService()
  let pathToStaticConfigFile = typeof params === "string" ? params : null
  let staticConfigObject

  if (params.staticConfig) {
    staticConfigObject = params.staticConfig
  } else if (typeof params === "object") {
    if (params.dynamicConfig)
      throw new Error(
        "When specifying dynamicConfig parameter, make sure to specify staticConfig parameter"
      )

    staticConfigObject = params
  }

  if (params.dynamicConfig && staticConfigObject) {
    staticConfigObject["providers.file.filename"] = await tempWrite(
      json2toml(flat.unflatten(params.dynamicConfig)),
      "traefik-dynamic.toml"
    )
    console.log("traefik-dynamic.toml path:", staticConfigObject["providers.file.filename"])
  }

  if (staticConfigObject) {
    pathToStaticConfigFile = await tempWrite(
      json2toml(flat.unflatten(staticConfigObject)),
      "traefik-static.toml"
    )
  }

  const argList = ["--configFile", pathToStaticConfigFile]

  console.log(`Running ${traefikPath} ${argList.join(' ')}`)
  const proc = child_process.spawn(traefikPath, argList, {
    shell: true,
  })
  proc.stdout.on("data", (data) => {
    traefikService.emit("data", data)
  })
  let recentStderrLines = []
  proc.stderr.on("data", (data) => {
    traefikService.emit("data", data)
    recentStderrLines.push(data)
    recentStderrLines = recentStderrLines.slice(-10)
    console.log(`traefik stderr: ${data}`)
  })

  let isClosed = false
  proc.on("close", (code) => {
    traefikService.emit("close", code)
    console.log(`traefik closing (code: ${code})`)
    isClosed = true
  })

  await new Promise((resolve, reject) => {
    const processCloseTimeout = setTimeout(() => {
      if (isClosed) {
        reject(`traefik didn't start properly:\n\n${recentStderrLines.join('\n')}`)
      } else {
        reject(`traefik didn't respond`)
        proc.kill("SIGINT")
      }
    }, 5000)

    async function checkIfRunning() {
      setTimeout(() => {
        // TODO ping traefik
        const traefikIsHealthy = !isClosed
        if (traefikIsHealthy) {
          clearTimeout(processCloseTimeout)
          resolve()
        }
      }, 2000)
    }
    checkIfRunning()
  })

  process.on("SIGINT", () => proc.kill("SIGINT"))
  process.on("SIGUSR1", () => proc.kill("SIGINT"))
  process.on("SIGUSR2", () => proc.kill("SIGINT"))
  process.on("exit", () => proc.kill("SIGINT"))

  traefikService.proc = proc
  traefikService.stop = async () => {
    proc.kill("SIGINT")
  }

  return traefikService
}
