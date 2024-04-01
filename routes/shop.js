const router = require("express").Router();

router.get("/shirts", (req, res) => {
  res.send("셔츠파는 페이지임");
});
router.get("/pants", (req, res) => {
  res.send("바지파는 페이지임");
});

module.exports = router;
