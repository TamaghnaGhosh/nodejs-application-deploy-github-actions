// import express from "express";
// const app = express();
// const PORT = process.env.PORT ?? 8080;

// app.get('/', (req, res) => {
//     return res.json({ message: 'Hello From the server' });
// });


// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });


const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("Taskflow API is running");
});

app.listen(8080, "0.0.0.0", () => {
  console.log("Server running on port 8080");
});