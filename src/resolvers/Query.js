const { forwardTo } = require("prisma-binding");

const Query = {
  danceClass: forwardTo("db"),
  parents: forwardTo("db"),
  studios: forwardTo("db"),
  studio: forwardTo("db"),
  dancer: forwardTo("db"),
  dancers: forwardTo("db"),
  customRoutine: forwardTo("db"),
  async parentsDancers(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("You must be logged in to do retrieve your dancers");
    }
    const dancers = await ctx.db.query.dancers(
      { where: { parent: { id: ctx.request.userId } } },
      info
    );
    return dancers;
  },
  async parentUser(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("No Parent User was found");
    }
    const parentUser = await ctx.db.query.parent(
      { where: { id: ctx.request.userId } },
      info
    );
    const dancersIds = [];
    for (const dancer of parentUser.dancers) {
      dancersIds.push(dancer.id);
    }
    parentUser.dancersIds = dancersIds;
    return parentUser;
  },
  async parentMakeup(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("No Parent User was found");
    }
    return await ctx.db.query.parent(
      { where: { id: ctx.request.userId } },
      info
    );
  },
  async allRs(parent, args, ctx, info) {
    const customRoutines = await ctx.db.query.customRoutines(
      {
        where: {
          parent: {
            id: ctx.request.userId,
          },
        },
      },
      `{
      id
      name
      custom
      performanceName
      tights
      shoes
      notes
      music
      day
      startTime
      endTime
      entryNumber
      entryDay
      entryTime
      dancers{
        id
        firstName
        avatar
      }
      studio{
        id
      }}`
    );
    const parentsDancers = await ctx.db.query.parent(
      { where: { id: ctx.request.userId } },
      `{dancers{id}}`
    );
    const myDancersIds = [];

    for (const dancer of parentsDancers.dancers) {
      myDancersIds.push(dancer.id);
    }

    const parentsClasses = await ctx.db.query.danceClasses(
      {
        where: {
          dancers_some: { id_in: myDancersIds },
        },
      },
      info
    );
    //NEW .... //
    const allParentsNotes = await ctx.db.query.parentNotes(
      {
        where: {
          parent: { id: ctx.request.userId },
        },
      },
      `{id note dance{id}}`
    );

    for (const dance of parentsClasses) {
      const filteredDancers = dance.dancers.filter((dancer) =>
        myDancersIds.includes(dancer.id)
      );
      dance.dancers = filteredDancers;
    }

    const allParentsClasses = [...parentsClasses, ...customRoutines];

    //....NEW //
    for (const dance of allParentsClasses) {
      // dance.parentsNotes = [];
      for (const note of allParentsNotes) {
        if (note.dance.id === dance.id) {
          dance.parentsNotes = note;
        }
      }
    }
    return allParentsClasses;
  },
  async parentHairstyles(parent, args, ctx, info) {
    return await ctx.db.query.studios(
      {
        where: {
          dancers_some: { parent: { id: ctx.request.userId } },
        },
      },
      info
    );
  },

  async myStudio(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      return null;
    }
    return await ctx.db.query.studio(
      { where: { id: ctx.request.userId } },
      info
    );
  },
  async studioCategories(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("you must be logged in to do that");
    }
    return await ctx.db.query.studio(
      { where: { id: ctx.request.userId } },
      info
    );
  },
  async allStudioDanceClasses(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("you must be logged in to do that");
    }
    return await ctx.db.query.danceClasses(
      {
        where: { studio: { id: ctx.request.userId } },
      },
      info
    );
  },
  async studioHairStyles(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("you must be logged in to do that");
    }
    return await ctx.db.query.hairStyles(
      { where: { studio: { id: ctx.request.userId } } },
      info
    );
  },
  async studioDancers(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("you must be logged in to do that");
    }
    const dancers = await ctx.db.query.dancers(
      {
        where: { studios_some: { id: ctx.request.userId } },
      },
      info
    );
    for (const dancer of dancers) {
      const studioDances = dancer.danceClasses.filter((danceClass) => {
        return danceClass.studio.id === ctx.request.userId;
      });
      dancer.danceClasses = studioDances;
    }

    return dancers;
  },
  async studioDancer(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("you must be logged in to do that");
    }
    const dancer = await ctx.db.query.dancer(
      {
        where: { id: args.id },
      },
      info
    );

    const studioDances = dancer.danceClasses.filter((danceClass) => {
      return danceClass.studio.id === ctx.request.userId;
    });
    dancer.danceClasses = studioDances;

    return dancer;
  },
  async studioEvent(parent, args, ctx, info){
    if (!ctx.request.userId) {
      throw new Error("you must be logged in to do that");
    }
    const studioEvent = await ctx.db.query.studioEvent(
      {
        where: {id: args.id},
      },
      info
    );
    return studioEvent
  },
  async studioHairStyle(parent, args, ctx, info){
    if (!ctx.request.userId) {
      throw new Error("you must be logged in to do that");
    }
    const studioHairStyle = await ctx.db.query.hairStyle(
      {
        where: {id: args.id},
      },
      info
    );
    //check to ensure studio id on returned hairstyle matches the userId(studioId)?
    return studioHairStyle
  },
  async parentNotes(parent, args, ctx, info) {
    return await ctx.db.query.parentNotes(
      {
        where: { dance: { id: args.danceId } },
      },
      info
    );
  },
  async enrollmentRequests(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("you must be logged in to do that");
    }
    return await ctx.db.query.enrollmentRequests(
      { where: { studio: { id: ctx.request.userId } } },
      info
    );
  },
  async accessRequests(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("you must be logged in to do that");
    }
    return await ctx.db.query.accessRequests(
      { where: { studio: { id: ctx.request.userId } } },
      info
    );
  },
  async parentEvents(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("you must be logged in to do that");
    }
    const studioIds = await ctx.db.query.parent(
      {
        where: { id: ctx.request.userId },
      },
      `{studios{id}}`
    );
    const allStudioIds = [];
    for (const studio of studioIds.studios) {
      allStudioIds.push(studio.id);
    }
    const allStudioEvents = await ctx.db.query.studioEvents(
      {
        where: {
          studio: {
            id_in: allStudioIds,
          },
        },
      },
      info
    );
    return allStudioEvents;
  },
  async customEvents(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("you must be logged in to do that");
    }
    return await ctx.db.query.parentEvents(
      {
        where: { parent: { id: ctx.request.userId } },
      },
      info
    );
  },
};

module.exports = Query;
