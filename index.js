const dns = require("node:dns");

dns.setServers(["1.1.1.1", "1.0.0.1"]);
const express = require("express");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

dotenv.config();

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URI}/api/auth/jwks`),
);

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log(authHeader);
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).send({ msg: "unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401).send({ msg: "unauthorized" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    console.log(payload);
    next();
  } catch (error) {
    console.log(error);
    res.status(401).send({ msg: "unauthorized" });
  }
};

// async function run() {
  // try {
  client.connect(()=>{
    console.log('connecting to mongo db');
  }).catch(console.dir)
    const db = client.db("mediCareDB");

    const doctorsCollection = db.collection("doctors");
    const paymentCollection = db.collection("payment");
    const appointmentsCollection = db.collection("appointments");
    const reviewsCollection = db.collection("reviews");
    const schedulesCollection = db.collection("schedules");
    const prescriptionsCollection = db.collection("prescriptions");

    const usersCollection = db.collection("user");

    const sessionsCollection = db.collection("session");

    const accountsCollection = db.collection("account");

    const verificationsCollection = db.collection("verification");

    app.get("/api/doctors", async (req, res) => {
      try {
        console.log("Server side query:", req.query);

        const query = {};

       
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

     
        if (req.query.specialization) {
          query.specialization = req.query.specialization;
        }

       
        if (req.query.verificationStatus) {
          query.verificationStatus = req.query.verificationStatus;
        }

        
        if (req.query.experience) {
          query.experience = {
            $gte: Number(req.query.experience),
          };
        }

        if (req.query.minFee && req.query.maxFee) {
          query.consultationFee = {
            $gte: Number(req.query.minFee),
            $lte: Number(req.query.maxFee),
          };
        }

        if (req.query.page) {
          const page = Math.max(parseInt(req.query.page) || 1, 1);

          const perPage = Math.max(parseInt(req.query.perPage) || 12, 1);

          const skipItems = (page - 1) * perPage;

          const total = await doctorsCollection.countDocuments(query);

          const doctors = await doctorsCollection
            .find(query)
            .skip(skipItems)
            .limit(perPage)
            .toArray();

          return res.status(200).json({
            success: true,
            total,
            doctors,
            page,
            perPage,
          });
        }

      
        const doctors = await doctorsCollection.find(query).toArray();

        return res.status(200).json({
          success: true,
          data: doctors,
        });
      } catch (error) {
        console.error("Get doctors error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to get doctors",
          error: error.message,
        });
      }
    });


    app.get("/api/doctors/:id", async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid doctor ID",
          });
        }

        const doctor = await doctorsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!doctor) {
          return res.status(404).json({
            success: false,
            message: "Doctor not found",
          });
        }

        console.log("DOCTOR FROM DATABASE:", doctor);

        return res.status(200).json({
          success: true,
          data: doctor,
        });
      } catch (error) {
        console.error("Get doctor by ID error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to get doctor",
          error: error.message,
        });
      }
    });

    // -----
    app.get("/payment/user/:userId", async (req, res) => {
      try {
        const { userId } = req.params;

        if (!userId) {
          return res.status(400).json({
            success: false,
            message: "User ID is required",
          });
        }

        const payments = await appointmentsCollection
          .find({
            userId: String(userId),
          })
          .sort({
            createdAt: -1,
          })
          .toArray();

        return res.status(200).json({
          success: true,
          data: payments,
        });
      } catch (error) {
        console.error("Get user payment history error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to get payment history",
          error: error.message,
        });
      }
    });
    // --------

    app.post("/payment", async (req, res) => {
      try {
        const {
          userId,
          patientName,
          doctorId,
          doctorName,
          specialization,
          hospitalName,
          date,
          availableSlot,
          symptoms,
          consultationFee,
          session_id,
          status,
        } = req.body;

        console.log("======================================");
        console.log("Payment request:", req.body);
        console.log("======================================");

      
        if (!userId) {
          return res.status(400).json({
            success: false,
            message: "userId is required",
          });
        }

        if (!session_id) {
          return res.status(400).json({
            success: false,
            message: "session_id is required",
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

       
        let finalPatientName = patientName ? String(patientName).trim() : "";

       
        if (!finalPatientName) {
          try {
            const user = await usersCollection.findOne({
              $or: [
                {
                  _id: String(userId),
                },
                {
                  id: String(userId),
                },
              ],
            });

            if (user) {
              finalPatientName =
                user.name || user.fullName || user.username || "";
            }
          } catch (userError) {
            console.error("Patient lookup error:", userError);
          }
        }

        if (!finalPatientName) {
          finalPatientName = "Patient";
        }

        console.log("Final patient name:", finalPatientName);

        const existingPayment = await paymentCollection.findOne({
          session_id,
        });

        if (existingPayment) {
          return res.status(200).json({
            success: true,
            message: "Payment already exists",
            data: existingPayment,
          });
        }

     
        const newPayment = {
          userId: String(userId),

          patientName: finalPatientName,

          doctorId: String(doctorId),

          doctorName: doctorName || "",

          specialization: specialization || "",

          hospitalName: hospitalName || "",

          date,

          availableSlot,

          symptoms: symptoms || "",

          consultationFee: Number(consultationFee || 0),

          session_id,

          paymentStatus: status || "paid",

          createdAt: new Date(),

          updatedAt: new Date(),
        };

        const paymentResult = await paymentCollection.insertOne(newPayment);

    
        const existingAppointment = await appointmentsCollection.findOne({
          session_id,
        });

        let appointmentData;

        if (existingAppointment) {
          appointmentData = existingAppointment;

        
          if (
            !existingAppointment.patientName ||
            existingAppointment.patientName === "Patient"
          ) {
            await appointmentsCollection.updateOne(
              {
                _id: existingAppointment._id,
              },
              {
                $set: {
                  patientName: finalPatientName,

                  updatedAt: new Date(),
                },
              },
            );

            appointmentData = await appointmentsCollection.findOne({
              _id: existingAppointment._id,
            });
          }
        }

        else {
          const newAppointment = {
            userId: String(userId),

     
            patientName: finalPatientName,

            doctorId: String(doctorId),

            doctorName: doctorName || "",

            specialization: specialization || "",

            hospitalName: hospitalName || "",

            date,

            availableSlot,

            symptoms: symptoms || "",

            consultationFee: Number(consultationFee || 0),

            paymentStatus: status || "paid",

            appointmentStatus: "pending",

            session_id,

            createdAt: new Date(),

            updatedAt: new Date(),
          };

          const appointmentResult =
            await appointmentsCollection.insertOne(newAppointment);

          appointmentData = {
            _id: appointmentResult.insertedId,

            ...newAppointment,
          };
        }

 
        return res.status(201).json({
          success: true,

          message: "Payment and appointment saved successfully",

          data: {
            payment: {
              _id: paymentResult.insertedId,

              ...newPayment,
            },

            appointment: appointmentData,
          },
        });
      } catch (error) {
        console.error("Payment API Error:", error);

        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

  
    app.get("/appointments/doctor/:doctorId", async (req, res) => {
      try {
        const { doctorId } = req.params;

        if (!doctorId) {
          return res.status(400).json({
            success: false,
            message: "Doctor ID is required",
          });
        }

        const appointments = await appointmentsCollection
          .find({
            doctorId: String(doctorId),
          })
          .sort({
            createdAt: -1,
          })
          .toArray();

    
        const enrichedAppointments = await Promise.all(
          appointments.map(async (appointment) => {
            let patientName = appointment.patientName;

          
            if (!patientName || patientName === "Patient") {
              try {
                const user = await usersCollection.findOne({
                  $or: [
                    {
                      _id: String(appointment.userId),
                    },
                    {
                      id: String(appointment.userId),
                    },
                  ],
                });

                if (user) {
                  patientName =
                    user.name || user.fullName || user.username || "Patient";
                }
              } catch (userError) {
                console.error("Patient lookup error:", userError);
              }
            }

            return {
              ...appointment,

              patientName: patientName || "Patient",
            };
          }),
        );

        return res.status(200).json({
          success: true,

          data: enrichedAppointments,
        });
      } catch (error) {
        console.error("Get doctor appointments error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to get doctor appointments",

          error: error.message,
        });
      }
    });
    app.get("/payments/:userId", async (req, res) => {
      try {
        const { userId } = req.params;

        console.log("Payment userId:", userId);

        if (!userId) {
          return res.status(400).json({
            success: false,
            message: "userId is required",
          });
        }

        const payments = await paymentCollection
          .find({
            userId: String(userId),
          })
          .sort({
            createdAt: -1,
          })
          .toArray();

        return res.status(200).json({
          success: true,
          data: payments,
        });
      } catch (error) {
        console.error("Get payments error:", error);

        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

    app.get("/appointments/user/:userId", async (req, res) => {
      try {
        const { userId } = req.params;

        console.log("======================================");

        console.log("Requested appointment userId:", userId);

        if (!userId) {
          return res.status(400).json({
            success: false,
            message: "userId is required",
          });
        }

        const appointments = await appointmentsCollection
          .find({
            userId: String(userId),
          })
          .sort({
            createdAt: -1,
          })
          .toArray();

        console.log("Appointments found:", appointments.length);

        console.log("Appointments:", appointments);

        console.log("======================================");

        return res.status(200).json({
          success: true,
          data: appointments,
        });
      } catch (error) {
        console.error("Get appointments error:", error);

        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

    app.get("/appointments/:id", async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid appointment ID",
          });
        }

        const appointment = await appointmentsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!appointment) {
          return res.status(404).json({
            success: false,
            message: "Appointment not found",
          });
        }

        return res.status(200).json({
          success: true,
          data: appointment,
        });
      } catch (error) {
        console.error("Get appointment error:", error);

        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

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

        console.log("Create appointment request:", req.body);

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

        if (session_id) {
          const existing = await appointmentsCollection.findOne({
            session_id,
          });

          if (existing) {
            return res.status(200).json({
              success: true,
              message: "Appointment already exists",
              data: existing,
            });
          }
        }

        const newAppointment = {
          userId: String(userId),

          doctorId: String(doctorId),

          doctorName: doctorName || "",

          specialization: specialization || "",

          hospitalName: hospitalName || "",

          date,

          availableSlot,

          symptoms: symptoms || "",

          consultationFee: Number(consultationFee || 0),

          paymentStatus: paymentStatus || "unpaid",

          appointmentStatus: appointmentStatus || "pending",

          session_id: session_id || null,

          createdAt: new Date(),

          updatedAt: new Date(),
        };

        const result = await appointmentsCollection.insertOne(newAppointment);

        return res.status(201).json({
          success: true,

          message: "Appointment created successfully",

          data: {
            _id: result.insertedId,

            ...newAppointment,
          },
        });
      } catch (error) {
        console.error("Create appointment error:", error);

        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

    app.patch("/appointments/:id/reschedule", async (req, res) => {
      try {
        const { id } = req.params;

        const { date, availableSlot } = req.body;

        console.log("Reschedule request:", req.body);

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid appointment ID",
          });
        }

        if (!date) {
          return res.status(400).json({
            success: false,
            message: "New date is required",
          });
        }

        if (!availableSlot) {
          return res.status(400).json({
            success: false,
            message: "New time slot is required",
          });
        }

        const appointment = await appointmentsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!appointment) {
          return res.status(404).json({
            success: false,
            message: "Appointment not found",
          });
        }

        if (
          String(appointment.appointmentStatus).toLowerCase() === "cancelled"
        ) {
          return res.status(400).json({
            success: false,
            message: "Cancelled appointment cannot be rescheduled",
          });
        }

        const result = await appointmentsCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              date,

              availableSlot,

              appointmentStatus: "rescheduled",

              updatedAt: new Date(),
            },
          },
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Appointment not found",
          });
        }

        const updatedAppointment = await appointmentsCollection.findOne({
          _id: new ObjectId(id),
        });

        return res.status(200).json({
          success: true,

          message: "Appointment rescheduled successfully",

          data: updatedAppointment,
        });
      } catch (error) {
        console.error("Reschedule appointment error:", error);

        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

    app.patch("/appointments/:id/cancel", async (req, res) => {
      try {
        const { id } = req.params;

        console.log("Cancel appointment ID:", id);

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid appointment ID",
          });
        }

        const appointment = await appointmentsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!appointment) {
          return res.status(404).json({
            success: false,
            message: "Appointment not found",
          });
        }

        if (
          String(appointment.appointmentStatus).toLowerCase() === "cancelled" ||
          String(appointment.appointmentStatus).toLowerCase() === "canceled"
        ) {
          return res.status(400).json({
            success: false,
            message: "Appointment is already cancelled",
          });
        }

        await appointmentsCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              appointmentStatus: "cancelled",

              updatedAt: new Date(),
            },
          },
        );

        const updatedAppointment = await appointmentsCollection.findOne({
          _id: new ObjectId(id),
        });

        return res.status(200).json({
          success: true,

          message: "Appointment cancelled successfully",

          data: updatedAppointment,
        });
      } catch (error) {
        console.error("Cancel appointment error:", error);

        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

    app.get("/api/reviews", async (req, res) => {
      try {
        const reviews = await reviewsCollection
          .find({})
          .sort({ createdAt: -1 })
          .toArray();

        res.status(200).json({
          success: true,
          data: reviews,
        });
      } catch (error) {
        console.error("Get reviews error:", error);

        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });
    app.get("/api/reviews", async (req, res) => {
      try {
        const reviews = await reviewsCollection
          .find({})
          .sort({ createdAt: -1 })
          .toArray();

        return res.status(200).json({
          success: true,
          data: reviews,
        });
      } catch (error) {
        console.error("Get reviews error:", error);

        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });
    app.post("/api/reviews", async (req, res) => {
      try {
        const { doctorId, rating, comment } = req.body;

        console.log("Create review body:", req.body);

        if (!doctorId) {
          return res.status(400).json({
            success: false,
            message: "Doctor ID is required",
          });
        }

        if (!rating || Number(rating) < 1 || Number(rating) > 5) {
          return res.status(400).json({
            success: false,
            message: "Rating must be between 1 and 5",
          });
        }

        if (!comment?.trim()) {
          return res.status(400).json({
            success: false,
            message: "Review comment is required",
          });
        }

        const review = {
          doctorId,
          rating: Number(rating),
          comment: comment.trim(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await reviewsCollection.insertOne(review);

        const createdReview = await reviewsCollection.findOne({
          _id: result.insertedId,
        });

        return res.status(201).json({
          success: true,
          message: "Review created successfully",
          data: createdReview,
        });
      } catch (error) {
        console.error("Create review error:", error);

        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

    app.patch("/api/reviews/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const { doctorId, rating, comment } = req.body;

        if (!doctorId || !rating || !comment) {
          return res.status(400).json({
            success: false,
            message: "Doctor, rating and comment are required",
          });
        }

        const doctor = await doctorsCollection.findOne({
          _id: doctorId,
        });

        if (!doctor) {
          return res.status(404).json({
            success: false,
            message: "Doctor not found",
          });
        }

        const updateData = {
          doctorId,

          doctorName: doctor.doctorName,

          specialization: doctor.specialization,

          rating: Number(rating),

          comment: comment.trim(),

          updatedAt: new Date(),
        };

        const result = await reviewsCollection.updateOne(
          {
            _id: id,
          },
          {
            $set: updateData,
          },
        );

        if (!result.matchedCount) {
          return res.status(404).json({
            success: false,
            message: "Review not found",
          });
        }

        const updatedReview = await reviewsCollection.findOne({
          _id: id,
        });

        res.status(200).json({
          success: true,
          data: updatedReview,
        });
      } catch (error) {
        console.error("Update review error:", error);

        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });
    app.delete("/api/reviews/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const result = await reviewsCollection.deleteOne({
          _id: id,
        });

        if (!result.deletedCount) {
          return res.status(404).json({
            success: false,
            message: "Review not found",
          });
        }

        res.status(200).json({
          success: true,
          message: "Review deleted successfully",
        });
      } catch (error) {
        console.error("Delete review error:", error);

        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

    // doctors
    app.get("/api/schedules/doctor/:doctorId", async (req, res) => {
      try {
        const { doctorId } = req.params;

        if (!doctorId) {
          return res.status(400).send({
            success: false,
            message: "Doctor ID is required",
          });
        }

        const schedules = await schedulesCollection
          .find({
            doctorId: String(doctorId),
          })
          .sort({
            day: 1,
          })
          .toArray();

        res.send({
          success: true,
          data: schedules,
        });
      } catch (error) {
        console.error("Get schedules error:", error);

        res.status(500).send({
          success: false,
          message: "Failed to fetch schedules",
        });
      }
    });

    // ----------------
    app.post("/api/schedules", async (req, res) => {
      try {
        const { doctorId, day, slots } = req.body;

        if (!doctorId || !day || !Array.isArray(slots) || slots.length === 0) {
          return res.status(400).send({
            success: false,
            message: "Doctor ID, day and slots are required",
          });
        }

        const cleanSlots = [
          ...new Set(slots.map((slot) => String(slot).trim()).filter(Boolean)),
        ];

        if (cleanSlots.length === 0) {
          return res.status(400).send({
            success: false,
            message: "At least one valid slot is required",
          });
        }

        
        const existingSchedule = await schedulesCollection.findOne({
          doctorId: String(doctorId),
          day,
        });

        if (existingSchedule) {
          return res.status(409).send({
            success: false,
            message: `${day} schedule already exists`,
          });
        }

        const now = new Date();

        const schedule = {
          doctorId: String(doctorId),
          day,
          slots: cleanSlots,
          createdAt: now,
          updatedAt: now,
        };

        const result = await schedulesCollection.insertOne(schedule);

        res.status(201).send({
          success: true,
          message: "Schedule added successfully",
          data: {
            _id: result.insertedId,
            ...schedule,
          },
        });
      } catch (error) {
        console.error("Add schedule error:", error);

        res.status(500).send({
          success: false,
          message: "Failed to add schedule",
        });
      }
    });
    // ----------------
    app.post("/api/schedules", async (req, res) => {
      try {
        const { doctorId, day, slots } = req.body;

        if (!doctorId || !day || !Array.isArray(slots) || slots.length === 0) {
          return res.status(400).send({
            success: false,
            message: "Doctor ID, day and slots are required",
          });
        }

        const cleanSlots = [
          ...new Set(slots.map((slot) => String(slot).trim()).filter(Boolean)),
        ];

        if (cleanSlots.length === 0) {
          return res.status(400).send({
            success: false,
            message: "At least one valid slot is required",
          });
        }

  
        const existingSchedule = await schedulesCollection.findOne({
          doctorId: String(doctorId),
          day,
        });

        if (existingSchedule) {
          return res.status(409).send({
            success: false,
            message: `${day} schedule already exists`,
          });
        }

        const now = new Date();

        const schedule = {
          doctorId: String(doctorId),
          day,
          slots: cleanSlots,
          createdAt: now,
          updatedAt: now,
        };

        const result = await schedulesCollection.insertOne(schedule);

        res.status(201).send({
          success: true,
          message: "Schedule added successfully",
          data: {
            _id: result.insertedId,
            ...schedule,
          },
        });
      } catch (error) {
        console.error("Add schedule error:", error);

        res.status(500).send({
          success: false,
          message: "Failed to add schedule",
        });
      }
    });
    // __-------------
    app.patch("/api/schedules/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { day, slots } = req.body;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            success: false,
            message: "Invalid schedule ID",
          });
        }

        if (!day || !Array.isArray(slots) || slots.length === 0) {
          return res.status(400).send({
            success: false,
            message: "Day and slots are required",
          });
        }

        const cleanSlots = [
          ...new Set(slots.map((slot) => String(slot).trim()).filter(Boolean)),
        ];

        const existingSchedule = await schedulesCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!existingSchedule) {
          return res.status(404).send({
            success: false,
            message: "Schedule not found",
          });
        }

    
        const duplicateSchedule = await schedulesCollection.findOne({
          doctorId: existingSchedule.doctorId,
          day,
          _id: {
            $ne: new ObjectId(id),
          },
        });

        if (duplicateSchedule) {
          return res.status(409).send({
            success: false,
            message: `${day} schedule already exists`,
          });
        }

        const result = await schedulesCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              day,
              slots: cleanSlots,
              updatedAt: new Date(),
            },
          },
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Schedule not found",
          });
        }

        const updatedSchedule = await schedulesCollection.findOne({
          _id: new ObjectId(id),
        });

        res.send({
          success: true,
          message: "Schedule updated successfully",
          data: updatedSchedule,
        });
      } catch (error) {
        console.error("Update schedule error:", error);

        res.status(500).send({
          success: false,
          message: "Failed to update schedule",
        });
      }
    });

    // -------
    app.delete("/api/schedules/:id", async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            success: false,
            message: "Invalid schedule ID",
          });
        }

        const result = await schedulesCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Schedule not found",
          });
        }

        res.send({
          success: true,
          message: "Schedule removed successfully",
        });
      } catch (error) {
        console.error("Delete schedule error:", error);

        res.status(500).send({
          success: false,
          message: "Failed to remove schedule",
        });
      }
    });
    // --------
    app.get("/appointments/:id", async (req, res) => {
      try {
        const { id } = req.params;

        console.log("GET SINGLE APPOINTMENT ID:", id);

        if (!id) {
          return res.status(400).json({
            success: false,
            message: "Appointment ID is required",
          });
        }

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid appointment ID",
          });
        }

        const appointment = await appointmentsCollection.findOne({
          _id: new ObjectId(id),
        });

        console.log("APPOINTMENT FOUND:", appointment);

        if (!appointment) {
          return res.status(404).json({
            success: false,
            message: "Appointment not found",
          });
        }

        return res.status(200).json({
          success: true,
          data: appointment,
        });
      } catch (error) {
        console.error("Get single appointment error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to get appointment",
          error: error.message,
        });
      }
    });

    // ------------
    app.patch("/appointments/:id/accept", async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            success: false,
            message: "Invalid appointment ID",
          });
        }

        const appointment = await appointmentsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!appointment) {
          return res.status(404).send({
            success: false,
            message: "Appointment not found",
          });
        }

        if (appointment.appointmentStatus !== "pending") {
          return res.status(400).send({
            success: false,
            message: `Appointment is already ${appointment.appointmentStatus}`,
          });
        }

        const result = await appointmentsCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              appointmentStatus: "confirmed",
              updatedAt: new Date(),
            },
          },
        );

        if (result.modifiedCount === 0) {
          return res.status(400).send({
            success: false,
            message: "Failed to accept appointment",
          });
        }

        const updatedAppointment = await appointmentsCollection.findOne({
          _id: new ObjectId(id),
        });

        res.send({
          success: true,
          message: "Appointment accepted successfully",
          data: updatedAppointment,
        });
      } catch (error) {
        console.error("Accept appointment error:", error);

        res.status(500).send({
          success: false,
          message: "Failed to accept appointment",
        });
      }
    });

    // -----------
    app.patch("/appointments/:id/reject", async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            success: false,
            message: "Invalid appointment ID",
          });
        }

        const appointment = await appointmentsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!appointment) {
          return res.status(404).send({
            success: false,
            message: "Appointment not found",
          });
        }

        if (appointment.appointmentStatus !== "pending") {
          return res.status(400).send({
            success: false,
            message: `Appointment is already ${appointment.appointmentStatus}`,
          });
        }

        const result = await appointmentsCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              appointmentStatus: "rejected",
              updatedAt: new Date(),
            },
          },
        );

        if (result.modifiedCount === 0) {
          return res.status(400).send({
            success: false,
            message: "Failed to reject appointment",
          });
        }

        const updatedAppointment = await appointmentsCollection.findOne({
          _id: new ObjectId(id),
        });

        res.send({
          success: true,
          message: "Appointment rejected successfully",
          data: updatedAppointment,
        });
      } catch (error) {
        console.error("Reject appointment error:", error);

        res.status(500).send({
          success: false,
          message: "Failed to reject appointment",
        });
      }
    });
    // --------------
    app.patch("/appointments/:id/complete", async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            success: false,
            message: "Invalid appointment ID",
          });
        }

        const appointment = await appointmentsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!appointment) {
          return res.status(404).send({
            success: false,
            message: "Appointment not found",
          });
        }

        if (appointment.appointmentStatus !== "confirmed") {
          return res.status(400).send({
            success: false,
            message: "Only confirmed appointments can be marked as completed",
          });
        }

        const result = await appointmentsCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              appointmentStatus: "completed",
              updatedAt: new Date(),
            },
          },
        );

        if (result.modifiedCount === 0) {
          return res.status(400).send({
            success: false,
            message: "Failed to complete appointment",
          });
        }

        const updatedAppointment = await appointmentsCollection.findOne({
          _id: new ObjectId(id),
        });

        res.send({
          success: true,
          message: "Appointment marked as completed",
          data: updatedAppointment,
        });
      } catch (error) {
        console.error("Complete appointment error:", error);

        res.status(500).send({
          success: false,
          message: "Failed to complete appointment",
        });
      }
    });

    app.post("/api/doctors/profile", async (req, res) => {
      try {
        const {
          userId,
          doctorName,
          specialization,
          qualifications,
          experience,
          consultationFee,
          hospitalName,
          profileImage,
          availableDays,
          availableSlots,
          verificationStatus,
        } = req.body;

        if (!userId) {
          return res.status(400).json({
            success: false,
            message: "User ID is required",
          });
        }

        if (!doctorName) {
          return res.status(400).json({
            success: false,
            message: "Doctor name is required",
          });
        }

        if (!specialization) {
          return res.status(400).json({
            success: false,
            message: "Specialization is required",
          });
        }

  
        const existingDoctor = await doctorsCollection.findOne({
          userId: String(userId),
        });

 
        if (existingDoctor) {
          return res.status(409).json({
            success: false,
            message: "Doctor profile already exists",
            data: existingDoctor,
          });
        }

        const doctor = {
          userId: String(userId),
          doctorName: String(doctorName).trim(),
          specialization: String(specialization).trim(),

          qualifications: Array.isArray(qualifications)
            ? qualifications.map((item) => String(item).trim()).filter(Boolean)
            : [],

          experience: Number(experience) || 0,

          consultationFee: Number(consultationFee) || 0,

          hospitalName: hospitalName ? String(hospitalName).trim() : "",

          profileImage: profileImage ? String(profileImage).trim() : "",

          availableDays: Array.isArray(availableDays)
            ? availableDays.map((day) => String(day).trim()).filter(Boolean)
            : [],

          availableSlots: Array.isArray(availableSlots)
            ? [
                ...new Set(
                  availableSlots
                    .map((slot) => String(slot).trim())
                    .filter(Boolean),
                ),
              ]
            : [],

          verificationStatus: verificationStatus || "pending",

          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await doctorsCollection.insertOne(doctor);

        const createdDoctor = await doctorsCollection.findOne({
          _id: result.insertedId,
        });

        return res.status(201).json({
          success: true,
          message: "Doctor profile created successfully",
          data: createdDoctor,
        });
      } catch (error) {
        console.error("Create doctor profile error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to create doctor profile",
          error: error.message,
        });
      }
    });
    // ---------
    app.patch("/api/doctors/:id", async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid doctor ID",
          });
        }

        const {
          specialization,
          qualifications,
          experience,
          consultationFee,
          availableSlots,
        } = req.body;

        const updateData = {
          updatedAt: new Date(),
        };

        if (specialization !== undefined) {
          updateData.specialization = String(specialization).trim();
        }

        if (qualifications !== undefined) {
          updateData.qualifications = Array.isArray(qualifications)
            ? qualifications.map((item) => String(item).trim()).filter(Boolean)
            : [];
        }

        if (experience !== undefined) {
          const experienceNumber = Number(experience);

          if (Number.isNaN(experienceNumber) || experienceNumber < 0) {
            return res.status(400).json({
              success: false,
              message: "Invalid experience",
            });
          }

          updateData.experience = experienceNumber;
        }

        if (consultationFee !== undefined) {
          const feeNumber = Number(consultationFee);

          if (Number.isNaN(feeNumber) || feeNumber < 0) {
            return res.status(400).json({
              success: false,
              message: "Invalid consultation fee",
            });
          }

          updateData.consultationFee = feeNumber;
        }

        if (availableSlots !== undefined) {
          updateData.availableSlots = Array.isArray(availableSlots)
            ? [
                ...new Set(
                  availableSlots
                    .map((slot) => String(slot).trim())
                    .filter(Boolean),
                ),
              ]
            : [];
        }

        const result = await doctorsCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: updateData,
          },
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Doctor not found",
          });
        }

        const updatedDoctor = await doctorsCollection.findOne({
          _id: new ObjectId(id),
        });

        return res.status(200).json({
          success: true,
          message: "Doctor profile updated successfully",
          data: updatedDoctor,
        });
      } catch (error) {
        console.error("Update doctor profile error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to update doctor profile",
          error: error.message,
        });
      }
    });
    // ----------------
    app.get("/api/doctors/user/:userId", async (req, res) => {
      try {
        const { userId } = req.params;

        if (!userId) {
          return res.status(400).send({
            success: false,
            message: "User ID is required",
          });
        }

        const doctor = await doctorsCollection.findOne({
          userId: String(userId),
        });

        if (!doctor) {
          return res.status(404).send({
            success: false,
            message: "Doctor profile not found",
          });
        }

        res.send({
          success: true,
          data: doctor,
        });
      } catch (error) {
        console.error("Get doctor by user ID:", error);

        res.status(500).send({
          success: false,
          message: "Failed to get doctor profile",
        });
      }
    });

    // -----------

    app.post("/api/prescriptions", async (req, res) => {
      try {
        const {
          appointmentId,
          doctorId,
          patientId,
          patientName,
          diagnosis,
          medications,
          notes,
        } = req.body;

        if (!appointmentId) {
          return res.status(400).json({
            success: false,
            message: "Appointment ID is required",
          });
        }

        if (!doctorId) {
          return res.status(400).json({
            success: false,
            message: "Doctor ID is required",
          });
        }

        if (!patientId) {
          return res.status(400).json({
            success: false,
            message: "Patient ID is required",
          });
        }

        if (!diagnosis?.trim()) {
          return res.status(400).json({
            success: false,
            message: "Diagnosis is required",
          });
        }


        const existingPrescription = await prescriptionsCollection.findOne({
          appointmentId: String(appointmentId),
        });

        if (existingPrescription) {
          return res.status(409).json({
            success: false,
            message: "Prescription already exists",
            data: existingPrescription,
          });
        }


        const prescription = {
          appointmentId: String(appointmentId),
          doctorId: String(doctorId),
          patientId: String(patientId),
          patientName: String(patientName || "").trim(),
          diagnosis: String(diagnosis).trim(),
          medications: String(medications || "").trim(),
          notes: String(notes || "").trim(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await prescriptionsCollection.insertOne(prescription);

        const createdPrescription = await prescriptionsCollection.findOne({
          _id: result.insertedId,
        });

     
        await appointmentsCollection.updateOne(
          {
            _id: new ObjectId(appointmentId),
          },
          {
            $set: {
              prescriptionId: String(result.insertedId),
              prescriptionIssued: true,
              updatedAt: new Date(),
            },
          },
        );

        return res.status(201).json({
          success: true,
          message: "Digital prescription issued successfully",
          data: createdPrescription,
        });
      } catch (error) {
        console.error("Create prescription error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to create prescription",
          error: error.message,
        });
      }
    });

    // -----------

    app.get(
      "/api/prescriptions/appointment/:appointmentId",
      async (req, res) => {
        try {
          const { appointmentId } = req.params;

          if (!appointmentId) {
            return res.status(400).json({
              success: false,
              message: "Appointment ID is required",
            });
          }

          const prescription = await prescriptionsCollection.findOne({
            appointmentId: String(appointmentId),
          });

          if (!prescription) {
            return res.status(404).json({
              success: false,
              message: "Prescription not found",
            });
          }

          return res.status(200).json({
            success: true,
            data: prescription,
          });
        } catch (error) {
          console.error("Get prescription error:", error);

          return res.status(500).json({
            success: false,
            message: "Failed to get prescription",
            error: error.message,
          });
        }
      },
    );

    // -------

    app.patch("/api/prescriptions/:id", async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid prescription ID",
          });
        }

        const { diagnosis, medications, notes } = req.body;

        const updateData = {
          updatedAt: new Date(),
        };

        if (diagnosis !== undefined) {
          updateData.diagnosis = String(diagnosis).trim();
        }

        if (medications !== undefined) {
          updateData.medications = String(medications).trim();
        }

        if (notes !== undefined) {
          updateData.notes = String(notes).trim();
        }

        const result = await prescriptionsCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: updateData,
          },
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Prescription not found",
          });
        }

        const updatedPrescription = await prescriptionsCollection.findOne({
          _id: new ObjectId(id),
        });

        return res.status(200).json({
          success: true,
          message: "Prescription updated successfully",
          data: updatedPrescription,
        });
      } catch (error) {
        console.error("Update prescription error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to update prescription",
          error: error.message,
        });
      }
    });

    app.get("/api/admin/users", async (req, res) => {
      try {
        const { search = "", limit = 100, offset = 0 } = req.query;

        const query = {};

        const cleanSearch = String(search).trim();

        if (cleanSearch) {
          query.$or = [
            {
              name: {
                $regex: cleanSearch,
                $options: "i",
              },
            },
            {
              email: {
                $regex: cleanSearch,
                $options: "i",
              },
            },
          ];
        }

        const users = await usersCollection
          .find(query)
          .sort({
            createdAt: -1,
          })
          .skip(Number(offset))
          .limit(Number(limit))
          .toArray();

        const total = await usersCollection.countDocuments(query);

        return res.status(200).json({
          success: true,
          data: users,
          total,
          limit: Number(limit),
          offset: Number(offset),
        });
      } catch (error) {
        console.error("Get admin users error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to load users",
          error: error.message,
        });
      }
    });

    app.patch("/api/admin/users/:id/suspend", async (req, res) => {
      try {
        const { id } = req.params;

        console.log("SUSPEND USER ID RECEIVED:", id);

        if (!id) {
          return res.status(400).json({
            success: false,
            message: "User ID is required",
          });
        }

        // Convert string ID to MongoDB ObjectId
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid user ID",
          });
        }

        const objectId = new ObjectId(id);

        const user = await usersCollection.findOne({
          _id: objectId,
        });

        console.log("USER FOUND FOR SUSPEND:", user);

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

     
        if (user.role === "admin") {
          return res.status(403).json({
            success: false,
            message: "Admin account cannot be suspended",
          });
        }

        const result = await usersCollection.updateOne(
          {
            _id: objectId,
          },
          {
            $set: {
              banned: true,
              banReason: "Suspended by administrator",
              banExpires: null,
              updatedAt: new Date(),
            },
          },
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        // Delete active sessions
        await sessionsCollection.deleteMany({
          userId: String(user.id || user._id),
        });

        return res.status(200).json({
          success: true,
          message: "User suspended successfully",
        });
      } catch (error) {
        console.error("Suspend user error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to suspend user",
          error: error.message,
        });
      }
    });


    app.patch("/api/admin/users/:id/unsuspend", async (req, res) => {
      try {
        const { id } = req.params;

        console.log("UNSUSPEND USER ID RECEIVED:", id);

        if (!id) {
          return res.status(400).json({
            success: false,
            message: "User ID is required",
          });
        }

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid user ID",
          });
        }

        const objectId = new ObjectId(id);

        const user = await usersCollection.findOne({
          _id: objectId,
        });

        console.log("USER FOUND FOR UNSUSPEND:", user);

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        const result = await usersCollection.updateOne(
          {
            _id: objectId,
          },
          {
            $set: {
              banned: false,
              banReason: null,
              banExpires: null,
              updatedAt: new Date(),
            },
          },
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        return res.status(200).json({
          success: true,
          message: "User unsuspended successfully",
        });
      } catch (error) {
        console.error("Unsuspend user error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to unsuspend user",
          error: error.message,
        });
      }
    });

    app.delete("/api/admin/users/:id", async (req, res) => {
      try {
        const { id } = req.params;

        console.log("DELETE USER ID RECEIVED:", id);

        if (!id) {
          return res.status(400).json({
            success: false,
            message: "User ID is required",
          });
        }

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid user ID",
          });
        }

        const objectId = new ObjectId(id);

        const user = await usersCollection.findOne({
          _id: objectId,
        });

        console.log("USER FOUND FOR DELETE:", user);

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

   
        if (user.role === "admin") {
          return res.status(403).json({
            success: false,
            message: "Admin account cannot be deleted",
          });
        }

        const betterAuthUserId = user.id ? String(user.id) : String(user._id);

    
        const userResult = await usersCollection.deleteOne({
          _id: objectId,
        });

        if (userResult.deletedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "User could not be deleted",
          });
        }

   
        await sessionsCollection.deleteMany({
          userId: betterAuthUserId,
        });

        await accountsCollection.deleteMany({
          userId: betterAuthUserId,
        });

 
        if (typeof verificationsCollection !== "undefined") {
          await verificationsCollection.deleteMany({
            identifier: betterAuthUserId,
          });
        }

        return res.status(200).json({
          success: true,
          message: "User permanently deleted",
        });
      } catch (error) {
        console.error("Delete user error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to delete user",
          error: error.message,
        });
      }
    });


    
    app.get("/api/admin/doctors", async (req, res) => {
      try {
        const {
          search = "",
          verificationStatus = "",
          limit = 100,
          offset = 0,
        } = req.query;

        const query = {};

        const cleanSearch = String(search).trim();

        if (cleanSearch) {
          query.$or = [
            {
              doctorName: {
                $regex: cleanSearch,
                $options: "i",
              },
            },
            {
              specialization: {
                $regex: cleanSearch,
                $options: "i",
              },
            },
            {
              hospitalName: {
                $regex: cleanSearch,
                $options: "i",
              },
            },
          ];
        }

       
        if (verificationStatus) {
          query.verificationStatus = String(verificationStatus);
        }

        const doctors = await doctorsCollection
          .find(query)
          .sort({
            createdAt: -1,
          })
          .skip(Number(offset))
          .limit(Number(limit))
          .toArray();

        const total = await doctorsCollection.countDocuments(query);

        return res.status(200).json({
          success: true,
          data: doctors,
          total,
          limit: Number(limit),
          offset: Number(offset),
        });
      } catch (error) {
        console.error("Get admin doctors error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to load doctors",
          error: error.message,
        });
      }
    });

   
    app.patch("/api/admin/doctors/:id/verify", async (req, res) => {
      try {
        const { id } = req.params;

        console.log("VERIFY DOCTOR ID:", id);

        if (!id) {
          return res.status(400).json({
            success: false,
            message: "Doctor ID is required",
          });
        }

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid doctor ID",
          });
        }

        const objectId = new ObjectId(id);

        const doctor = await doctorsCollection.findOne({
          _id: objectId,
        });

        if (!doctor) {
          return res.status(404).json({
            success: false,
            message: "Doctor not found",
          });
        }


        if (doctor.verificationStatus === "verified") {
          return res.status(400).json({
            success: false,
            message: "Doctor is already verified",
          });
        }

        const result = await doctorsCollection.updateOne(
          {
            _id: objectId,
          },
          {
            $set: {
              verificationStatus: "verified",
              updatedAt: new Date(),
            },
          },
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Doctor not found",
          });
        }

        const updatedDoctor = await doctorsCollection.findOne({
          _id: objectId,
        });

        return res.status(200).json({
          success: true,
          message: "Doctor verified successfully",
          data: updatedDoctor,
        });
      } catch (error) {
        console.error("Verify doctor error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to verify doctor",
          error: error.message,
        });
      }
    });


    app.patch("/api/admin/doctors/:id/reject", async (req, res) => {
      try {
        const { id } = req.params;

        console.log("REJECT DOCTOR ID:", id);

        if (!id) {
          return res.status(400).json({
            success: false,
            message: "Doctor ID is required",
          });
        }

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid doctor ID",
          });
        }

        const objectId = new ObjectId(id);

        const doctor = await doctorsCollection.findOne({
          _id: objectId,
        });

        if (!doctor) {
          return res.status(404).json({
            success: false,
            message: "Doctor not found",
          });
        }

        if (doctor.verificationStatus === "verified") {
          return res.status(400).json({
            success: false,
            message:
              "A verified doctor cannot be rejected. Cancel verification first.",
          });
        }

        const result = await doctorsCollection.updateOne(
          {
            _id: objectId,
          },
          {
            $set: {
              verificationStatus: "rejected",
              updatedAt: new Date(),
            },
          },
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Doctor not found",
          });
        }

        const updatedDoctor = await doctorsCollection.findOne({
          _id: objectId,
        });

        return res.status(200).json({
          success: true,
          message: "Doctor verification rejected",
          data: updatedDoctor,
        });
      } catch (error) {
        console.error("Reject doctor error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to reject doctor",
          error: error.message,
        });
      }
    });

 
    app.patch(
      "/api/admin/doctors/:id/cancel-verification",
      async (req, res) => {
        try {
          const { id } = req.params;

          console.log("CANCEL VERIFICATION DOCTOR ID:", id);

          if (!id) {
            return res.status(400).json({
              success: false,
              message: "Doctor ID is required",
            });
          }

          if (!ObjectId.isValid(id)) {
            return res.status(400).json({
              success: false,
              message: "Invalid doctor ID",
            });
          }

          const objectId = new ObjectId(id);

          const doctor = await doctorsCollection.findOne({
            _id: objectId,
          });

          if (!doctor) {
            return res.status(404).json({
              success: false,
              message: "Doctor not found",
            });
          }

          if (doctor.verificationStatus !== "verified") {
            return res.status(400).json({
              success: false,
              message:
                "Only verified doctors can have their verification cancelled",
            });
          }

          const result = await doctorsCollection.updateOne(
            {
              _id: objectId,
            },
            {
              $set: {
                verificationStatus: "cancelled",
                updatedAt: new Date(),
              },
            },
          );

          if (result.matchedCount === 0) {
            return res.status(404).json({
              success: false,
              message: "Doctor not found",
            });
          }

          const updatedDoctor = await doctorsCollection.findOne({
            _id: objectId,
          });

          return res.status(200).json({
            success: true,
            message: "Doctor verification cancelled",
            data: updatedDoctor,
          });
        } catch (error) {
          console.error("Cancel doctor verification error:", error);

          return res.status(500).json({
            success: false,
            message: "Failed to cancel doctor verification",
            error: error.message,
          });
        }
      },
    );

    app.get("/api/admin/appointments",async (req, res) => {
      try {
        const {
          search = "",
          appointmentStatus = "",
          paymentStatus = "",
          limit = 100,
          offset = 0,
        } = req.query;

        const query = {};

        const cleanSearch = String(search).trim();

        if (cleanSearch) {
          query.$or = [
            {
              doctorName: {
                $regex: cleanSearch,
                $options: "i",
              },
            },
            {
              specialization: {
                $regex: cleanSearch,
                $options: "i",
              },
            },
            {
              hospitalName: {
                $regex: cleanSearch,
                $options: "i",
              },
            },
            {
              symptoms: {
                $regex: cleanSearch,
                $options: "i",
              },
            },
          ];
        }

        if (appointmentStatus) {
          query.appointmentStatus = String(appointmentStatus);
        }

        if (paymentStatus) {
          query.paymentStatus = String(paymentStatus);
        }

        const appointments = await appointmentsCollection
          .find(query)
          .sort({
            createdAt: -1,
          })
          .skip(Number(offset))
          .limit(Number(limit))
          .toArray();

        const total = await appointmentsCollection.countDocuments(query);

        return res.status(200).json({
          success: true,
          data: appointments,
          total,
          limit: Number(limit),
          offset: Number(offset),
        });
      } catch (error) {
        console.error("Get admin appointments error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to load appointments",
          error: error.message,
        });
      }
    });

    
    app.get("/api/admin/payments", async (req, res) => {
      try {
        const {
          search = "",
          paymentStatus = "",
          limit = 100,
          offset = 0,
        } = req.query;

        const query = {};

        const cleanSearch = String(search).trim();

        
        if (cleanSearch) {
          query.$or = [
            {
              doctorName: {
                $regex: cleanSearch,
                $options: "i",
              },
            },
            {
              specialization: {
                $regex: cleanSearch,
                $options: "i",
              },
            },
            {
              hospitalName: {
                $regex: cleanSearch,
                $options: "i",
              },
            },
            {
              userId: {
                $regex: cleanSearch,
                $options: "i",
              },
            },
            {
              session_id: {
                $regex: cleanSearch,
                $options: "i",
              },
            },
          ];
        }

        
        if (paymentStatus) {
          query.paymentStatus = String(paymentStatus);
        }

       
        const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);

        const safeOffset = Math.max(Number(offset) || 0, 0);

       
        const payments = await paymentCollection
          .find(query)
          .sort({
            createdAt: -1,
          })
          .skip(safeOffset)
          .limit(safeLimit)
          .toArray();

        const total = await paymentCollection.countDocuments(query);

        
        const revenueResult = await paymentCollection
          .aggregate([
            {
              $match: {
                ...query,
                paymentStatus: "paid",
              },
            },
            {
              $group: {
                _id: null,
                totalRevenue: {
                  $sum: "$consultationFee",
                },
              },
            },
          ])
          .toArray();

        const totalRevenue = revenueResult[0]?.totalRevenue || 0;

        return res.status(200).json({
          success: true,
          data: payments,
          total,
          totalRevenue,
          limit: safeLimit,
          offset: safeOffset,
        });
      } catch (error) {
        console.error("Get admin payments error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to load payment records",
          error: error.message,
        });
      }
    });

    app.get("/api/admin/analytics", async (req, res) => {
      try {
        
        const totalPatients = await usersCollection.countDocuments({
          role: "patient",
        });

       
        const totalDoctors = await doctorsCollection.countDocuments();

        const totalAppointments = await appointmentsCollection.countDocuments();

        const ratingData = await reviewsCollection
          .aggregate([
            {
              $group: {
                _id: "$doctorId",

                averageRating: {
                  $avg: "$rating",
                },

                totalReviews: {
                  $sum: 1,
                },
              },
            },
          ])
          .toArray();

    
        const doctors = await doctorsCollection
          .find({})
          .project({
            doctorName: 1,
            specialization: 1,
            profileImage: 1,
            verificationStatus: 1,
            experience: 1,
          })
          .toArray();

        const ratingMap = new Map();

        ratingData.forEach((item) => {
          ratingMap.set(String(item._id), {
            averageRating: Number(item.averageRating || 0),
            totalReviews: Number(item.totalReviews || 0),
          });
        });

        const doctorPerformance = doctors
          .map((doctor) => {
            const rating = ratingMap.get(String(doctor._id));

            return {
              doctorId: String(doctor._id),

              doctorName: doctor.doctorName || "Unknown Doctor",

              specialization: doctor.specialization || "N/A",

              profileImage: doctor.profileImage || "",

              verificationStatus: doctor.verificationStatus || "pending",

              experience: Number(doctor.experience || 0),

              averageRating: Number(rating?.averageRating || 0),

              totalReviews: Number(rating?.totalReviews || 0),
            };
          })
          .sort((a, b) => b.averageRating - a.averageRating);

    
        const overallRating =
          ratingData.length > 0
            ? ratingData.reduce(
                (sum, item) => sum + Number(item.averageRating || 0),
                0,
              ) / ratingData.length
            : 0;

 
        return res.status(200).json({
          success: true,

          data: {
            totalPatients,
            totalDoctors,
            totalAppointments,

            overallRating: Number(overallRating.toFixed(2)),

            doctorPerformance,
          },
        });
      } catch (error) {
        console.error("Admin analytics error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to load analytics",
          error: error.message,
        });
      }
    });

    // await client.db("admin").command({
    //   ping: 1,
    // });

//     console.log(
//       "Pinged your deployment. You successfully connected to MongoDB!",
//     );
//   } catch (error) {
//     console.error("MongoDB connection error:", error);
//   }
// }

// run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
})

module.exports = app;