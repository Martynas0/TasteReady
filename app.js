const express = require("express");
const ejs = require("ejs");
const db = require("./my_modules/db.js");
const multer = require("multer");
const passport = require('passport');
const expressSession = require('express-session')({
  secret: 'smallfurrykittens',
  resave: false,
  saveUninitialized: false
});



require('dotenv').config()


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname + '/public/uploads')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + ".png")
  }
})

const mailchimp = require("@mailchimp/mailchimp_marketing");

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY,
  server: process.env.MAILCHIMP_SERVER
});



const upload = multer({ storage: storage })

const app = express();

app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(expressSession);
app.use(passport.initialize());
app.use(passport.session());


////// PASSPORT

passport.use(db.User.createStrategy());

passport.serializeUser(db.User.serializeUser());
passport.deserializeUser(db.User.deserializeUser());




///////////////////////////////



app.get("/", async (req, res) => {
  const recentDocs = await db.post.find().sort({ _id: -1 }).limit(3);
  const popularDocs = await db.post.find().sort({likes: -1}).limit(3);


  res.render("home", {recentPosts: recentDocs, popularPosts: popularDocs});

})

app.get("/login", (req, res) => {
  res.render("login");
})

app.get("/recipes", (req, res) => {
  db.post.find((err, docs) => {
    res.render("recipes", {recipes: docs});
  })

})

app.get("/contact", (req, res) => {
  res.render("contact");
})

app.get("/write", (req, res) => {
if(req.isAuthenticated()){
  res.render("write")
}
else{
  res.redirect("/login");
}



})

app.get("/posts/:postId", async (req, res) => {

const postDoc = await db.post.findOne({_id: req.params.postId});

  res.render("thisPost", {post: postDoc});

})

////////////// POST


app.post('/login', (req, res, next) => {
  passport.authenticate('local',
  (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.redirect("/login");
    }

    req.logIn(user, function(err) {
      if (err) {
        return next(err);
      }

      return res.redirect('/write');
    });

  })(req, res, next);
});

app.post("/subscribe", (req, res) => {
  const listId = process.env.MAILCHIM_LIST_ID;
  const subscribingUser = {
  name: req.body.name,
  email: req.body.email
};

async function run() {
  const response = await mailchimp.lists.addListMember(listId, {
    email_address: subscribingUser.email,
    status: "subscribed",
    fName: subscribingUser.name
  });

  console.log(
    `Successfully added contact as an audience member. The contact's id is ${
      response.id
    }.`
  );

  res.redirect("/");
}

run();
})

app.post("/posts/search", (req, res) => {
  const query = req.body.searchQuery;
  db.post.find({title: {$regex : new RegExp(query, "i") }}, (err, docs) => {
    res.render("searchResults", {recipes: docs, query: query});
  })
})

app.post("/likePost", (req, res) => {
  db.post.findOne({_id: req.body.postId}, async (err, doc) => {
    doc.likes++;
    await doc.save();
    res.redirect("/posts/" + req.body.postId);
  })
})

app.post("/posts/addcomment", (req, res) => {

 const date = new Date();
 const options = {year: 'numeric', month: 'numeric', day: 'numeric'};

  const newPost = {
    author: req.body.author,
    commentBody: req.body.commentBody,
    date: date.toLocaleDateString('en-US', options)
  }

  db.post.updateOne({_id: req.body.postId }, {$push : { comments: newPost}}, (err, result) => {
    if(err){
      console.log(err);
    }else{
      res.redirect("/posts/" + req.body.postId);
    }
  })
})

app.post("/addNewPost", upload.single("image"), function(req, res){
  const newPost = new db.post({
    title: req.body.title,
    shortDesc: req.body.shortDesc,
    content: req.body.content,
    imageFileName: req.file.filename,
    likes: 0
  });
  newPost.save();
  res.redirect("/");
})

app.listen(3000, () => {
  console.log("Server is live on port 3000 !");
})
