const bent = require("bent")
const os = require("os")
const downloadFile = require("./download-file")
const path = require("path")
const fs = require("fs")
const tar = require("tar")

const getJSON = bent("json", {
  "User-Agent": "seveibar, node-traefik (an npm module)",
})

const platform = os.platform()
const arch = os.arch()
let osRelease = null

switch (platform) {
  case "win32":
    osRelease = `win32.exe`
    break
  case "win64":
    osRelease = `win64.exe`
    break
  case "darwin":
    osRelease = "darwin_amd64"
    break
  case "freebsd":
    osRelease = "freebsd"
    break
  case "linux":
    osRelease = `linux_${arch.replace("x64", "amd64")}`
    break
  // case 'aix': console.log("IBM AIX platform");
  //   break;
  // case 'android': console.log("Android platform");
  //   break;
  // case 'openbsd': console.log("OpenBSD platform");
  //   break;
  // case 'sunos': console.log("SunOS platform");
  //   break;

  default:
    osRelease = `${platform}_${arch}`
}

// Originally derived from the package.json, but that approach doesn't allow for
// any patches to the bindings... Maybe only sync major versions in the future?
// Either that or tag the releases for older version e.g. 1.2.3-traefik
const releaseVersionToUse = "2.4.9"

module.exports = async () => {
  const extractExePath = path.resolve(__dirname, "traefik") // TODO .exe
  if (fs.existsSync(extractExePath)) return extractExePath

  // Get all the assets from the github release page
  const releaseAPIUrl = `https://api.github.com/repos/traefik/traefik/releases/tags/v${releaseVersionToUse}`
  const { assets } = await getJSON(releaseAPIUrl)

  // Find the asset for my operating system
  const myAsset = assets.find((asset) => asset.name.includes(osRelease))

  if (!myAsset) {
    throw new Error(
      `Couldn't find traefik version compatible with ${osRelease},\n\nAvailable releases:\n${assets
        .map((a) => `\t* ${a.name}`)
        .join("\n")}`
    )
  }

  // Download the asset (which is a compressed version of the executable)
  // e.g. download something like traefik-ubuntu.tar.xz
  const downloadPath = path.resolve(__dirname, myAsset.name)

  console.log(`Downloading ${myAsset.name}...`)

  if (!fs.existsSync(path.join(__dirname, myAsset.name))) {
    await downloadFile(myAsset.browser_download_url, downloadPath)
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  // Extract File
  await tar.x({
    file: downloadPath,
  })
  fs.unlinkSync(downloadPath)

  fs.chmodSync(extractExePath, 0o755)

  return path.resolve(__dirname, extractExePath)
}

if (!module.parent) {
  module.exports().then((exePath) => console.log("Exe path:", exePath))
}
