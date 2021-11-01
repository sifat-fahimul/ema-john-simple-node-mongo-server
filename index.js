const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
var admin = require("firebase-admin");

const app = express();
const port = process.env.PORT || 5000;

//firebase admin initialization



var serviceAccount = require("./ema-john-simple-reac-firebase-adminsdk-ndb02-0c7e637401.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});




//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fj83e.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer')) {
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try {
            const decoderUser = await admin.auth().verifyIdToken(idToken);
            req.decoderUserEmail = decoderUser.email;
        }
        catch {

        }
    }
    next()
}


async function run() {
    try {
        await client.connect();
        const database = client.db('online_shop');
        const productCollection = database.collection('products');
        const orderCollection = database.collection('orders')

        //GET products API
        app.get('/products', async (req, res) => {
            const cursor = productCollection.find({});
            const page = req.query.page;
            const size = parseInt(req.query.size);
            const count = await cursor.count();
            let products;
            if (page) {
                products = await cursor.skip(page * size).limit(size).toArray();
            }
            else {
                products = await cursor.toArray();
            }
            // const products = await cursor.toArray();

            res.send({ count, products });
        });
        //Use POST to get data by keys
        app.post('/products/byKeys', async (req, res) => {
            const keys = req.body;
            const query = { key: { $in: keys } }
            const products = await productCollection.find(query).toArray();
            res.json(products)
        })
        // Get orders api
        app.get('/orders', verifyToken, async (req, res) => {
            const email = req.query.email;
            if (req.decoderUserEmail === email) {
                const query = { email: email }
                const cursor = orderCollection.find(query)
                const orders = await cursor.toArray()
                res.json(orders)
            }
            else {
                res.status(401).json({ message: 'User not Found' })
            }

        });
        //Add orders API
        app.post('/orders', async (req, res) => {
            const order = req.body;
            order.createdAt = new Date()
            const result = await orderCollection.insertOne(order);
            res.json(result);
        })

    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir)
app.get('/help', (req, res) => {
    res.send('thid is help')
})
app.get('/', (req, res) => {
    res.send('Ema john server is running')
});

app.listen(port, () => {
    console.log('server running on : ', port);
})