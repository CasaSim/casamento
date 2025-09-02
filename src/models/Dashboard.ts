import mongoose, { Schema, Document } from "mongoose";

export interface IDashboard extends Document {
  user: mongoose.Types.ObjectId;
  expenses: mongoose.Types.ObjectId[];
}

const DashboardSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  expenses: [{ type: Schema.Types.ObjectId, ref: "Expense" }],
});

export default mongoose.models.Dashboard || mongoose.model<IDashboard>("Dashboard", DashboardSchema);