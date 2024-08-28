const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion,ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 4000;

// middleware
app.use(cors());
app.use(express.json());


console.log(process.env.DB_PASS)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3nkfm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

	const serviceCollection = client.db('carDoctor').collection('services');
	const bookingCollection = client.db('carDoctor').collection('bookings');

	// client: service section (find multiple document of the collection)
    app.get('/services', async(req, res) =>{
        const cursor = serviceCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

	// added single service load API (find a specific document of the collection)
	app.get('/services/:id', async(req, res) => {
		const id = req.params.id;
		const query = { _id: new ObjectId(id) }

		const options = {
			// Include only the `title` and `imdb` fields in the returned document
			projection: { title: 1, price: 1, service_id: 1, img: 1 },
		  };

		const result = await serviceCollection.findOne(query, options);
		res.send(result);
	})

	// CREATE: store booking service data to database
	app.post('/bookings', async (req, res) => {
		const booking = req.body;
		console.log(booking);
		const result = await bookingCollection.insertOne(booking);
		res.send(result);
	});
  
  // load data using query parameter. My List/ My booking: load some data/object using a particular object
  app.get('/bookings', async(req,res) => {
     console.log(req.query.email);  // If the URL contains something like /bookings?email=test@example.com, the value test@example.com will be logged.
     let query = {};
     if (req.query?.email){  //checks if the email query parameter is present in the request.
       query = {email : req.query.email} //If email exists, it updates the query object to filter documents where the email field matches the provided email.
     }
     const result = await bookingCollection.find(query).toArray();  //find(query) searches for documents matching the criteria in query.
     res.send(result);
  })

  // delete api to delete a booking
  app.delete('/bookings/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }
    const result = await bookingCollection.deleteOne(query);
    res.send(result);
})


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
   // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('doctor is running')
})

app.listen(port, () => {
    console.log(`Car Doctor Server is running on port ${port}`)
})