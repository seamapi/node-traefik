const test = require("ava")
const bent = require("bent")
const traefik = require("..")
const getPort = require("get-port")
const micro = require("micro")
const request = bent("string")

test("requests should be proxied through traefik", async (t) => {
  const [webServicePort, traefikPort] = [await getPort(), await getPort()]

  // Web service to proxy (on client)
  const webService = micro((req, res) => "Hello world!")
  webService.listen(webServicePort)

  const traefikService = await traefik.start({
    log: true,
    staticConfig: {
      defaultEntryPoints: ["http"],
      entryPoints: {
        http: {
          address: `:${traefikPort}`,
        },
      },
      "log.level": "DEBUG",
    },
    dynamicConfig: {
      http: {
        routers: {
          someRouter: {
            service: "someService",
            rule: "PathPrefix(`/`)",
          },
        },
        services: {
          someService: {
            "loadBalancer.servers": [
              { url: `http://localhost:${webServicePort}` },
            ],
          },
        },
      },
    },
  })

  console.log("waiting a second...")
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const response = await request(`http://localhost:${traefikPort}`)
  t.assert(response === "Hello world!")

  await traefikService.stop()
  await webService.close()
})
