const keys = require('./keys')
console.log({
    user: keys.POSTGRES_USER,
    host: keys.POSTGRES_HOST,
    database: keys.POSTGRES_DB,
    password: keys.POSTGRES_PASSWORD,
    port: parseInt(keys.POSTGRES_PORT)
})
const redis = require('redis')

// Express App Setup
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(bodyParser.json())

// Postgres Client Setup
const {Pool, Client} = require('pg')

// const pool = new Pool({
//     user: 'postgres',
//     host: 'postgres',
//     database: 'postgres',
//     password: 'postgres_password',
//     port: 5432
// })
//
// const client = new Client({
//     user: 'postgres',
//     host: 'postgres',
//     database: 'postgres',
//     password: 'postgres_password',
//     port: 5432
// })
// client.connect()
// client.query('SELECT NOW()', (err, res) => {
//     console.log(err, res)
//     client.end()
// })

const pgClient = new Client({
    user: keys.POSTGRES_USER,
    host: keys.POSTGRES_HOST,
    database: keys.POSTGRES_DB,
    password: keys.POSTGRES_PASSWORD,
    port: parseInt(keys.POSTGRES_PORT)
})

pgClient.on('error', () => console.log('Lost PG connection'))

pgClient
    .query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .then((res) => {
        console.log({res})
    })
    .catch(err => console.log({err}))

// Redis
const redisClient = redis.createClient({
    host: keys.REDIS_HOST,
    port: keys.REDIS_PORT,
    retry_strategy: () => 1000
})
const redisPublisher = redisClient.duplicate()

// Express route handlers
app.get('/', (req, res) => {
    res.send('Hi')
})

app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('SELECT * from values')

    console.log({values})
    res.send(values.rows)
})

app.get('/values/current', async (req, res) => {
    redisClient.hgetall('values', (err, values) => {
        res.send(values)
    })
})

app.post('/values', async (req, res) => {
    const index = req.body.index;

    if (parseInt(index) > 40) {
        return res.status(422).send('Index too high')
    }

    redisClient.hset('values', index, "Nothing yet!")
    redisPublisher.publish('insert', index)
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index])
        .then((res) => {
            console.log({res})
        })
        .catch(err => console.log({err}))

    res.send({
        working: true
    })
})

app.listen(5000, err => {
    console.log('Listening')
})
