//React -> Appollo -> Yoga -> Prisma
// Yoga is like mongoose

// this file connects to the remote prisma db and gives us the ability to query it with JS

// Prisma bindings

const { Prisma } = require("prisma-binding");

const db = new Prisma({
  typeDefs: "src/generated/prisma.graphql",
  endpoint: process.env.PRISMA_ENDPOINT,
  secret: process.env.PRISMA_SECRET,
  debug: false
});

module.exports = db;
