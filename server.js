require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const userRoutes = require("./api/v1/routes/users");
const { createUser } = require("./api/v1/services/userService");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use("/secreloapis/v1/users", userRoutes);

const PORT = 3004;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
});
