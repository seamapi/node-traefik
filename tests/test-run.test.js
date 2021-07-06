const test = require("ava")
const bent = require("bent")
const traefik = require("../")
const getPort = require("get-port")
const micro = require("micro")
const request = bent("string")

test("requests should be proxied through traefik", async (t) => {
  // Web service to proxy (on client)
  const webService = micro((req, res) => "Hello world!")
  webService.listen(3000)

  const traefikService = await traefik.start({
    staticConfig: {
      defaultEntryPoints: ["http"],
      entryPoints:{
        http: {
          address: ":3001"
        }
      },
      // dot notation is also OK!
      "log.level": "DEBUG"
    },
    dynamicConfig: {
      http: {
        routers: {
          someRouter: {
            service: "someService",
            rule: "PathPrefix(`/`)"
          }
        },
        services: {
          someService: {
            "loadBalancer.servers": [{ url: "http://localhost:3000" }]
          }
        }
      }
    }
  })

  const response = await request(`http://localhost:3001`)
  t.assert(response === "Hello world!")

  await traefikService.stop()
  await webService.close()
})
