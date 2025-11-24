import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 100000 },
  },
  { versionKey: false }
);

const Counter =
  mongoose.models.Counter || mongoose.model("Counter", counterSchema);

export default Counter;



