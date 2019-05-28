var express = require("express");
var exphbs = require("express-handlebars");
var mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

app.engine("handlebars", exphbs({defaultLayout: "main"}));
app.set("view engine","handlebars");
// Configure middleware

// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/scrapeNews";

mongoose.connect(MONGODB_URI);


/************************** */
app.get("/scrape", function(req,res) {

  axios.get("https://www.nytimes.com/").then(function(response) {
    // load body of the HTML into cheerio
    var $ = cheerio.load(response.data);

    // with cheerio, find each div with class "css-1qiat4j" and loop through the results
    $("div.css-1qiat4j").each(function(i, element) {

      var result = {};

      // save the text of the h2 tag as "title"
      result.title = $(element).find("h2").find("span").text();

      // Find the parent a-tag and save as "link"
      result.link = $(element).find("a").attr("href");

      // save body text as "bodyText"
      result.bodyText = $(element).find("li").text();

      //if the article has a title, link, and body: make an object with data we scraped and push into array
      if(result.title && result.link && result.bodyText) {

        db.Article.create(result)
          .then(function(dbArticle) {
            console.log(dbArticle);
          })
          .catch(function(err) {
            console.log(err);
          });
        // db.Article.create({
        //   title: title,
        //   link: link,
        //   bodyText: bodyText,
        // });
      }
    });

    //send message that scrape is complete
    res.send("Scrape Complete");
  });
});

//Route for grabbing the articles from db
app.get("/", function(req, res) {
  db.Article.find({})
    .then(function(dbArticle) {
    res.render("articles", {items: dbArticle});
  });
});

//Route for saving an article
app.post("/articles/:id", function(req,res) {
  db.Note.create(req.body)
    .then(function(dbNote) {
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, {new: true});
    })
    .then(function(dbArticle) {
      res.json(dbArticle);
    })
    .catch(function(err) {
      res.json(err);
    })
});

//Route for saved articles
app.get("/saved", function(req,res) {
  db.Article.find({})
    .then(function(dbArticle) {
      res.render("saved", {items:dbArticle});
    });
});

/************** */


// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
