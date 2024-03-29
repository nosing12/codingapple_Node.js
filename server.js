const express = require("express");
const app = express();

app.use(express.static(__dirname + "/public"));

app.listen(8080, () => {
  console.log("http://localhost:8080 에서 서버 실행중");
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/about", (req, res) => {
  res.sendFile(__dirname + "/about.html");
});

app.get("/news", (req, res) => {
  res.send("오늘 비옴");
});

app.get("/shop", (req, res) => {
  res.send("쇼핑페이지입니다~");
});
