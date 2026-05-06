require('dotenv').config();

const express = require('express');
const { getPool } = require('./db');
const citiesRouter = require('./routes/cities');
const hotelsRouter = require('./routes/hotels');

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());
app.locals.getPool = getPool;

app.use('/cities', citiesRouter);
app.use('/hotels', hotelsRouter);
app.use('/hotel', hotelsRouter);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Running on port ${PORT}`);
  });
}

module.exports = app;
