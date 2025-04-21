import mongoose from 'mongoose';

export function connectDB(uri) {
  mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then(() => {
      console.log('✅ MongoDB connected');
      console.log('🔌 Host:', mongoose.connection.host);
      console.log('📂 Database:', mongoose.connection.name);
    })
    .catch(err => console.error('❌ MongoDB connection error:', err));
}