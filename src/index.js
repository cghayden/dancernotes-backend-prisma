const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

require("dotenv").config({ path: "variables.env" });
const createServer = require("./createServer");
const db = require("./db");

const server = createServer();
//change here to demonstrate diff to heroku
//use EXP middleware to handle cookies (JWT)
server.express.use(cookieParser());

// TODO Use EXP middleware to populate current user - we will write a middle ware to get userId off of JWT and attach it to request
server.express.use((req, res, next) => {
  const { token } = req.cookies;
  if (token) {
    const { userId, userType } = jwt.verify(token, process.env.APP_SECRET);
    req.userId = userId;
    req.userType = userType;
  }
  next();
});

//2. create a middleware that populates the user on each request to check user properties on the backend in queries and mutations
// todo - Do I NEED THIS?  currently not being used.
server.express.use(async (req, res, next) => {
  // if logged in, userid & userType is available on request, thanks to our middleware we wrote above
  // if not logged in, skip this (no user to populate)
  if (!req.userId) {
    return next();
  }
  if (req.userType === "parent") {
    const user = await db.query.parent(
      { where: { id: req.userId } },
      "{id, email, firstName}"
    );
    req.user = user;
  } else if (req.userType === "studio") {
    const user = await db.query.studio(
      { where: { id: req.userId } },
      "{id, email, studioName}"
    );
    // console.log("user", user);
    req.user = user;
  }
  next();
});
server.start(
  {
    cors: {
      credentials: true,
      origin: [process.env.FRONTEND_URL, "https://www.dancernotes.com"],
      secure: true
    }
  },
  deets => {
    console.log(`Server is now running on port http:/localhost:${deets.port}`);
  }
);
