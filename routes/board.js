const router = require("express").Router();

function checkLogin(req, res, next) {
  if (true) {
    console.log("성공");
  } else {
    next();
  }
}

router.get("/sports", (req, res) => {
  res.send("스포츠 게시판");
});
router.get("/game", (req, res) => {
  res.send("게임 게시판");
});

module.exports = router;
