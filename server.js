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

var PORT = process.env.PORT || 3000;

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

    //remove previous data and update with new ones
    db.Article.remove({},
      function(err) {
        if (err) {
          console.log(err);
        }
    });

    // with cheerio, find each div with class "css-1qiat4j" and loop through the results
    $("div.css-1qiat4j").each(function(i, element) {

      //save results into new object
      var result = {};

      // save the text of the h2 tag as "title"
      result.title = $(element).find("h2").find("span").text();

      // Find the parent a-tag and save as "link"
      result.link = $(element).find("a").attr("href");

      // save body text as "bodyText"
      result.bodyText = $(element).find("li").text();

      // save image
      result.image = $(element).find("a").find("img").attr("src");

      //if the article has a title, link, and body: make an object with data we scraped and push into array
      if(result.title && result.link && result.bodyText) {

        db.Article.create(result)
          .then(function(dbArticle) {
            console.log(dbArticle);
          })
          .catch(function(err) {
            console.log(err);
          });
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
app.get("/save/:id", function(req,res) {
  db.Article.findOneAndUpdate({ _id: req.params.id }, { saved: true })
    .then(function(dbArticle) {
      res.json(dbArticle);
    })
    .catch(function(err) {
      res.json(err);
    });
});

//Route to remove one articles from saved
app.delete("/remove-save/:id", function(req,res) {
  db.Article.findByIdAndDelete({ _id: req.params.id }, { saved: true },
    function(err) {
      if (err) {
        console.log(err);
      }
  });
});

//Route for clear all articles from main
app.delete("/clear-all", function(req,res) {
  db.Article.deleteMany({ saved: false },
    function(err) {
      if (err) {
        console.log(err);
      }
  });
});

//Route for clear all articles from saved
app.delete("/clear-saved", function(req,res) {
  db.Article.deleteMany({ saved: true },
  function(err) {
    if (err) {
      console.log(err);
    }
  });
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
