# Node Traefik (traefik)

> Traefik (pronounced traffic) is a modern HTTP reverse proxy and load balancer that makes deploying microservices easy

Use [traefik](https://github.com/traefik/traefik) as an npm module for tighter integration with node apps.

## Usage

`npm install traefik`

```javascript
const traefik = require("traefik")

// Path to YAML/TOML
let service = await traefik.start("/path/to/traefik.yml")

// Static Config Only
service = await traefik.start({
  defaultEntryPoints: ["http"],
  entryPoints:{
    http: {
      address: ":3001"
    }
  },
  "log.level": "DEBUG"
})

// Long Form
service = await traefik.start({
  log: true,
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

await service.stop()
```

## Options

See the traefik [static configuration](https://doc.traefik.io/traefik/reference/static-configuration/file/) and [dynamic configuration](https://doc.traefik.io/traefik/reference/dynamic-configuration/file/) reference pages.