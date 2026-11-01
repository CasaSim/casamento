import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // se usar senha própria
  googleId?: string; // se usar Google Auth
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  sessionVersion?: number;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  googleId: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  sessionVersion: { type: Number, default: 0 },
});

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
