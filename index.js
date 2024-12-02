const express = require("express");
const app = express();
const port = process.env.PORT || 4000;
const expressHandlebars = require("express-handlebars");
const { createPagination } = require("express-handlebars-paginate");
const {
  formatTime,
  formatDate,
  formatDate2,
  formatDate3,
  truncateId,
  getInitials,
} = require("./controllers/shared");
const flash = require("connect-flash");
const session = require("express-session");
const passport = require("./controllers/passport");
const { ensureAuthenticated } = require("./middlewares/auth");
const connectDB = require("./connectDB");
connectDB();

// Cấu hình static folder
app.use(express.static(__dirname + "/public"));

// Cấu hình view engine
app.engine(
  "hbs",
  expressHandlebars.engine({
    layoutsDir: __dirname + "/views/layouts",
    partialsDir: __dirname + "/views/partials",
    extname: "hbs",
    defaultLayout: "layout",
    runtimeOptions: { allowProtoPropertiesByDefault: true },
    helpers: {
      createPagination,
      formatTime,
      formatDate,
      formatDate2,
      formatDate3,
      truncateId,
      getInitials,
      eq: (a, b) => a === b,
    },
  })
);

app.set("view engine", "hbs");

// Cấu hình session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "session secret",
    resave: false,
    saveUninitialized: true,
  })
);

// Cấu hình flash
app.use(flash());

// Cấu hình body-parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cấu hình passport
app.use(passport.initialize());
app.use(passport.session());

// middleware lấy thông tin đăng nhập
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.isAuthenticated();
  res.locals.currentUser = req.user;
  res.locals.error_msg = req.flash("error_msg");
  res.locals.success_msg = req.flash("success_msg");
  next();
});

// routes
app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect("/dashboard");
  } else {
    res.redirect("/login");
  }
});
app.use("/login", require("./routes/loginRouter"));
app.use("/register", require("./routes/registerRouter"));
app.use("/logout", require("./routes/logoutRouter"));
app.use("/dashboard", ensureAuthenticated, require("./routes/dasdboardRouter"));
app.use("/project", ensureAuthenticated, require("./routes/projectRouter"));
app.use(
  "/administration",
  ensureAuthenticated,
  require("./routes/administrationRouter")
);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});
