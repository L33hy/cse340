const utilities = require("../utilities");
const accountModel = require("../models/account-model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

/* ****************************************
* Deliver login view
* *************************************** */
async function buildLogin(req, res, next) {
try {
const nav = await utilities.getNav();
res.render("account/login", {
title: "Login",
nav,
errors: null,
});
} catch (error) {
next(error);
}
}

/* ****************************************
* Deliver registration view
* *************************************** */
async function buildRegister(req, res, next) {
let nav = await utilities.getNav();
res.render("account/register", {
title: "Register",
nav,
errors: null, // This is already present
});
}

/* ****************************************
* Process Registration
* *************************************** */
async function registerAccount(req, res, next) {
try {
let nav = await utilities.getNav();
const {
account_firstname,
account_lastname,
account_email,
account_password,
} = req.body;

// Hash the password before storing
let hashedPassword;
try {
// regular password and cost (salt is generated automatically)
hashedPassword = bcrypt.hashSync(account_password, 10); // Remove await since hashSync is synchronous
} catch (error) {
req.flash(
"notice",
"Sorry, there was an error processing the registration."
);
res.status(500).render("account/register", {
title: "Registration",
nav,
errors: null,
});
return; // Add return to prevent further execution
}

const regResult = await accountModel.registerAccount(
account_firstname,
account_lastname,
account_email,
hashedPassword
);

if (regResult.rowCount > 0) {
req.flash(
"notice",
`Congratulations, you're registered ${account_firstname}. Please log in.`
);
res.status(201).render("account/login", {
title: "Login",
nav,
errors: null,
});
} else {
req.flash("notice", "Sorry, the registration failed.");
res.status(501).render("account/register", {
title: "Registration",
nav,
errors: null,
});
}
} catch (error) {
next(error);
}
}

/* ****************************************
* Process login request
* *************************************** */
async function accountLogin(req, res) {
let nav = await utilities.getNav();
const { account_email, account_password } = req.body;

try {
// Check if ACCESS_TOKEN_SECRET is available
if (!process.env.ACCESS_TOKEN_SECRET) {
console.error("ACCESS_TOKEN_SECRET is not set in environment variables");
req.flash("notice", "Server configuration error. Please contact administrator.");
res.status(500).render("account/login", {
title: "Login",
nav,
errors: null,
account_email,
});
return;
}

const accountData = await accountModel.getAccountByEmail(account_email);

if (!accountData) {
req.flash("notice", "Please check your credentials and try again.");
res.status(400).render("account/login", {
title: "Login",
nav,
errors: null,
account_email,
});
return;
}

if (await bcrypt.compare(account_password, accountData.account_password)) {
delete accountData.account_password;

// Fix: Use seconds for expiresIn, not milliseconds
const accessToken = jwt.sign(
accountData,
process.env.ACCESS_TOKEN_SECRET,
{ expiresIn: 3600 } // 1 hour in SECONDS
);

// Standardize cookie options by environment
const cookieOptions = (process.env.NODE_ENV === "development")
? { httpOnly: true, maxAge: 3600 * 1000, sameSite: "lax" }
: { httpOnly: true, secure: true, sameSite: "none", maxAge: 3600 * 1000 };

res.cookie("jwt", accessToken, cookieOptions);

req.flash("notice", `Welcome ${accountData.account_firstname}`);
res.locals.loggedin = 1;
res.locals.accountData = accountData;
return res.redirect("/account/");
} else {
req.flash("notice", "Please check your credentials and try again.");
res.status(400).render("account/login", {
title: "Login",
nav,
errors: null,
account_email,
});
}
} catch (error) {
// Enhanced error handling with more specific error messages
console.error("Login error:", error.message);
console.error("Full error:", error);

if (error.message.includes('secretOrPrivateKey')) {
req.flash("notice", "Server configuration error. Please contact administrator.");
} else {
req.flash("notice", "Sorry, there was an error processing the login. Please try again.");
}

res.status(500).render("account/login", {
title: "Login",
nav,
errors: null,
account_email,
});
}
}

/* ****************************************
* Process logout request
* *************************************** */
async function accountLogout(req, res) {
// Clear cookie with matching attributes for production
res.clearCookie("jwt", {
httpOnly: true,
secure: process.env.NODE_ENV !== "development",
sameSite: process.env.NODE_ENV !== "development" ? "none" : "lax",
});
res.locals.loggedin = 0;
res.locals.accountData = null;
req.flash("notice", "You have been logged out.");
return res.redirect("/");
}

/* ****************************************
* Deliver account management view
* *************************************** */
async function accountManagement(req, res, next) {
try {
const nav = await utilities.getNav();
res.render("account/accountManagement", {
title: "Account Management",
nav,
errors: null
});
} catch(error) {
next(error);
}
}

/* ****************************************
* Deliver account update view
* *************************************** */
async function buildAccountUpdate(req, res, next) {
try {
const account_id = parseInt(req.params.account_id)
const nav = await utilities.getNav()
res.render("account/update-account", {
title: "Update Account",
nav,
errors: null,
account_id,
})
} catch (error) {
next(error)
}
}

/* ****************************************
* Process Account Update
* *************************************** */
async function updateAccount(req, res, next) {
try {
let nav = await utilities.getNav()
const { 
account_id,
account_firstname,
account_lastname,
account_email,
} = req.body

const accountResult = await accountModel.updateAccount(
parseInt(account_id), // Ensure account_id is a number
account_firstname,
account_lastname,
account_email
)

if (accountResult) {
const accountData = await accountModel.getAccountById(parseInt(account_id))

// Check if ACCESS_TOKEN_SECRET is available before signing
if (!process.env.ACCESS_TOKEN_SECRET) {
console.error("ACCESS_TOKEN_SECRET is not set in environment variables");
req.flash("notice", "Server configuration error. Please contact administrator.");
res.status(500).render("account/update-account", {
title: "Edit Account",
nav,
errors: null,
...req.body
});
return;
}

// Fix: Use seconds for expiresIn, not milliseconds
const accessToken = jwt.sign(
accountData,
process.env.ACCESS_TOKEN_SECRET,
{ expiresIn: 3600 } // 1 hour in SECONDS
)

// Standardize cookie options by environment
const cookieOptions = (process.env.NODE_ENV === "development")
? { httpOnly: true, maxAge: 3600 * 1000, sameSite: "lax" }
: { httpOnly: true, secure: true, sameSite: "none", maxAge: 3600 * 1000 };

res.cookie("jwt", accessToken, cookieOptions);

// Update locals for immediate view update
res.locals.accountData = accountData

req.flash("notice", `The account information has been successfully updated.`)
res.redirect("/account/")
} else {
req.flash("notice", "Sorry, the update failed.")
res.status(501).render("account/update-account", {
title: "Edit Account",
nav,
errors: null,
...req.body
})
}
} catch (error) {
console.error("Error in updateAccount:", error)
next(error)
}
}

/* ****************************************
* Process Password Update
* *************************************** */
async function updatePassword(req, res, next) {
let nav = await utilities.getNav()
const { account_id, account_password } = req.body

// Hash the password
let hashedPassword
try {
hashedPassword = bcrypt.hashSync(account_password, 10)
} catch (error) {
req.flash("notice", "Sorry, there was an error processing the password update.")
res.status(500).render("account/update-account", {
title: "Edit Account",
nav,
errors: null,
account_id,
})
return
}

const passwordResult = await accountModel.updatePassword(
account_id,
hashedPassword
)

if (passwordResult) {
req.flash("notice", "The password has been successfully updated.")
res.redirect("/account/")
} else {
req.flash("notice", "Sorry, the password update failed.")
res.status(501).render("account/update-account", {
title: "Edit Account",
nav,
errors: null,
account_id,
})
}
}

module.exports = { 
buildLogin, 
buildRegister, 
registerAccount, 
accountLogin, 
accountManagement, 
accountLogout, 
buildAccountUpdate, // Add this to exports
updateAccount,
updatePassword,
};