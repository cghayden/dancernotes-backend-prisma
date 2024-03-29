"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var prisma_lib_1 = require("prisma-client-lib");
var typeDefs = require("./prisma-schema").typeDefs;

var models = [
  {
    name: "Parent",
    embedded: false
  },
  {
    name: "Studio",
    embedded: false
  },
  {
    name: "Dancer",
    embedded: false
  },
  {
    name: "DanceClass",
    embedded: false
  },
  {
    name: "CustomRoutine",
    embedded: false
  },
  {
    name: "MakeupSet",
    embedded: false
  },
  {
    name: "HairStyle",
    embedded: false
  },
  {
    name: "ParentNote",
    embedded: false
  },
  {
    name: "StudioEvent",
    embedded: false
  },
  {
    name: "ParentEvent",
    embedded: false
  },
  {
    name: "EnrollmentRequest",
    embedded: false
  },
  {
    name: "AccessRequest",
    embedded: false
  }
];
exports.Prisma = prisma_lib_1.makePrismaClientClass({
  typeDefs,
  models,
  endpoint: `${process.env["PRISMA_ENDPOINT"]}`,
  secret: `${process.env["PRISMA_SECRET"]}`
});
exports.prisma = new exports.Prisma();
