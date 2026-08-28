const express = require("express");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dotenv.config();
const cors = require("cors");
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    const db = await client.db("mediCareDB");
    const doctorsCollection = await db.collection("doctors");
    const paymentCollection = db.collection("payment");
    const appointmentsCollection = db.collection("appointments");

    // doctors collection
    app.get("/api/doctors", async (req, res) => {
      console.log("server side q", req.query);

      const query = {};

      // -------------------------
      // SEARCH (like jobs search)
      // -------------------------
      if (req.query.search) {
        query.$or = [
          {
            doctorName: {
              $regex: req.query.search,
              $options: "i",
            },
          },
          {
            specialization: {
              $regex: req.query.search,
              $options: "i",
            },
          },
          {
            hospitalName: {
              $regex: req.query.search,
              $options: "i",
            },
          },
        ];
      }

      // -------------------------
      // FILTERS
      // -------------------------
      if (req.query.specialization) {
        query.specialization = req.query.specialization;
      }

      if (req.query.verificationStatus) {
        query.verificationStatus = req.query.verificationStatus;
      }

      if (req.query.experience) {
        query.experience = { $gte: Number(req.query.experience) };
      }

      if (req.query.minFee && req.query.maxFee) {
        query.consultationFee = {
          $gte: Number(req.query.minFee),
          $lte: Number(req.query.maxFee),
        };
      }

      // -------------------------
      // PAGINATION (same style as jobs)
      // -------------------------
      if (req.query.page) {
        const page = parseInt(req.query.page);
        const perPage = parseInt(req.query.perPage || 12);
        const skipItems = (page - 1) * perPage;

        const total = await doctorsCollection.countDocuments(query);

        const cursor = doctorsCollection
          .find(query)
          .skip(skipItems)
          .limit(perPage);

        const doctors = await cursor.toArray();

        return res.send({
          total,
          doctors,
          page,
          perPage,
        });
      }

      // -------------------------
      // DEFAULT (NO PAGINATION)
      // -------------------------
      const cursor = doctorsCollection.find(query);
      const result = await cursor.toArray();

      res.send(result);
    });

    app.get("/api/doctors/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const query = {
          _id: new ObjectId(id),
        };

        const result = await doctorsCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Doctor not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("GET doctor by id error:", error);
        res.status(500).send({ message: "Server error" });
      }
    });

    // app.post("/api/doctors", async (req, res) => {
    //   try {
    //     const doctor = req.body;

    //     const newDoctor = {
    //       ...doctor,
    //       createdAt: new Date(),
    //     };

    //     const result = await doctorsCollection.insertOne(newDoctor);

    //     res.send(result);
    //   } catch (error) {
    //     console.error("POST doctor error:", error);
    //     res.status(500).send({ message: "Server error" });
    //   }
    // });


// payments
app.post("/payment", async (req, res) => {
  try {
    const {
      userId,
      date,
      availableSlots,
      symptoms,
      consultationFee,
      doctorName,
      session_id,
      status,
    } = req.body;

    console.log("Payment request:", req.body);

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: "session_id is required",
      });
    }

    const isExistSession = await paymentCollection.findOne({
      session_id,
    });

    if (isExistSession) {
      return res.status(400).json({
        success: false,
        message: "Session already exists",
      });
    }

    const pay_result = await paymentCollection.insertOne({
      userId,
      date,
      availableSlots,
      symptoms,
      consultationFee: Number(consultationFee),
      doctorName,
      session_id,
      status,
      createdAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Payment saved successfully",
      data: pay_result,
    });
  } catch (error) {
    console.error("Payment API Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.get("/payments/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const payments = await paymentCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("Get payments error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }


});


// Appoinements

app.get("/appointments/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const appointments = await db
      .collection("appointments")
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    console.error("Get appointments error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// -----------
app.get("/appointments/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await db
      .collection("appointments")
      .findOne({
        _id: new ObjectId(id),
      });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    console.error("Get appointment error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ----------
app.post("/appointments", async (req, res) => {
  try {
    const {
      userId,
      doctorId,
      doctorName,
      specialization,
      hospitalName,
      date,
      availableSlot,
      symptoms,
      consultationFee,
      paymentStatus,
      appointmentStatus,
      session_id,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: "doctorId is required",
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Appointment date is required",
      });
    }

    if (!availableSlot) {
      return res.status(400).json({
        success: false,
        message: "Appointment slot is required",
      });
    }

    const newAppointment = {
      userId,
      doctorId,
      doctorName,
      specialization,
      hospitalName,
      date,
      availableSlot,
      symptoms,
      consultationFee: Number(consultationFee || 0),
      paymentStatus: paymentStatus || "unpaid",
      appointmentStatus: appointmentStatus || "confirmed",
      session_id: session_id || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .collection("appointments")
      .insertOne(newAppointment);

    res.status(201).json({
      success: true,
      message: "Appointment created successfully",
      data: {
        _id: result.insertedId,
        ...newAppointment,
      },
    });
  } catch (error) {
    console.error("Create appointment error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
