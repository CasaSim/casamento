import mongoose, { Schema, Document } from "mongoose";

export interface IExpense extends Document {
  categoria: string;
  valor: number;
  user: mongoose.Types.ObjectId;
  fornecedor?: mongoose.Types.ObjectId;
  data?: Date;
  descricao?: string;
}

const ExpenseSchema: Schema = new Schema({
  categoria: { type: String, required: true },
  valor: { type: Number, required: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  fornecedor: { type: Schema.Types.ObjectId, ref: "Supplier" },
  data: { type: Date },
  descricao: { type: String },
});

export default mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);