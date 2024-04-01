const express = require("express");
const app = express();
const { MongoClient, ObjectId } = require("mongodb");
const methodOverride = require("method-override");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const MongoStore = require("connect-mongo");
require("dotenv").config();

app.use(passport.initialize());
app.use(
  session({
    secret: "암호화에 쓸 비번",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 },
    store: MongoStore.create({
      mongoUrl: process.env.DB_URL,
      dbName: "PLUP",
    }),
  })
);

app.use(passport.session());
app.use(methodOverride("_method"));
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = new S3Client({
  region: "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRET,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: "codingappleplup",
    key: function (req, file, cb) {
      cb(null, Date.now().toString()); //업로드시 파일명 변경가능
    },
  }),
});

let db;
const url = process.env.DB_URL;
new MongoClient(url)
  .connect()
  .then((client) => {
    console.log("DB연결성공");
    db = client.db("PLUP");
    app.listen(process.env.PORT, () => {
      console.log("http://localhost:8080 에서 서버 실행중");
    });
  })
  .catch((err) => {
    console.log(err);
  });

app.get("/find", (req, res) => {
  res.render("find.ejs");
});

app.get("/recruit/:page", async (req, res) => {
  try {
    const totalPageNumber = Math.ceil(
      (await db.collection("team").find().toArray()).length / 6
    );
    if (req.params.page > totalPageNumber) {
      res.status(404).send("페이지를 찾을 수 없음");
    } else {
      let result = await db
        .collection("team")
        .find()
        .skip((req.params.page - 1) * 6)
        .limit(6)
        .toArray();
      res.render("recruit.ejs", {
        result: result,
        totalPageNumber: totalPageNumber,
      });
    }
  } catch (e) {
    res.status(500).send("서버에러남");
  }
});
// 1. 유저가 /detail/어쩌구 접속하면
// 2. {_id:어쩌구} 글을 DB에서 찾아서
// 3. ejs 파일에 박아서 보내줌
app.get("/detail/:id", async (req, res) => {
  try {
    const result = await db
      .collection("team")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (result === null) {
      res.status(404).send("이상한 url 입력함");
    }
    res.render("detail.ejs", { result: result });
  } catch (e) {
    console.log(e);
    res.status(404).send("이상한 url 입력함");
  }
});

app.get("/register", async (req, res) => {
  res.render("register.ejs");
});

app.get("/createTeam", (req, res) => {
  res.render("createTeam.ejs");
});

app.post("/createTeam", upload.single("teamLogo"), async (req, res) => {
  console.log(req.file.location);
  try {
    if (req.body.name == "") {
      res.send("이름 입력안했는데?");
    } else {
      await db.collection("team").insertOne({
        name: req.body.name,
        district: req.body.district,
        process: req.body.process,
        logo: req.file.location,
      });
      res.redirect("/recruit/1");
    }
  } catch (e) {
    console.log(e);
    res.status(500).send("서버에러남");
  }
});

app.get("/edit/:id", async (req, res) => {
  // db.collection("post").updateOne({ a: 1 }, { $set: { a: 2 } });
  const result = await db
    .collection("post")
    .findOne({ _id: new ObjectId(req.params.id) });
  res.render("edit.ejs", { result: result });
});

app.put("/edit", async (req, res) => {
  try {
    if (req.body.title == "") {
      res.send("제목입력안했는데?");
    } else {
      const result = await db
        .collection("post")
        .updateOne(
          { _id: new ObjectId(req.body.id) },
          { $set: { title: req.body.title, content: req.body.content } }
        );
      res.redirect("/list");
    }
  } catch (e) {
    console.log(e);
    res.status(500).send("서버에러남");
  }
});

app.delete("/delete", async (req, res) => {
  await db.collection("post").deleteOne({ _id: new ObjectId(req.query.docid) });
  res.send("삭제완료");
});

app.get("/list/:id", async (req, res) => {
  let result = await db
    .collection("post")
    .find()
    .skip((req.params.id - 1) * 5)
    .limit(5)
    .toArray();
  res.render("list.ejs", { posts: result });
});

app.get("/list/next/:id", async (req, res) => {
  let result = await db
    .collection("post")
    .find({ _id: { $gt: new ObjectId(req.params.id) } })
    .limit(5)
    .toArray();
  res.render("list.ejs", { posts: result });
});

passport.use(
  new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    let result = await db
      .collection("user")
      .findOne({ username: 입력한아이디 });
    if (!result) {
      return cb(null, false, { message: "아이디 DB에 없음" });
    }

    if (await bcrypt.compare(입력한비번, result.password)) {
      return cb(null, result);
    } else {
      return cb(null, false, { message: "비번불일치" });
    }
  })
);

passport.serializeUser((user, done) => {
  process.nextTick(() => {
    done(null, { id: user._id, username: user.username });
  });
});

passport.deserializeUser(async (user, done) => {
  let result = await db
    .collection("user")
    .findOne({ _id: new ObjectId(user.id) });
  delete result.password;
  process.nextTick(() => {
    done(null, result);
  });
});

function checkId(req, res, next) {
  if (req.body.username === "" || req.body.password === "") {
    res.send("그러지마세요");
  } else {
    next();
  }
}

app.get("/login", async (req, res) => {
  res.render("login.ejs");
});

app.post("/login", checkId, async (req, res, next) => {
  passport.authenticate("local", (error, user, info) => {
    if (error) return res.status(500).json(error);
    if (!user) return res.status(401).json(info.message);
    req.logIn(user, (err) => {
      if (err) return next(err);
      res.redirect("/recruit/1");
    });
  })(req, res, next);
});

app.get("/join", (req, res) => {
  res.render("join.ejs");
});

app.post("/join", async (req, res) => {
  const 해시 = await bcrypt.hash(req.body.password, 10);
  try {
    if (req.body.password !== req.body.checkPassword) {
      res.send("비밀번호가 일치하지 않습니다.");
    } else if (req.body.username === "") {
      res.send("아이디를 입력하세요");
    } else if (req.body.password === "") {
      res.send("비밀번호를 입력하세요");
    } else {
      await db
        .collection("user")
        .insertOne({ username: req.body.username, password: 해시 });
      res.redirect("/recruit");
    }
  } catch (e) {
    console.log(e);
    res.status(500).send("서버에러남");
  }
});

app.use("/shop", require("./routes/shop.js"));
