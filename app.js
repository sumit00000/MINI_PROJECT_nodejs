const express = require('express')
const app = express();
const userModel = require("./models/user");
const postModel = require("./models/post")
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { default: mongoose } = require('mongoose');
const post = require('./models/post');
const crypto = require('crypto');
const path = require('path');
const multerconfig = require("./config/multerconfig");
const upload = require('./config/multerconfig');



app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname,"public")));  // because we use static image of as a dp profile 
app.use(cookieParser());


// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, './public/images/uploads')
//     },
//     filename: function (req, file, cb) {
//         crypto.randomBytes(12, function (err, bytes) {
//             // console.log(bytes.toString("hex"));
//             const fn = bytes.toString("hex") + path.extname(file.originalname)  
//             cb(null, fn)
//         })
//     }
// })
// const upload = multer({ storage: storage})

app.get('/', (req, res) => {
    // console.log("hey");
    // res.send("hey");
    res.render("index");
});

app.get('/profile/upload', (req, res) => {

    res.render("profileupload");
});


app.post('/upload', isLoggedIn, upload.single("image"), async (req, res) => {
    // console.log(req.file);
    let user = await userModel.findOne({email: req.user.email});
    user.profilepic = req.file.filename;
    await user.save()
    res.redirect("/profile");
});


app.get("/login", (req, res) => {
    res.render("login")

});

// app.get("/test", (req, res) => {
//     // console.log(req.file);                    //req.body have text files and req.file has files data
//     res.render("test");                  
// });

// app.post("/upload", upload.single("image"), (req, res) => {
//     console.log(req.file);
// });

app.get("/profile", isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({email: req.user.email}).populate("posts")  //to get detail of login user in profile route
    // user.populate("posts")//wrong 
    // console.log(user);
    // console.log(user.posts);
    res.render("profile", {user}); // after geting detail of user we can send it to profile route here

});

app.get("/like/:id", isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({_id: req.params.id}).populate("user")  
    
    // console.log(req.user);
    if(post.likes.indexOf(req.user.userid) === -1){  // in this we check if userid is not present in likes array then we push mean add like 
        post.likes.push(req.user.userid);
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);// else we use slice to remove userid only  1
    }
    

    await post.save();
    res.redirect("/profile"); 

});


app.get("/edit/:id", isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({_id: req.params.id}).populate("user")  
    
     res.render("edit", {post})
});

app.post("/update/:id", isLoggedIn, async (req, res) => {
    let post = await postModel.findOneAndUpdate({_id: req.params.id}, {content: req.body.content})  
    
     res.redirect("/profile");
});


app.post("/post", isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({email: req.user.email})  //to get detail of login user in profile route
    let {content} = req.body;
    
    let post = await postModel.create({
        user: user._id,
        content
    });

    user.posts.push(post._id);
    console.log("save post prosess");
    await user.save();
    res.redirect("/profile");  
});

app.post('/register', async (req, res) => {
    let {email, password, username, name, age} = req.body;
    let user = await userModel.findOne({email});
    if(user) return res.status(500).send("User Already Register");
    
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            // console.log(hash);
            let user = await userModel.create({
                username,
                email,
                age,
                name,
                password:hash,
            });
            let token = jwt.sign({email: email, userid: user._id}, "shhh");
            res.cookie("token", token);
            res.send("registered");
        })
    })


});

app.post('/login', async (req, res) => {
    let {email, password} = req.body;
    let user = await userModel.findOne({email});
    if(!user) return res.status(500).send("somthing went wrong");
    
    bcrypt.compare(password, user.password, function (err, result){
        if(result) {
            let token = jwt.sign({email: email, userid: user._id}, "shhh");
            res.cookie("token", token);
            // res.status(200).send("you can login");
            res.status(200).redirect("/profile");



        }
        else res.redirect("/login");
    });


});

app.get('/logout', (req, res) => {
    res.cookie("token", "");
    res.redirect("/login");
});

function isLoggedIn (req, res, next){
    //  console.log(req.cookies);
    if(req.cookies.token === "") {
        res.redirect("login");
    }
    else{
        let data = jwt.verify(req.cookies.token, "shhh");
        req.user = data;
        next();
    }
    
}

app.listen(3000);

