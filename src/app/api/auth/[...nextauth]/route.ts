import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Defina seu schema de usuário (ajuste conforme seu modelo real)
const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);

// Função para conectar ao MongoDB
async function connectMongo() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!);
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        await connectMongo();

        const user = await User.findOne({ email: credentials?.email });
        if (!user) return null;

        const isValid = await bcrypt.compare(credentials!.password, user.password);
        if (!isValid) return null;

        // Retorne apenas os dados necessários
        return { id: user._id.toString(), name: user.name, email: user.email };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 2 * 60 * 60, // 2 horas em segundos
  },
  pages: {
    signIn: "/auth/signin"
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };