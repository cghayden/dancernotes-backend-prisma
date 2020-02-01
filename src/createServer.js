//YOGA Server

// import Graphql yoga server; Yoga is an express/apollo GraphQl server
const { GraphQLServer } = require("graphql-yoga");

// import resolvers
const Mutation = require("./resolvers/Mutation.js");
const Query = require("./resolvers/Query.js");

//database file
const db = require("./db");

// create the graphql yoga server, it is what we will be interfacing with
function createServer() {
  return new GraphQLServer({
    typeDefs: "src/schema.graphql",
    resolvers: {
      Mutation,
      Query
    },
    resolverValidationOptions: {
      requireResolversForResolveType: false
    },
    context: req => ({ ...req, db })
  });
}

module.exports = createServer;
