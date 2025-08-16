/* ******************************************
 * This server.js file is the primary file of the
 * application. It is used to control the project.
 *******************************************/
/* ***********************
 * Require Statements
 *************************/
const cookieParser = require("cookie-parser");
const session = require("express-session");
const pool = require("./database/");
const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const env = require("dotenv").config();
const app = express();
const static = require("./routes/static");
const baseController = require("./controllers/baseController");
const inventoryRoute = require("./routes/inventoryRoute");
const utilities = require("./utilities");
const accountRoute = require("./routes/accountRoute");
const cartRoute = require("./routes/cartRoute");
const bodyParser = require("body-parser");
const path = require("path");


/* ***********************
 * Middleware
 *************************/
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Add this line for form data

app.use(
	session({
		store: new (require("connect-pg-simple")(session))({
			createTableIfMissing: true,
			pool,
		}),
		secret: process.env.SESSION_SECRET,
		resave: true,
		saveUninitialized: true,
		name: "sessionId",
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development', // true on Render
            sameSite: process.env.NODE_ENV !== 'development' ? 'none' : 'lax',
            maxAge: 1000 * 60 * 60 * 2 // 2 hours
        }
	})
); 

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// Tell express it is behind a proxy (Render/Heroku, etc.) so it correctly sets secure cookies
app.set('trust proxy', 1);

//temporary logging 
require("dotenv").config();
console.log("ACCESS_TOKEN_SECRET:", process.env.ACCESS_TOKEN_SECRET ? "SET" : "NOT SET");
console.log("SESSION_SECRET:", process.env.SESSION_SECRET ? "SET" : "NOT SET");

// Express Messages Middleware
app.use(require("connect-flash")());
app.use(function (req, res, next) {
	res.locals.messages = require("express-messages")(req, res);
	next();
});

app.use(cookieParser());

app.use(utilities.checkJWTToken);
// Add this line after checkJWTToken middleware
app.use(utilities.setCartCount);

/* ***********************
 * View Engine and Templates
 *************************/
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "./layouts/layout");

/* ***********************
 * Static Files - Add this before your routes
 *************************/
app.use(express.static("public"));
app.use("/css", express.static(path.join(__dirname, "public", "css")));
app.use("/js", express.static(path.join(__dirname, "public", "js")));
app.use("/images", express.static(path.join(__dirname, "public", "images")));

/* ***********************
 * Routes
 *************************/
app.use(static);
app.use("/inv", inventoryRoute);
app.use("/account", accountRoute);
app.use("/cart", cartRoute);

// Index route
app.get("/", utilities.handleErrors(baseController.buildHome));

// File Not Found Route - must be last route in list
app.use(
	utilities.handleErrors(async (req, res, next) => {
		next({
			status: 404,
			message:
				"Sorry, we appear to have lost that page. I guess we broke the steering Wheel on that link, we'll just have to carpool <a href='/'>home</a>",
		});
	})
);

/* ***********************
 * Express Error Handler
 * Place after all other middleware
 *************************/
app.use(async (err, req, res, next) => {
    // Enhanced logging to find the exact error source
    console.error('=== ERROR DETAILS ===');
    console.error(`URL: ${req.originalUrl}`);
    console.error(`Method: ${req.method}`);
    console.error(`Error Message: ${err.message}`);
    console.error(`Error Status: ${err.status}`);
    console.error('Stack trace:');
    console.error(err.stack);
    console.error('=== END ERROR DETAILS ===');

    let nav;
    try {
        nav = await utilities.getNav();
    } catch (navError) {
        console.error('Error getting nav:', navError.message);
        nav = '<ul><li><a href="/">Home</a></li></ul>'; // Fallback nav
    }

    const message = err.status == 404 
        ? err.message
        : "OOPS!! We broke the steering Wheel on that request, guess we'll just have to carpool <a href='/'>home</a>";

    res.render("errors/error", {
        title: err.status || "Server Error",
        message,
        nav,
    });
});


/* ***********************
 * Local Server Information
 * Values from .env (environment) file
 *************************/
const port = process.env.PORT || 5500;
const host = process.env.HOST || "localhost";

/* ***********************
 * Log statement to confirm server operation
 *************************/
app.listen(port, () => {
	console.log(`Server runnning on Port ${host} ${port}`);
});
