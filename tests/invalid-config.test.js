const test = require("ava")
const bent = require("bent")
const traefik = require("..")
const getPort = require("get-port")
const micro = require("micro")
const request = bent("string")

test("invalid config should throw with relevant error", async (t) => {
  await traefik.start({
    defaultEntryPoints: ["http"],
    entryPoints:{
      http: {
        address: `pasta:pasta.com` // ERROR
      }
    },
    "log.level": "DEBUG"
  }).then(() => { 
    t.fail("should throw error")
  }).catch((err) => {
    t.assert(err.toString().includes("pasta.com: unknown port"))
  })
})
