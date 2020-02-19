const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
//from node:
const { randomBytes } = require("crypto");
//from node: promisify turns callback based functions into promise based functions
const { promisify } = require("util");
const { transporter, makeANiceEmail } = require("../email");

const Mutations = {
  async signupParent(parent, args, ctx, info) {
    args.email = args.email.toLowerCase();
    const password = await bcrypt.hash(args.password, 10);
    const parentUser = await ctx.db.mutation.createParent(
      {
        data: {
          ...args,
          password: password
        }
      },
      info
    );
    const token = jwt.sign(
      { userId: parentUser.id, userType: "parent" },
      process.env.APP_SECRET
    );
    // set the jwt as a cookie on the response so the token comes along with each request
    ctx.response.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
      // secure: process.env.PRODUCTION ? true : false, //one year cookie
    });
    return parentUser;
  },
  async requestReset(parent, args, ctx, info) {
    //1. check if real user
    const studioUser = await ctx.db.query.studio({
      where: { email: args.email }
    });
    const parentUser = await ctx.db.query.parent({
      where: { email: args.email }
    });
    if (!parentUser && !studioUser) {
      throw new Error(`No user found for ${args.email}`);
    }
    // 2. Set a reset token and expiry on that user
    const randomBytesPromiseified = promisify(randomBytes);
    const resetToken = (await randomBytesPromiseified(20)).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now
    if (parentUser) {
      const res = await ctx.db.mutation.updateParent({
        where: { email: args.email },
        data: { resetToken, resetTokenExpiry }
      });
      const mailRes = await transporter.sendMail({
        from: "admin@coreyhayden.tech",
        to: args.email,
        subject: "Your Password Reset Token",
        html: makeANiceEmail(`Your Password Reset Token is here!
        \n\n
        <a href="${process.env.FRONTEND_URL}/parent/resetPassword?resetToken=${resetToken}">Click Here to Reset</a>`)
      });
    }
    if (studioUser) {
      const res = await ctx.db.mutation.updateStudio({
        where: { email: args.email },
        data: { resetToken, resetTokenExpiry }
      });
      // 3. Email them that reset token

      const mailRes = await transporter.sendMail({
        from: "cghayden@gmail.com",
        to: email,
        subject: "Your Password Reset Token",
        html: makeANiceEmail(`Your Password Reset Token is here!
        \n\n
        <a href="${process.env.FRONTEND_URL}/studio/resetPassword?resetToken=${resetToken}">Click Here to Reset</a>`)
      });
    }
    // 4. Return the message
    return { message: "Check your email for a reset link!" };
  },
  async resetParentPassword(parent, args, ctx, info) {
    // 1. check if the passwords match
    if (args.password !== args.confirmPassword) {
      throw new Error("Your Passwords don't match!");
    }
    // 2. check if its a legit reset token
    // 3. Check if its expired
    const [parentUser] = await ctx.db.query.parents({
      where: {
        resetToken: args.resetToken,
        resetTokenExpiry_gte: Date.now() - 3600000
      }
    });
    if (!parentUser) {
      throw new Error("This token is either invalid or expired!");
    }
    // 4. Hash their new password
    const password = await bcrypt.hash(args.password, 10);
    // 5. Save the new password to the user and remove old resetToken fields
    const updatedParentUser = await ctx.db.mutation.updateParent({
      where: { email: parentUser.email },
      data: {
        password,
        resetToken: null,
        resetTokenExpiry: null
      }
    });
    // 6. Generate JWT
    const token = jwt.sign(
      { userId: parentUser.id, userType: "parent" },
      process.env.APP_SECRET
    );
    // 7. Set the JWT cookie
    ctx.response.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    });
    // 8. return the new user
    return updatedParentUser;
  },

  async signin(parent, args, ctx, info) {
    // 1. check if there is a user with that email
    const studioUser = await ctx.db.query.studio({
      where: { email: args.email }
    });
    const parentUser = await ctx.db.query.parent({
      where: { email: args.email }
    });
    if (!parentUser && !studioUser) {
      throw new Error(`No user found for ${args.email}`);
    }
    // 2. Check if their password is correct
    if (parentUser) {
      const validPass = await bcrypt.compare(
        args.password,
        parentUser.password
      );
      if (!validPass) {
        throw new Error("Invalid Password!");
      }
      const token = jwt.sign(
        { userId: parentUser.id, userType: "parent" },
        process.env.APP_SECRET
      );
      ctx.response.cookie("token", token, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 365 //one year cookie
      });
      return parentUser;
    }
    if (studioUser) {
      const validPass = await bcrypt.compare(
        args.password,
        studioUser.password
      );
      if (!validPass) {
        throw new Error("Invalid Password!");
      }
      const token = jwt.sign(
        { userId: studioUser.id, userType: "studio" },
        process.env.APP_SECRET
      );
      ctx.response.cookie("token", token, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 365 //one year cookie
        // secure: process.env.PRODUCTION ? true : false,
      });
      return studioUser;
    }
  },

  async signupStudio(parent, args, ctx, info) {
    // TODO - if first user to create account, set their permission as 'ADMIN'
    args.email = args.email.toLowerCase();
    const password = await bcrypt.hash(args.password, 10);
    const studio = await ctx.db.mutation.createStudio(
      {
        data: {
          ...args,
          password: password
        }
      },
      info
    );
    const token = jwt.sign(
      { userId: studio.id, userType: "studio" },
      process.env.APP_SECRET
    );
    ctx.response.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365 //one year cookie
      // secure: process.env.PRODUCTION ? true : false,
    });
    return studio;
  },

  signout(parent, args, ctx, info) {
    ctx.response.clearCookie("token");
    // must return something, but not going to use message at this time
    return { message: "Goodbye" };
  },
  async createDancer(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("You must be logged to add a Dancer");
    }
    const dancer = await ctx.db.mutation.createDancer(
      {
        data: {
          parent: {
            connect: {
              id: ctx.request.userId
            }
          },
          ...args
        }
      },
      info
    );
    return dancer;
  },
  async updateDancer(parent, args, ctx, info) {
    const updates = { ...args };

    //don't update id... it's just for lookup purposes
    delete updates.id;
    return ctx.db.mutation.updateDancer(
      {
        data: updates,
        where: { id: args.id }
      },
      info
    );
  },

  async createDanceClass(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("You must be logged to create a Dance Class");
    }
    // put makeup set Id into its own variable to use in making the connection, then remove it from args so it doesn't get passed in again with args
    args.custom = false;
    return await ctx.db.mutation.createDanceClass(
      {
        data: {
          studio: {
            connect: {
              id: ctx.request.userId
            }
          },
          ...args
        }
      },
      info
    );
  },
  async addDancer(parent, args, ctx, info) {
    return await ctx.db.mutation.updateDanceClass(
      {
        where: { id: args.danceId },
        data: { dancers: { connect: { id: args.dancerId } } }
      },
      info
    );
  },
  async removeDancerFromDance(parent, args, ctx, info) {
    return await ctx.db.mutation.updateDanceClass(
      {
        where: { id: args.danceId },
        data: { dancers: { disconnect: { id: args.dancerId } } }
      },
      info
    );
  },
  async updateDanceClass(parent, args, ctx, info) {
    // put ID in its own Var,
    const danceClassId = args.id;
    // and remove ID from updates... we are not going to update the ID
    delete args.id;
    // run update method
    return await ctx.db.mutation.updateDanceClass(
      {
        data: {
          ...args
        },
        where: { id: danceClassId }
      },
      info
    );
  },
  async deleteDanceClass(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("You must be logged in to delete a Class");
    }
    return await ctx.db.mutation.deleteDanceClass(
      {
        where: { id: args.id }
      },
      info
    );
  },
  async requestDance(parent, args, ctx, info) {
    const authorizedEmails = [
      "q@q.com",
      "cghayden@gmail.com",
      "sarah.hayden27@gmail.com",
      "yengbutler@gmail.com",
      "jopetrunyak@yahoo.com",
      "karajdm@yahoo.com",
      "kelli474@msn.com",
      "lilianthana4@yahoo.com",
      "lisabraude@gmail.com",
      "vieira2177@gmail.com",
      "lorironkin@yahoo.com",
      "marcycarty@gmail.com",
      "michaelaellensilva@gmail.com",
      "mullinfam2061@gmail.com",
      "blackcoffee141@msn.com",
      "roudlylaroche@live.com",
      "taradelamere@gmail.com",
      "elcorredor@hotmail.com",
      "adelaidehayden@gmail.com",
      "hondacoupe2004@yahoo.com",
      "svetlana.leeds83@gmail.com"
    ];
    // if user email is in my list, approve automatically
    if (authorizedEmails.includes(args.parentEmail)) {
      const updatedDanceClass = await ctx.db.mutation.updateDanceClass(
        {
          where: { id: args.danceId },
          data: { dancers: { connect: { id: args.dancerId } } }
        },
        `{id studio{id studioName}}`
      );
      // 3. if the dancer is succesfully added to the dance:
      if (updatedDanceClass) {
        //3a. Add dancer to dancers field on studio type
        await ctx.db.mutation.updateStudio({
          where: { id: updatedDanceClass.studio.id },
          data: { dancers: { connect: { id: args.dancerId } } }
        });
        //3a. Add Studio to Parent's Studios.(Parent is the logged in user here)
        await ctx.db.mutation.updateParent({
          where: { id: ctx.request.userId },
          data: { studios: { connect: { id: updatedDanceClass.studio.id } } }
        });
      }
      return "Success!! - Enrolled!";
    }
    //TODO - make sure it is not already in requests
    else {
      const enrollmentRequest = await ctx.db.mutation.upsertEnrollmentRequest(
        {
          where: { id: args.requestId },
          create: {
            dancer: { connect: { id: args.dancerId } },
            studio: { connect: { id: args.studioId } },
            parent: { connect: { id: ctx.request.userId } },
            classesRequested: { connect: { id: args.danceId } }
          },
          update: { classesRequested: { connect: { id: args.danceId } } }
        },
        `{
        id
      }`
      );
    }
    return { messgage: "Success!! - Requested!" };
  },
  async removeClassFromRequest(parent, args, ctx, info) {
    // TODO make sure class is in requests
    // remove danceCLass from classesRequested
    const enrollmentRequest = await ctx.db.mutation.updateEnrollmentRequest(
      {
        where: { id: args.requestId },
        data: { classesRequested: { disconnect: { id: args.danceClassId } } }
      },
      `{classesRequested{name}}`
    );
    if (enrollmentRequest.classesRequested.length === 0) {
      await ctx.db.mutation.deleteEnrollmentRequest(
        {
          where: { id: args.requestId }
        },
        info
      );
    }
  },
  async confirmEnrollmentRequest(parent, args, ctx, info) {
    // 1. confirm danceClass is in Studio.danceClasses?...
    // 1a. Is class full?
    // 2. Add dancerId to danceClass.dancers
    const updatedDanceClass = await ctx.db.mutation.updateDanceClass(
      {
        where: { id: args.danceClassId },
        data: { dancers: { connect: { id: args.dancerId } } }
      },
      info
    );
    // 3. if the dancer is succesfully added to the dance:
    if (updatedDanceClass) {
      //3a. Add dancer to dancers field on studio type
      await ctx.db.mutation.updateStudio({
        where: { id: ctx.request.userId },
        data: { dancers: { connect: { id: args.dancerId } } }
      });
      //3a. Add Studio to Parent's Studios.(Studio is the logged in user here)
      await ctx.db.mutation.updateParent({
        where: { id: args.parentId },
        data: { studios: { connect: { id: ctx.request.userId } } }
      });
      // 4. remove danceCLassId from enrollmentRequest.classesRequested
      const enrollmentRequest = await ctx.db.mutation.updateEnrollmentRequest(
        {
          where: { id: args.requestId },
          data: { classesRequested: { disconnect: { id: args.danceClassId } } }
        },
        `{classesRequested{name}}`
      );
      if (enrollmentRequest.classesRequested.length === 0) {
        await ctx.db.mutation.deleteEnrollmentRequest(
          {
            where: { id: args.requestId }
          },
          info
        );
      }
    }
  },
  updateStudioClassCategory(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("You must be logged to edit Class Categories");
    }
    const { category } = args;
    const newItems = args.items.map(i => i.trim());
    return ctx.db.mutation.updateStudio(
      {
        data: {
          [category]: { set: newItems }
        },
        where: { id: ctx.request.userId }
      },
      info
    );
  },
  async createMakeupSet(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("You must be logged to create a Makeup Set");
    }

    return await ctx.db.mutation.createMakeupSet(
      {
        data: {
          studio: {
            connect: { id: ctx.request.userId }
          },
          ...args
        }
      },
      info
    );
  },
  async updateMakeupSet(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("You must be logged to edit a Makeup Set");
    }
    const makeupSetId = args.id;
    delete args.id;
    return await ctx.db.mutation.updateMakeupSet(
      {
        data: { ...args },
        where: { id: makeupSetId }
      },
      info
    );
  },

  async createHairStyle(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("You must be logged to create a hairstyle");
    }
    return await ctx.db.mutation.createHairStyle(
      {
        data: {
          studio: {
            connect: { id: ctx.request.userId }
          },
          ...args
        }
      },
      info
    );
  },
  async updateHairStyle(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("You must be logged to edit a Makeup Set");
    }
    const HairStyleId = args.id;
    delete args.id;

    await ctx.db.mutation.updateHairStyle(
      {
        data: { ...args },
        where: { id: HairStyleId }
      },
      info
    );
  },
  async deleteHairStyle(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("You must be logged in to delete a HairStyle");
    }
    return await ctx.db.mutation.deleteHairStyle(
      {
        where: { id: args.id }
      },
      info
    );
  },
  async linkDancerToStudio(parent, args, ctx, info) {
    return await ctx.db.mutation.updateStudio(
      {
        where: {
          id: args.studioId
        },
        data: {
          dancers: { connect: { id: args.dancerId } }
        }
      },
      info
    );
  },
  async createCustomRoutine(parent, args, ctx, info) {
    const dancerIds = args.dancerIds;
    const studioId = args.studio;
    delete args.dancerIds;
    delete args.studio;
    if (dancerIds.length === 1) {
      return await ctx.db.mutation.createCustomRoutine(
        {
          data: {
            parent: {
              connect: { id: ctx.request.userId }
            },
            dancers: {
              connect: { id: dancerIds[0] }
            },
            ...(studioId !== "none" && {
              studio: {
                connect: { id: studioId }
              }
            }),
            custom: true,
            ...args
          }
        },
        info
      );
    } else {
      const newRoutine = await ctx.db.mutation.createCustomRoutine(
        {
          data: {
            parent: {
              connect: { id: ctx.request.userId }
            },

            ...(studioId !== "none" && {
              studio: {
                connect: { id: studioId }
              }
            }),
            custom: true,
            ...args
          }
        },
        info
      );

      dancerIds.forEach(
        async dancerId =>
          await ctx.db.mutation.updateCustomRoutine(
            {
              where: { id: newRoutine.id },
              data: {
                dancers: {
                  connect: { id: dancerId }
                }
              }
            },
            `{id}`
          )
      );
    }
  },
  async updateCustomRoutine(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("You must be logged in to add a Note");
    }
    //check if userID matches parent id on dance to update?
    const updates = { ...args };
    delete updates.id;
    // if there is music coming in with the update, check if there is old music to delete from cloudinary
    if (args.musicId) {
      //if there is existing music, delete it - the id will be sent in with args.
      const oldRoutine = await ctx.db.query.customRoutine({
        where: {
          id: args.id
        }
      });

      if (oldRoutine.musicId) {
        await cloudinary.uploader.destroy(
          oldRoutine.musicId,
          { invalidate: "true", resource_type: "video" },
          function(error, result) {
            "result:", result, "error:", error;
          }
        );
      }
    }
    //update routine
    return await ctx.db.mutation.updateCustomRoutine(
      {
        where: { id: args.id },
        data: updates
      },
      info
    );
  },
  async addNote(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("You must be logged in to add a Note");
    }
    const danceClassId = args.danceId;
    delete args.danceId;
    return await ctx.db.mutation.createParentNote(
      {
        data: {
          parent: { connect: { id: ctx.request.userId } },
          dance: { connect: { id: danceClassId } },
          ...args
        }
      },
      info
    );
  },
  async deleteParentNote(parent, args, ctx, info) {
    return await ctx.db.mutation.deleteParentNote(
      {
        where: { id: args.noteId }
      },
      info
    );
  },
  async updateParentNote(parent, args, ctx, info) {
    const noteId = args.noteId;
    delete args.noteId;
    return await ctx.db.mutation.updateParentNote(
      {
        where: { id: noteId },
        data: { ...args }
      },
      info
    );
  },
  async createStudioEvent(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("You must be logged in to create an Event");
    }
    return await ctx.db.mutation.createStudioEvent(
      {
        data: {
          ...args,
          studio: { connect: { id: ctx.request.userId } },
          appliesTo: { set: args.appliesTo }
        }
      },
      info
    );
  },
  async createCustomEvent(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("You must be logged in to create an Event");
    }
    return await ctx.db.mutation.createParentEvent(
      {
        data: {
          ...args,
          parent: { connect: { id: ctx.request.userId } },
          dancerIds: { set: args.dancerIds }
        }
      },
      info
    );
  },
  async deleteCloudinaryAsset(parent, args, ctx, info) {
    await cloudinary.uploader.destroy(
      args.publicId,
      {
        invalidate: true,
        resource_type: args.resourceType
      },
      function(error, result) {
        if (error) throw new Error("error deleting asset", error);
        return result;
      }
    );
  },
  async requestStudioAccess(parent, args, ctx, info) {
    const accessRequest = await ctx.db.mutation.createAccessRequest(
      {
        data: {
          parent: {
            connect: {
              id: ctx.request.userId
            }
          },
          studio: { connect: { id: args.studioId } }
        }
      },
      info
    );
    return await ctx.db.mutation.updateParent(
      {
        where: { id: ctx.request.userId },
        data: { accessRequests: { set: args.accessRequests } }
      },
      info
    );
  }
};

module.exports = Mutations;
