module.exports = {
  apps: {
    mode: "cluster",
    instances: 1,
    script: "./api/dist/node/server.js",
    // args: ["start"],
    interpreter_args: [ "--no-warnings", "--experimental-fetch" ],
    name: "dolar",
    time: true,
    // env: { 
    //   FORCE_COLOR: "1",
    //   LOG_TS: "1",
    // },
  }
}