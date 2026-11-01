import mongoose, { Schema, Document } from "mongoose";

export interface IExpense extends Document {
  categoria: string;
  valor: number;
  user: mongoose.Types.ObjectId;
  fornecedor?: mongoose.Types.ObjectId;
  data?: Date | null;
  descricao?: string;
  telefone: string;
  contato: string;
}

const ExpenseSchema: Schema = new Schema({
  categoria: { type: String, required: true },
  valor: { type: Number, required: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  fornecedor: { type: Schema.Types.ObjectId, ref: "Supplier" },
  data: { type: Date },
  descricao: { type: String, maxlength: 2000 },
  telefone: { type: String },
  contato: { type: String },
});

export default mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);
