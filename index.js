const express = require('express')
const app = express();
const cors = require('cors');
const admin = require("firebase-admin");
app.use(cors());
app.use(express.json());
require('dotenv').config();

const port = process.env.PORT || 5000;




const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer')) {

        const token = req.headers.authorization.split(' ')[1]
        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email
        }
        catch {

        }

    }

    next();

}

const { MongoClient } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.r53mt.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
async function run() {
    try {

        await client.connect();
        const database = client.db('doctors_portal');
        const appoinmentsCollection = database.collection('appoinments');
        const usersCollection = database.collection('users')
        console.log("connected to database")
        app.get('/appoinments', verifyToken, async (req, res) => {
            const email = req.query.email;
            const date = new Date(req.query.date).toLocaleDateString();
            const query = { email: email, date: date }
            const cursor = appoinmentsCollection.find(query)
            const appoinments = await cursor.toArray();
            res.json(appoinments);

        })

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;

            }
            res.json({ admin: isAdmin })

        })

        ///POST API
        app.post('/appoinments', async (req, res) => {
            const appoinment = req.body;
            const result = await appoinmentsCollection.insertOne(appoinment);
            res.json(result)

        })
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            console.log(result);
            res.json(result)

        })
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);



        })

        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requiserAccount = await usersCollection.findOne({ email: requester })
                if (requiserAccount.role === "admin") {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }

            }
            else {
                res.status(403).json({ mesage: "You Do not have access to make admin" })
            }




        })


    }

    finally {

    }
}

run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Hello Doctors Portal!')
})

app.listen(port, () => {
    console.log(`Listening at:${port}`)
})