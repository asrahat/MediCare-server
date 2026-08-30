const express = require("express");
const dotenv = require("dotenv");
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
} = require("mongodb");
const cors = require("cors");

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

async function run() {
  try {
    const db = client.db("mediCareDB");

 
    const doctorsCollection = db.collection("doctors");
    const paymentCollection = db.collection("payment");
    const appointmentsCollection =
      db.collection("appointments");

  
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
          query.specialization =
            req.query.specialization;
        }

      
        if (req.query.verificationStatus) {
          query.verificationStatus =
            req.query.verificationStatus;
        }

        if (req.query.experience) {
          query.experience = {
            $gte: Number(req.query.experience),
          };
        }

        if (
          req.query.minFee &&
          req.query.maxFee
        ) {
          query.consultationFee = {
            $gte: Number(req.query.minFee),
            $lte: Number(req.query.maxFee),
          };
        }

        if (req.query.page) {
          const page = parseInt(req.query.page);
          const perPage = parseInt(
            req.query.perPage || 12
          );

          const skipItems =
            (page - 1) * perPage;

          const total =
            await doctorsCollection.countDocuments(
              query
            );

          const doctors =
            await doctorsCollection
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

        const doctors =
          await doctorsCollection
            .find(query)
            .toArray();

        return res.status(200).json({
          success: true,
          data: doctors,
        });
      } catch (error) {
        console.error(
          "Get doctors error:",
          error
        );

        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

    app.get(
      "/api/doctors/:id",
      async (req, res) => {
        try {
          const { id } = req.params;

          if (!ObjectId.isValid(id)) {
            return res.status(400).json({
              success: false,
              message:
                "Invalid doctor ID",
            });
          }

          const doctor =
            await doctorsCollection.findOne({
              _id: new ObjectId(id),
            });

          if (!doctor) {
            return res.status(404).json({
              success: false,
              message:
                "Doctor not found",
            });
          }

          return res.status(200).json({
            success: true,
            data: doctor,
          });
        } catch (error) {
          console.error(
            "Get doctor error:",
            error
          );

          return res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      }
    );

    app.post("/payment", async (req, res) => {
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
          session_id,
          status,
        } = req.body;

        console.log(
          "======================================"
        );
        console.log(
          "Payment request:",
          req.body
        );
        console.log(
          "======================================"
        );

   
        if (!userId) {
          return res.status(400).json({
            success: false,
            message:
              "userId is required",
          });
        }

        if (!session_id) {
          return res.status(400).json({
            success: false,
            message:
              "session_id is required",
          });
        }

        if (!doctorId) {
          return res.status(400).json({
            success: false,
            message:
              "doctorId is required",
          });
        }

        if (!date) {
          return res.status(400).json({
            success: false,
            message:
              "Appointment date is required",
          });
        }

        if (!availableSlot) {
          return res.status(400).json({
            success: false,
            message:
              "Appointment slot is required",
          });
        }

        const existingPayment =
          await paymentCollection.findOne({
            session_id,
          });

        if (existingPayment) {
          return res.status(200).json({
            success: true,
            message:
              "Payment already exists",
            data: existingPayment,
          });
        }

 
        const newPayment = {
          userId: String(userId),

          doctorId: String(doctorId),

          doctorName:
            doctorName || "",

          specialization:
            specialization || "",

          hospitalName:
            hospitalName || "",

          date,

          availableSlot,

          symptoms:
            symptoms || "",

          consultationFee:
            Number(consultationFee || 0),

          session_id,

          paymentStatus:
            status || "paid",

          createdAt:
            new Date(),

          updatedAt:
            new Date(),
        };

        const paymentResult =
          await paymentCollection.insertOne(
            newPayment
          );

        const existingAppointment =
          await appointmentsCollection.findOne({
            session_id,
          });

        let appointmentData;

        if (existingAppointment) {
          appointmentData =
            existingAppointment;
        } else {
          const newAppointment = {
            userId: String(userId),

            doctorId: String(doctorId),

            doctorName:
              doctorName || "",

            specialization:
              specialization || "",

            hospitalName:
              hospitalName || "",

            date,

            availableSlot,

            symptoms:
              symptoms || "",

            consultationFee:
              Number(consultationFee || 0),

     
            paymentStatus:
              status || "paid",

            appointmentStatus:
              "confirmed",

            session_id,

            createdAt:
              new Date(),

            updatedAt:
              new Date(),
          };

          const appointmentResult =
            await appointmentsCollection.insertOne(
              newAppointment
            );

          appointmentData = {
            _id:
              appointmentResult.insertedId,
            ...newAppointment,
          };
        }

    
        return res.status(201).json({
          success: true,

          message:
            "Payment and appointment saved successfully",

          data: {
            payment: {
              _id:
                paymentResult.insertedId,
              ...newPayment,
            },

            appointment:
              appointmentData,
          },
        });
      } catch (error) {
        console.error(
          "Payment API Error:",
          error
        );

        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });


    app.get(
      "/payments/:userId",
      async (req, res) => {
        try {
          const { userId } =
            req.params;

          console.log(
            "Payment userId:",
            userId
          );

          if (!userId) {
            return res.status(400).json({
              success: false,
              message:
                "userId is required",
            });
          }

          const payments =
            await paymentCollection
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
          console.error(
            "Get payments error:",
            error
          );

          return res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      }
    );

    app.get(
      "/appointments/user/:userId",
      async (req, res) => {
        try {
          const { userId } =
            req.params;

          console.log(
            "======================================"
          );

          console.log(
            "Requested appointment userId:",
            userId
          );

          if (!userId) {
            return res.status(400).json({
              success: false,
              message:
                "userId is required",
            });
          }

          const appointments =
            await appointmentsCollection
              .find({
                userId: String(userId),
              })
              .sort({
                createdAt: -1,
              })
              .toArray();

          console.log(
            "Appointments found:",
            appointments.length
          );

          console.log(
            "Appointments:",
            appointments
          );

          console.log(
            "======================================"
          );

          return res.status(200).json({
            success: true,
            data: appointments,
          });
        } catch (error) {
          console.error(
            "Get appointments error:",
            error
          );

          return res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      }
    );

    app.get(
      "/appointments/:id",
      async (req, res) => {
        try {
          const { id } =
            req.params;

          if (!ObjectId.isValid(id)) {
            return res.status(400).json({
              success: false,
              message:
                "Invalid appointment ID",
            });
          }

          const appointment =
            await appointmentsCollection.findOne(
              {
                _id: new ObjectId(id),
              }
            );

          if (!appointment) {
            return res.status(404).json({
              success: false,
              message:
                "Appointment not found",
            });
          }

          return res.status(200).json({
            success: true,
            data: appointment,
          });
        } catch (error) {
          console.error(
            "Get appointment error:",
            error
          );

          return res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      }
    );

    app.post(
      "/appointments",
      async (req, res) => {
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

          console.log(
            "Create appointment request:",
            req.body
          );

          if (!userId) {
            return res.status(400).json({
              success: false,
              message:
                "userId is required",
            });
          }

          if (!doctorId) {
            return res.status(400).json({
              success: false,
              message:
                "doctorId is required",
            });
          }

          if (!date) {
            return res.status(400).json({
              success: false,
              message:
                "Appointment date is required",
            });
          }

          if (!availableSlot) {
            return res.status(400).json({
              success: false,
              message:
                "Appointment slot is required",
            });
          }

          if (session_id) {
            const existing =
              await appointmentsCollection.findOne(
                {
                  session_id,
                }
              );

            if (existing) {
              return res.status(200).json({
                success: true,
                message:
                  "Appointment already exists",
                data: existing,
              });
            }
          }

          const newAppointment = {
            userId: String(userId),

            doctorId: String(doctorId),

            doctorName:
              doctorName || "",

            specialization:
              specialization || "",

            hospitalName:
              hospitalName || "",

            date,

            availableSlot,

            symptoms:
              symptoms || "",

            consultationFee:
              Number(
                consultationFee || 0
              ),

            paymentStatus:
              paymentStatus || "unpaid",

            appointmentStatus:
              appointmentStatus ||
              "confirmed",

            session_id:
              session_id || null,

            createdAt:
              new Date(),

            updatedAt:
              new Date(),
          };

          const result =
            await appointmentsCollection.insertOne(
              newAppointment
            );

          return res.status(201).json({
            success: true,

            message:
              "Appointment created successfully",

            data: {
              _id:
                result.insertedId,

              ...newAppointment,
            },
          });
        } catch (error) {
          console.error(
            "Create appointment error:",
            error
          );

          return res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      }
    );

    app.patch(
      "/appointments/:id/reschedule",
      async (req, res) => {
        try {
          const { id } =
            req.params;

          const {
            date,
            availableSlot,
          } = req.body;

          console.log(
            "Reschedule request:",
            req.body
          );

          if (!ObjectId.isValid(id)) {
            return res.status(400).json({
              success: false,
              message:
                "Invalid appointment ID",
            });
          }

          if (!date) {
            return res.status(400).json({
              success: false,
              message:
                "New date is required",
            });
          }

          if (!availableSlot) {
            return res.status(400).json({
              success: false,
              message:
                "New time slot is required",
            });
          }

          const appointment =
            await appointmentsCollection.findOne(
              {
                _id: new ObjectId(id),
              }
            );

          if (!appointment) {
            return res.status(404).json({
              success: false,
              message:
                "Appointment not found",
            });
          }

          if (
            String(
              appointment.appointmentStatus
            ).toLowerCase() ===
            "cancelled"
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Cancelled appointment cannot be rescheduled",
            });
          }

       
          const result =
            await appointmentsCollection.updateOne(
              {
                _id: new ObjectId(id),
              },
              {
                $set: {
                  date,

                  availableSlot,

                  appointmentStatus:
                    "rescheduled",

                  updatedAt:
                    new Date(),
                },
              }
            );

          if (
            result.matchedCount ===
            0
          ) {
            return res.status(404).json({
              success: false,
              message:
                "Appointment not found",
            });
          }

          const updatedAppointment =
            await appointmentsCollection.findOne(
              {
                _id: new ObjectId(id),
              }
            );

          return res.status(200).json({
            success: true,

            message:
              "Appointment rescheduled successfully",

            data:
              updatedAppointment,
          });
        } catch (error) {
          console.error(
            "Reschedule appointment error:",
            error
          );

          return res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      }
    );

 
    app.patch(
      "/appointments/:id/cancel",
      async (req, res) => {
        try {
          const { id } =
            req.params;

          console.log(
            "Cancel appointment ID:",
            id
          );


          if (!ObjectId.isValid(id)) {
            return res.status(400).json({
              success: false,
              message:
                "Invalid appointment ID",
            });
          }

          const appointment =
            await appointmentsCollection.findOne(
              {
                _id: new ObjectId(id),
              }
            );

          if (!appointment) {
            return res.status(404).json({
              success: false,
              message:
                "Appointment not found",
            });
          }

          if (
            String(
              appointment.appointmentStatus
            ).toLowerCase() ===
              "cancelled" ||
            String(
              appointment.appointmentStatus
            ).toLowerCase() ===
              "canceled"
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Appointment is already cancelled",
            });
          }

          await appointmentsCollection.updateOne(
            {
              _id: new ObjectId(id),
            },
            {
              $set: {
                appointmentStatus:
                  "cancelled",

                updatedAt:
                  new Date(),
              },
            }
          );

          const updatedAppointment =
            await appointmentsCollection.findOne(
              {
                _id: new ObjectId(id),
              }
            );

          return res.status(200).json({
            success: true,

            message:
              "Appointment cancelled successfully",

            data:
              updatedAppointment,
          });
        } catch (error) {
          console.error(
            "Cancel appointment error:",
            error
          );

          return res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      }
    );

    await client.db("admin").command({
      ping: 1,
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (error) {
    console.error(
      "MongoDB connection error:",
      error
    );
  }
}

run().catch(console.dir);


app.listen(port, () => {
  console.log(
    `Example app listening on port ${port}`
  );
});