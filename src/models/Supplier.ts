import mongoose, { Schema, Document } from "mongoose";

export interface ISupplier extends Document {
  nome: string;
  contato: string;
  categoria?: string;
  email?: string;
  observacoes?: string;
}

const SupplierSchema: Schema = new Schema({
  nome: { type: String, required: true },
  contato: { type: String, required: true },
  categoria: { type: String },
  email: { type: String },
  observacoes: { type: String },
});

export default mongoose.models.Supplier || mongoose.model<ISupplier>("Supplier", SupplierSchema);