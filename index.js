const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion,ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 4000;

// middleware
app.use(cors({
  origin: ['http://localhost:5173','http://localhost:5174'],  // cookies work in a particular domain
  credentials: true  // domain needs to be same. It's written bcz here client is on 5174, server is on port 5000
}));
app.use(express.json());
app.use(cookieParser());

//console.log(process.env.DB_PASS)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3nkfm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middlewares
const logger = async(req,res,next) => {   // this blocks work perfectly
   console.log('called', req.host, req.originalUrl)  
   next();
}

const verifyToken = async(req,res,next) => {
  const token = req.cookies?.token;
  console.log('value of token in middleware',token)  // code works till now
  if (!token){
    return res.status(401).send({message: 'not authorized'})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded) => {
    // error
    if (err){
      console.log(err)
      return res.status(401).send({message: 'unauthorized'})
    }
    console.log('value in the token', decoded)
    req.user.decoded;
    next()
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

	const serviceCollection = client.db('carDoctor').collection('services');
	const bookingCollection = client.db('carDoctor').collection('bookings');

  // auth related api. generate secret: require('crypto').randomBytes(64).toString('hex')
  app.post('/jwt', logger, async(req,res) => {
    const user = req.body;
    console.log(user);  // check if server has receive the request that has sent from client side
    const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn: '1h'})
    res
    .cookie('token',token,{
      httpOnly: true,
      secure: false,  // http://localhost:5174/  if it's https, it will be true
      sameSite: 'none',  // if client and server don't running on same port then, it's none
    //  maxAge
    })
    .send({success: true});
  })

  // services related api
	// client: service section (find multiple document of the collection)
    app.get('/services', logger, async(req, res) =>{
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

    // load data using query parameter. My List/ My booking: load some data/object using a particular object
    app.get('/bookings', logger, verifyToken, async(req,res) => {
      console.log(req.query.email);  // If the URL contains something like /bookings?email=test@example.com, the value test@example.com will be logged.
    //  console.log('tok tok token', req.cookies.token)
    console.log('user in the valid token', req.user) 
    if (req.query.email !== req.user.email){
      return res.status(403).send({message: 'forbidden access'})
    }
    
    let query = {};
      if (req.query?.email){  //checks if the email query parameter is present in the request.
        query = {email : req.query.email} //If email exists, it updates the query object to filter documents where the email field matches the provided email.
      }
      const result = await bookingCollection.find(query).toArray();  //find(query) searches for documents matching the criteria in query.
      res.send(result);
   })
 
	// CREATE: store booking service data to database
	app.post('/bookings', async (req, res) => {
		const booking = req.body;
		console.log(booking);
		const result = await bookingCollection.insertOne(booking);
		res.send(result);
	});

  // delete api to delete a booking
  app.delete('/bookings/:id', logger, async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }
    const result = await bookingCollection.deleteOne(query);
    res.send(result);
})

  // UPDATE: add a new property in the object
  app.patch('/bookings/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };  // filter select the particular document that needs to be updated
    const updatedBooking = req.body;
    console.log(updatedBooking);
    const updateDoc = {
        $set: {
            status: updatedBooking.status
        },
    };
    const result = await bookingCollection.updateOne(filter, updateDoc);
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