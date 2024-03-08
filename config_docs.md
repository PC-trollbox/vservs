# Configuration documentation

## listenPort
HTTP listening port. A number, like `3914`.

## listenPortSecure
HTTPS listening port. A number, like `3915`.

## servers
A mapping of a hostname to an URL, like ducchat.localhost -> http://localhost:4598. An object with keys that are strings and values that are strings, like:
```json
{
    "ducchat.localhost": "http://localhost:4598"
}
```

## keyPath
Path to the private key of HTTPS. A string, like `"/path/to/private.key"`

## certPath
Path to the certificate of HTTPS. A string, like `"/path/to/my.certificate"`

## realIP
The header containing the real IP of the visitor. A string, like `"CF-Connecting-IP"`.

## plugins
Paths to plugins. An array with strings, like:
```json
[
    "./hostmatch_plugin_example.js"
]
```

## appendRequestHeaders
Headers (and their values) appended to the request sent to a server, like `X-Served-Vservs: 6a35d8ae7d0b196833e8f0d3d2054609`. An object with keys that are strings and values that are strings, like:
```json
{
    "X-Served-Vservs": "6a35d8ae7d0b196833e8f0d3d2054609"
}
```

## appendBidirectionalHeaders
Headers (and their values) appended to both the request and the response, like `X-Vservs-Instance: 127.0.0.1`. An object with keys that are strings and values that are strings, like:
```json
{
    "X-Vservs-Instance": "127.0.0.1"
}
```

## appendResponseHeaders
Headers (and their values) appended to both the response, like `X-Vservs-Used: yes`. An object with keys that are strings and values that are strings, like:
```json
{
    "X-Vservs-Used": "yes"
}
```

## Note
Some values may be omitted.

## Example config with example values
Another copy is in the config_example.json file.
```json
{
    "listenPort": 3914,
    "listenPortSecure": 3915,
    "servers": {
        "ducchat.localhost": "http://localhost:4598"
    },
    "realIP": "CF-Connecting-IP",
    "plugins": [
        "./hostmatch_plugin_example.js"
    ],
    "appendRequestHeaders": {
        "X-Served-Vservs": "6a35d8ae7d0b196833e8f0d3d2054609"
    },
    "appendBidirectionalHeaders": {
        "X-Vservs-Instance": "127.0.0.1"
    },
    "appendResponseHeaders": {
        "X-Vservs-Used": "yes"
    }
}
```