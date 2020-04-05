const express = require("express");
const logger = require("morgan");
const mongoose = require("mongoose");
const compression = require("compression");

const app = express();
app.use(logger("dev"));
app.use(compression());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("./public"));

let PORT = process.env.PORT || 3000;
let uristring=
  process.env.MONGODB_URI ||
  "mongodb://localhost/budget";

mongoose.connect(uristring, function (err,res) {
  if(err){
    console.log (`ERROR connecting to ${uristring}.  Error: ${err}`);
  } else {
    console.log(`Succeeded connected to ${uristring}`);
  }
});

app.use(require("./routes/api.js"));
app.listen(PORT, () => {
  console.log(`App running on port ${PORT}!`);
});