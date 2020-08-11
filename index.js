const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const yup = require("yup");
const { nanoid } = require("nanoid");
const monk = require("monk");

require("dotenv").config();

const db = monk(process.env.MONGO_URI);
const urls = db.get("urls");
urls.createIndex({ alias: 1 }, { unique: true });

const app = express();

app.use(helmet());
app.use(morgan("tiny"));
app.use(cors());
app.use(express.json());
app.use(express.static("./public"));

const schema = yup.object().shape({
  alias: yup
    .string()
    .trim()
    .matches(/[\w\-]/i),
  url: yup.string().trim().url().required(),
});

app.post("/url", async (req, res, next) => {
  let { alias, url } = req.body;

  try {
    schema.validate({
      alias,
      url,
    });

    if (!alias) {
      alias = nanoid(7);
    } else {
      const exist = await urls.findOne({
        alias: alias,
      });
      if (exist) {
        throw new Error("Alias in use");
      }
    }
    alias = alias.toLowerCase();

    const newurl = {
      url,
      alias,
    };

    const newcreate = await urls.insert(newurl);

    res.json(newcreate);
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  if (error.status) {
    res.status(error.status);
  } else {
    res.status(500);
  }
  res.json({
    message: error.message,
  });
});

app.get("/:id", async (req, res, next) => {
  const { id: alias } = req.params;
  try {
    const url = await urls.findOne({
      alias: alias,
    });
    if (url) {
      res.redirect(url.url);
    }
    res.redirect("/?=NotFound");
  } catch (error) {
    res.redirect("/?=Wth");
  }
});

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log("Listening at port:" + port);
});
