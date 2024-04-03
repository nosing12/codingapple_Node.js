const router = require("express").Router();

let connectDB = require("./../database.js");

let db;
connectDB
  .then((client) => {
    console.log("DB연결성공");
    db = client.db("PLUP");
  })
  .catch((err) => {
    console.log(err);
  });

router.get("/shirts", (req, res) => {
  res.send("셔츠파는 페이지임");
});
router.get("/pants", (req, res) => {
  res.send("바지파는 페이지임");
});

module.exports = router;
