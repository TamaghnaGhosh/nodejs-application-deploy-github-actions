import express from "express";


const app = express();
const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
    return res.json({ message: "Hello Server" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
