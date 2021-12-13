const mongoose = require("mongoose");
const passportLocalMongoose = require('passport-local-mongoose');

mongoose.connect("mongodb://localhost:27017/foodBlogDB");

const postSchema = new mongoose.Schema({
  title: String,
  shortDesc: String,
  content: String,
  imageFileName: String,
  likes: Number,
  comments: [
    {
      author: String,
      commentBody: String,
      date: String
    }
  ]
})

const userSchema = new mongoose.Schema({
  username: String,
  password: String
});

userSchema.plugin(passportLocalMongoose);


const Post = mongoose.model("post", postSchema);
const User = mongoose.model("user", userSchema);


exports.post = Post;
exports.User = User;
